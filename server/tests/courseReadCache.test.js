const test = require("node:test"), assert = require("node:assert/strict"), { EventEmitter } = require("node:events");
const { createCourseReadCache } = require("../services/courseReadCache");
const lookup = require("../services/approvedCourseLookup");
const res = () => Object.assign(new EventEmitter(), { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, json(data) { this.body = data; return this; } });
const req = id => ({ user: { uid: id, role: "student" }, originalUrl: "/api/courses/my", method: "GET" });
test("course cache coalesces heavy syncs, stays user-scoped and expires", async () => {
  let time = 0, calls = 0, release;
  const cache = createCourseReadCache({ now: () => time });
  const first = res(), duplicate = res();
  await cache.middleware(req("a"), first, () => { calls++; release = () => first.json({ courses: ["a"] }); });
  const waiting = cache.middleware(req("a"), duplicate, () => { throw Error("duplicate heavy sync"); });
  release(); await waiting;
  assert.equal(calls, 1); assert.deepEqual(duplicate.body, first.body);
  const other = res(); await cache.middleware(req("b"), other, () => { calls++; other.json({ courses: ["b"] }); });
  assert.deepEqual(other.body.courses, ["b"]);
  time = 21000; const expired = res(); await cache.middleware(req("a"), expired, () => { calls++; expired.json({ courses: ["new"] }); });
  assert.equal(calls, 3);
});
test("registration approval invalidates cached courses, FCM sync does not", async () => {
  const cache = createCourseReadCache(); let calls = 0;
  const read = async () => { const response = res(); await cache.middleware(req("a"), response, () => { calls++; response.json({}); }); };
  await read();
  const fcm = res(); cache.invalidateOnWrite({ method: "POST", originalUrl: "/api/auth/fcm-token" }, fcm, () => {}); fcm.emit("finish");
  await read(); assert.equal(calls, 1);
  const approval = res(); cache.invalidateOnWrite({ method: "POST", originalUrl: "/api/registration/approve" }, approval, () => {}); approval.emit("finish");
  await read(); assert.equal(calls, 2);
});
test("100 approved course lookups use two reads and preserve semester isolation", async () => {
  let queries = 0;
  const courses = Array.from({ length: 100 }, (_, i) => ({ _id: `c${i}`, displayCode: `ET ${i}`, session: "2026", students: ["me"] }));
  const reg = { session: "2026", level: "Level-1", term: "Term-1", selectedCourses: courses.map(course => ({ courseCode: course.displayCode, courseTitle: "Course" })) };
  const enrollments = courses.map(course => ({ student: "me", studentId: "001", course: course._id, courseCode: course.displayCode, courseTitle: "Course", session: "2026", level: "Level-1", term: "Term-1" }));
  const model = data => ({ find: () => { queries++; return { lean: async () => data }; } });
  const result = await lookup({ Course: model(courses), Enrollment: model(enrollments), approvedRegs: [reg], userId: "me", studentIdStr: "001" });
  for (const item of reg.selectedCourses) assert.ok(result.hasEnrollment(reg, item, result.courseFor(item.courseCode, "2026")));
  assert.equal(queries, 2); assert.equal(result.courseFor("ET 1", "2025"), undefined);
  assert.equal(result.hasEnrollment({ ...reg, term: "Term-2" }, reg.selectedCourses[0], courses[0]), false);
});
