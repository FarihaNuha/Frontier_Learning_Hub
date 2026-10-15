const test = require("node:test"), assert = require("node:assert/strict");
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const mongoose = require("mongoose");
const { createDispatcher } = require("../services/notificationDelivery");
const load = (file, deps) => {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    module, exports: module.exports, require: name => deps[name] ?? require(name), console,
  }); return module.exports;
};
const response = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } });
const id = n => String(n).padStart(24, "0");
const values = (row, parts) => !parts.length ? [row] : Array.isArray(row)
  ? row.flatMap(item => values(item, parts)) : values(row?.[parts[0]], parts.slice(1));
const match = (row, query) => Object.entries(query).every(([key, wanted]) => values(row, key.split(".")).some(value => {
  if (wanted instanceof RegExp || Object.prototype.toString.call(wanted) === "[object RegExp]") return wanted.test(String(value || ""));
  if (wanted && typeof wanted === "object" && "$in" in wanted) return wanted.$in.some(item => item?.test ? item.test(value) : String(value) === String(item));
  if (wanted && typeof wanted === "object" && "$ne" in wanted) return value !== wanted.$ne;
  return value === wanted;
}));
const query = rows => ({ select() { return this; }, limit(n) { rows = rows.slice(0, n); return this; }, async lean() { return rows; } });
const audienceFixture = () => {
  const course = { _id: id(90), displayCode: "SWE-111", department: "Software", session: "2026-27", students: [id(99)] };
  const catalog = [{ courseCode: "SWE 111", department: "Software", level: "Level 1", term: "Term 1" }];
  const registrations = [], enrollments = [], retakes = [], users = [];
  const calls = [];
  const model = (name, rows) => ({ find: filter => { calls.push({ name, filter }); return query(rows.filter(row => match(row, filter))); } });
  const Course = model("Course", [course]); Course.findById = key => ({ lean: async () => key === course._id ? course : null });
  const helper = load("utils/courseAudience.js", {
    mongoose, "../models/Course": Course, "../models/CourseImport": model("catalog", catalog),
    "../models/User": model("User", users), "../models/Registration": model("Registration", registrations),
    "../models/Enrollment": model("Enrollment", enrollments), "../models/RetakeRequest": model("Retake", retakes),
  });
  const add = (n, fields = {}) => {
    users.push({ _id: id(n), role: "student", department: "SWE", name: `Student ${n}`, isBlocked: false });
    registrations.push({ user: id(n), status: "Approved", department: "Software", session: "2026-27", level: "Level-1", term: "Term-1", selectedCourses: [{ courseCode: "SWE 111" }], ...fields });
  };
  return { course, catalog, registrations, enrollments, retakes, users, calls, add, run: () => helper.getEnrolledStudents(course._id, "FORGED", "Cyber") };
};
test("course audience excludes other levels, terms, sessions, departments and pending registrations", async () => {
  const f = audienceFixture(); f.add(1); f.add(2, { level: "2" }); f.add(3, { term: "2" });
  f.add(4, { session: "2025-26" }); f.add(5, { department: "Cyber" }); f.add(6, { status: "Pending Adviser Approval" });
  f.add(7, { selectedCourses: [{ courseCode: "SWE-1111" }] });
  f.add(8); f.users.find(u => u._id === id(8)).role = "teacher";
  f.add(9); f.users.find(u => u._id === id(9)).isBlocked = true;
  assert.deepEqual(Array.from(await f.run(), u => u._id), [id(1)]);
  assert.ok(f.calls.find(c => c.name === "Registration").filter.session);
});
test("matching enrollment and approved retake are deduplicated and remain cohort-scoped", async () => {
  const f = audienceFixture(); f.add(1);
  f.enrollments.push({ student: id(1), courseCode: "SWE-111", session: "2026-27", level: "1", term: "1" });
  f.users.push({ _id: id(2), role: "student", department: "SWE" });
  f.retakes.push({ student: id(2), courseCode: "SWE-111", status: "Approved", department: "Software", targetSession: "2026-27", level: "1", term: "1" });
  assert.deepEqual(Array.from(await f.run(), u => u._id), [id(1), id(2)]);
  f.retakes[0].targetSession = "2024-25";
  assert.deepEqual(Array.from(await f.run(), u => u._id), [id(1)]);
});
test("empty audience never broadens to department students or unverified course members", async () => {
  const f = audienceFixture(); f.users.push({ _id: id(99), role: "student", department: "SWE" });
  assert.equal((await f.run()).length, 0); assert.equal(f.calls.filter(c => c.name === "User").length, 0);
});
test("unknown and ambiguous course metadata fail closed before any student query", async () => {
  for (const mutate of [f => { f.catalog.length = 0; }, f => { f.catalog.push({ ...f.catalog[0], level: "2" }); }]) {
    const f = audienceFixture(); mutate(f);
    await assert.rejects(f.run(), error => error.status === 400); assert.equal(f.calls.filter(c => c.name === "User").length, 0);
  }
});
test("sessionless legacy course can only notify explicitly enrolled, cohort-verified students", async () => {
  const f = audienceFixture(); f.course.session = ""; f.course.students = [id(1)]; f.add(1); f.add(2);
  assert.deepEqual(Array.from(await f.run(), u => u._id), [id(1)]);
});
test("outbox bounds Firebase concurrency and releases HTTP-facing work before delivery completes", async () => {
  const jobs = Array.from({ length: 20 }, (_, n) => ({ _id: id(n), pushAttempts: 1 }));
  const releases = [], completed = [];
  const worker = createDispatcher({ claim: async () => jobs.shift(), concurrency: 4, schedule: () => {},
    deliver: () => new Promise(resolve => releases.push(resolve)), complete: async (...args) => completed.push(args) });
  await worker.drain(); assert.equal(releases.length, 4); assert.equal(completed.length, 0); assert.equal(jobs.length, 16);
  for (const release of releases) release({ deviceCount: 1, acceptedCount: 1 });
  await new Promise(setImmediate); assert.equal(completed.length, 4); assert.equal(completed[0][1].pushStatus, "delivered");
});
test("outbox retries failures with a persisted delay and stops after its retry budget", async () => {
  for (const attempts of [1, 5]) {
    let available = true, outcome;
    const worker = createDispatcher({ now: () => 1000, schedule: () => {}, claim: async () => available ? (available = false, { pushAttempts: attempts }) : null,
      deliver: async () => ({ deviceCount: 2, acceptedCount: 1 }), complete: async (_, value) => { outcome = value; } });
    await worker.drain(); await new Promise(setImmediate);
    assert.equal(outcome.pushStatus, attempts === 5 ? "failed" : "pending"); assert.ok(outcome.pushNextAttempt.getTime() > 1000);
  }
});

