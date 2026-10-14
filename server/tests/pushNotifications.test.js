const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Run production modules with isolated credentials, database and delivery adapters.
// These tests never connect to Firebase/MongoDB or send real notifications.
const load = (file, dependencies, env = {}) => {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    module, exports: module.exports, process: { env },
    console: { log() {}, warn() {}, error() {} },
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return module.exports;
};
const plain = (value) => JSON.parse(JSON.stringify(value));

const service = ({ env = {}, send = async () => "message-id", user = {}, updates = [] } = {}) => load("services/fcmService.js", {
  "firebase-admin/app": {
    getApps: () => [], cert: (value) => value, applicationDefault: () => ({}), initializeApp: () => ({}),
  },
  "firebase-admin/messaging": { getMessaging: () => ({ send }) },
  "../models/User": {
    findById: () => ({ select: async () => user }),
    updateOne: async (...args) => updates.push(plain(args)),
  },
}, env);

test("missing/invalid server credentials cannot report successful push delivery", async () => {
  for (const env of [{}, { FIREBASE_SERVICE_ACCOUNT: "invalid-json" }]) {
    let sent = false;
    const fcm = service({ env, send: async () => { sent = true; } });
    assert.equal(fcm.getFCMStatus().configured, false);
    const result = await fcm.sendPushNotification("device-token", { title: "Lecture" });
    assert.equal(result.success, false);
    assert.equal(sent, false);
  }
});

test("background pushes carry a visible notification, sound, high priority, and a stable event id", async () => {
  let message;
  const fcm = service({ env: { FIREBASE_SERVICE_ACCOUNT: "{}" }, send: async (value) => { message = value; return "accepted-id"; } });
  const result = await fcm.sendPushNotification("device-token", {
    title: "Exam tomorrow", body: "Review chapter 1", link: "/student/exams/abc",
    data: { notificationId: 42, type: "exam_reminder" }, ttl: 30000,
  });
  assert.equal(result.success, true);
  assert.equal(message.notification.title, "Exam tomorrow");
  assert.equal(message.android.priority, "high");
  assert.equal(message.android.notification.channelId, "unicore_messages_channel");
  assert.equal(message.android.notification.sound, "default");
  assert.equal(message.data.notificationId, "42");
  assert.equal(message.data.link, "/student/exams/abc");
  assert.equal(message.android.ttl, 30000);
});

test("every unique registered device receives a push; expired tokens are removed", async () => {
  const sent = [], updates = [];
  const fcm = service({ env: { FIREBASE_SERVICE_ACCOUNT: "{}" }, user: { fcmToken: "old", fcmTokens: ["old", "current"] }, updates,
    send: async ({ token }) => {
      sent.push(token);
      if (token === "old") throw Object.assign(new Error(), { code: "messaging/registration-token-not-registered" });
      return "accepted";
    },
  });
  const result = await fcm.sendUserPushNotification("user-A", { title: "Post" });
  assert.deepEqual(sent.sort(), ["current", "old"]);
  assert.equal(result.acceptedCount, 1);
  assert.deepEqual(updates, [
    [{ _id: "user-A" }, { $pull: { fcmTokens: "old" } }],
    [{ _id: "user-A", fcmToken: "old" }, { $unset: { fcmToken: "" } }],
  ]);
});

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } });
const controller = (User, send = async () => ({ success: true })) => load("controllers/pushController.js", {
  "../models/User": User,
  "../services/fcmService": { getFCMStatus: () => ({ configured: true }), getUserTokens: (user) => user.fcmTokens || [], sendPushNotification: send },
});

test("registering a shared phone removes its previous account binding without replacing other phones", async () => {
  const updates = [];
  const token = "phone-token-long-enough-for-registration";
  const push = controller({ updateMany: async (...args) => updates.push(plain(args)), updateOne: async (...args) => updates.push(plain(args)) });
  const res = response();
  await push.saveFcmToken({ user: { uid: "new-user" }, body: { fcmToken: token } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(updates, [
    [{ _id: { $ne: "new-user" } }, { $pull: { fcmTokens: token } }],
    [{ fcmToken: token }, { $unset: { fcmToken: "" } }],
    [{ _id: "new-user" }, { $addToSet: { fcmTokens: token } }],
  ]);
});

test("logout only removes the authenticated user's matching device", async () => {
  const updates = [];
  const push = controller({ updateOne: async (...args) => updates.push(plain(args)) });
  await push.removeFcmToken({ user: { uid: "user-A" }, body: { fcmToken: "phone-token-long-enough" } }, response());
  assert.equal(updates.length, 2);
  assert.ok(updates.every(([filter]) => filter._id === "user-A"));
  assert.equal(updates[0][1].$pull.fcmTokens, "phone-token-long-enough");
});

test("test-push endpoint rejects another user's phone", async () => {
  let sent = false;
  const push = controller({ findById: () => ({ select: async () => ({ fcmTokens: ["own-phone-token-long-enough"] }) }) }, async () => { sent = true; });
  const res = response();
  await push.testPushNotification({ user: { uid: "user-A" }, body: { fcmToken: "another-phone-token-long-enough" } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(sent, false);
});

test("test-push endpoint returns failure when Firebase cannot send", async () => {
  const token = "own-phone-token-long-enough";
  const push = controller({ findById: () => ({ select: async () => ({ fcmTokens: [token] }) }) }, async () => ({ success: false, code: "missing_credentials" }));
  const res = response();
  await push.testPushNotification({ user: { uid: "user-A" }, body: { fcmToken: token } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.data.code, "missing_credentials");
});

test("post, lecture, exam, message and bulk notifications share one creation-only dispatcher", async () => {
  const pre = {}, post = {}, delivered = [];
  class Schema { pre(event, fn) { pre[event] = fn; } post(event, fn) { post[event] = fn; } }
  Schema.Types = { ObjectId: String };
  load("models/Notification.js", {
    mongoose: { Schema, model: () => ({}) },
    "../services/fcmService": { sendUserPushNotification: async (...args) => delivered.push(plain(args)) },
  });
  for (const type of ["community_post", "lecture_upload", "exam_reminder", "chat_message"]) {
    const doc = { _id: `id-${type}`, userId: "recipient", title: type, message: "Body", type };
    const context = { isNew: true, $locals: {} };
    pre.save.call(context);
    await post.save.call(context, doc);
    context.isNew = false;
    pre.save.call(context);
    await post.save.call(context, doc);
  }
  assert.equal(delivered.length, 4);
  await post.insertMany([{ _id: "bulk-id", userId: "recipient", title: "Announcement", type: "general" }]);
  assert.equal(delivered.length, 5);
  assert.equal(delivered[0][1].data.notificationId, "id-community_post");
});

test("incoming call pushes require the real caller's authentication and expire quickly", async () => {
  const sent = [];
  const calls = load("services/callNotifications.js", {
    jsonwebtoken: { verify: (token) => { if (token !== "signed-session") throw new Error(); return { uid: "caller" }; } },
    "./fcmService": { sendUserPushNotification: async (...args) => sent.push(plain(args)) },
  });
  const args = { caller: { _id: "caller", name: "Caller" }, callee: { _id: "callee" }, callType: "audio", callId: "call-1" };
  await calls.sendIncomingCallPush(args);
  await calls.sendIncomingCallPush({ ...args, authToken: "forged" });
  assert.equal(sent.length, 0);
  await calls.sendIncomingCallPush({ ...args, authToken: "signed-session" });
  assert.equal(sent.length, 1);
  assert.equal(sent[0][1].ttl, 30000);
  assert.equal(sent[0][1].data.notificationId, "call-1");
});