test("new notifications enter the outbox but hydrating older notifications never replays them", () => {
  const Notification = require("../models/Notification");
  const fresh = new Notification({ userId: id(1), title: "New", message: "Hello", type: "chat_message" });
  assert.equal(fresh.pushStatus, "pending"); assert.equal(fresh.pushPriority, 0);
  const old = Notification.hydrate({ _id: id(2), userId: id(1), title: "Old", message: "Hello", type: "chat_message" });
  assert.equal(old.pushStatus, undefined);
});
test("sidebar uses one aggregate query for 100 users, never per-user message queries", async () => {
  const users = Array.from({ length: 100 }, (_, n) => ({ _id: new mongoose.Types.ObjectId(id(n + 1)), name: `User ${n}`, role: "student", isRegistered: true }));
  let aggregations = 0;
  const controller = load("controllers/communityController.js", {
    "../models/CommunityPost": {}, "../models/CommunityComment": {}, "../models/Course": {}, "../models/ContactRequest": {}, "../models/Notification": {},
    "../services/emailService": {}, "../socket": {}, "../models/User": { find: () => query(users) },
    "../models/PrivateMessage": { aggregate: async pipeline => { aggregations++; assert.ok(pipeline[0].$match.deletedFor); return [{ _id: users[0]._id, unreadCount: 3, lastMessageContent: "hello", lastMessageTime: new Date() }]; },
      findOne: () => { throw new Error("N+1 query regression"); }, countDocuments: () => { throw new Error("N+1 query regression"); } },
  });
  const res = response(); await controller.getUsers({ user: { uid: id(999) }, query: {} }, res);
  assert.equal(res.statusCode, 200); assert.equal(aggregations, 1); assert.equal(res.body.users.length, 100);
  assert.equal(res.body.users[0].unreadCount, 3); assert.equal(res.body.users[0].lastMessageContent, "hello");
});

test("lightweight read endpoint scopes updates to displayed incoming IDs, not later unseen messages", async () => {
  const writes = [], events = [];
  const actions = load("controllers/messageActions.js", {
    "../models/PrivateMessage": { find: filter => { assert.equal(filter.receiver, id(1)); assert.equal(filter.sender, id(2)); assert.deepEqual(Array.from(filter._id.$in), [id(3)]); return query([{ _id: id(3), createdAt: new Date(1000) }]); },
      updateMany: async filter => { writes.push(filter); return { modifiedCount: 1 }; } },
    "../models/Notification": { updateMany: async filter => writes.push(filter) },
    "../socket": { getIO: () => ({ to: room => ({ emit: (name, payload) => events.push({ room, name, payload }) }) }) },
    "../services/fcmService": { sendUserPushNotification: async () => {} },
  });
  const res = response(); await actions.readMessages({ user: { uid: id(1) }, params: { userId: id(2) }, body: { messageIds: [id(3)] } }, res);
  assert.equal(res.body.readThrough, 1000); assert.equal(writes.length, 2);
  assert.deepEqual(Array.from(writes[1]["pushData.messageId"].$in), [id(3)]); assert.equal(events.length, 2);
  const invalid = response(); await actions.readMessages({ body: { messageIds: ["forged"] } }, invalid); assert.equal(invalid.statusCode, 400);
});

test("lecture, assignment and exam creation share the exact selected audience for push and email", async () => {
  for (const [file, method, modelName] of [["lectureController.js", "uploadLecture", "Lecture"], ["assignmentController.js", "createAssignment", "Assignment"], ["examController.js", "createExam", "Exam"]]) {
    const f = audienceFixture(); f.add(1); f.add(2, { term: "2" });
    f.users[0].email = "student@example.invalid"; let saved = 0; const pushed = [], emails = [];
    const dependencies = {
      "../models/Lecture": {}, "../models/Assignment": {}, "../models/Submission": {}, "../models/Exam": {}, "../models/ExamSubmission": {},
      "../models/User": {}, "../models/Course": {}, "../models/Notification": {}, "../socket": { getIO: () => null },
      "../services/previewService": {}, "../services/similarityService": {},
      "../services/emailService": { queueEmail: (...args) => emails.push(args), emailTemplates: {
        newLecture: () => ({}), newAssignment: () => ({}), newExam: () => ({}),
      } },
      "../utils/enrolledStudentsHelper": { getEnrolledStudents: f.run },
      "../utils/notifyStudents": { notifyStudents: async students => { pushed.push(...students.map(s => s._id)); } },
    };
    dependencies[`../models/${modelName}`] = { create: async data => { saved++; return { ...data, _id: id(80) }; } };
    const controller = load(`controllers/${file}`, dependencies);
    const req = { user: { uid: id(70) }, body: { title: "Slides or exam", course: f.course.displayCode, courseId: f.course._id, department: "Software",
      duration: 30, totalMarks: 10, scheduledAt: "2030-01-01", deadline: "2030-01-02", questions: [{ marks: 10 }] },
      file: { mimetype: "video/mp4", size: 100, filename: "test.mp4", originalname: "test.mp4" } };
    const res = response(); await controller[method](req, res); assert.equal(res.statusCode, 201);
    assert.equal(saved, 1); assert.deepEqual(pushed, [id(1)]); assert.equal(emails.length, 1);
    f.catalog.length = 0; const invalid = response(); await controller[method](req, invalid);
    assert.equal(invalid.statusCode, 400); assert.equal(saved, 1);
  }
});
