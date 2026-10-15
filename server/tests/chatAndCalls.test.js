const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const load = (file, dependencies) => {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    module, exports: module.exports, require: name => dependencies[name] ?? require(name),
    process: { env: {} }, console, setTimeout, clearTimeout,
  });
  return module.exports;
};
const response = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(value) { this.body = value; return this; } });
const actions = message => {
  const events = [], writes = [];
  const io = { to: room => ({ emit: (event, payload) => events.push({ room, event, payload }) }) };
  return { events, writes, controller: load("controllers/messageActions.js", {
    "../models/PrivateMessage": { findById: async () => message, updateOne: async (...args) => writes.push(args), updateMany: async (...args) => writes.push(args) },
    "../socket": { getIO: () => io },
  }) };
};
const msg = () => ({ _id: "m1", sender: "sender", receiver: "receiver", content: "hello", reactions: [], save: async () => {} });
test("only conversation participants can react, hide or delete a message", async () => {
  for (const method of ["toggleReaction", "deleteMessage", "editMessage"]) {
    const { controller, events, writes } = actions(msg()); const res = response();
    await controller[method]({ user: { uid: "outsider" }, params: { messageId: "m1" }, body: { emoji: "❤️", content: "edit" }, query: { scope: "me" } }, res);
    assert.equal(res.statusCode, 404); assert.equal(events.length, 0); assert.equal(writes.length, 0);
  }
});
test("reaction changes replace a user's prior emoji; selecting it again removes it", async () => {
  const message = msg(), { controller } = actions(message);
  const req = { user: { uid: "receiver" }, params: { messageId: "m1" }, body: { emoji: "❤️" } };
  await controller.toggleReaction(req, response()); assert.equal(message.reactions.length, 1);
  req.body.emoji = "👍"; await controller.toggleReaction(req, response());
  assert.equal(message.reactions.length, 1); assert.equal(message.reactions[0].emoji, "👍");
  await controller.toggleReaction(req, response()); assert.equal(message.reactions.length, 0);
});
test("delete for me only hides the requesting participant's copy", async () => {
  const message = msg(), { controller, events, writes } = actions(message);
  await controller.deleteMessage({ user: { uid: "receiver" }, params: { messageId: "m1" }, query: { scope: "me" } }, response());
  assert.equal(writes[0][1].$addToSet.deletedFor, "receiver");
  assert.equal(message.content, "hello"); assert.equal(events.length, 1); assert.equal(events[0].room, "user_receiver");
});
test("delete for everyone requires the sender and retracts content and attachments", async () => {
  const message = msg(), { controller, events } = actions(message);
  const req = { user: { uid: "receiver" }, params: { messageId: "m1" }, query: { scope: "everyone" } }; let res = response();
  await controller.deleteMessage(req, res); assert.equal(res.statusCode, 403);
  req.user.uid = "sender"; res = response(); await controller.deleteMessage(req, res);
  assert.equal(res.statusCode, 200); assert.equal(message.content, ""); assert.equal(message.attachments.length, 0); assert.ok(message.deletedAt);
  assert.equal(events.length, 2);
});
test("sender edits sync to both participants; deleted messages cannot be edited", async () => {
  const message = msg(), { controller, events } = actions(message);
  const req = { user: { uid: "sender" }, params: { messageId: "m1" }, body: { content: "Changed" } };
  await controller.editMessage(req, response()); assert.equal(message.content, "Changed"); assert.equal(events.length, 2);
  message.deletedAt = new Date(); const res = response(); await controller.editMessage(req, res); assert.equal(res.statusCode, 400);
});
test("call sessions reject busy participants, isolate outsiders and release both users on end", () => {
  const calls = load("services/callSessions.js", {});
  const first = calls.createCall({ callerId: "a", calleeId: "b", offer: {}, callType: "audio" });
  assert.ok(first.callId); assert.equal(calls.currentCall("b"), first);
  assert.equal(calls.memberCall("outsider", first.callId), null);
  assert.equal(calls.createCall({ callerId: "c", calleeId: "b" }), null);
  assert.equal(calls.createCall({ callerId: "a", calleeId: "d" }), null);
  calls.endCall(first.callId); assert.equal(calls.currentCall("a"), undefined); assert.equal(calls.currentCall("b"), undefined);
  assert.ok(calls.createCall({ callerId: "a", calleeId: "b" }));
});

test("signaling authenticates socket identity and rejects answers/ICE from outsiders", async () => {
  const events = []; let connect, authorize;
  const calls = load("services/callSessions.js", {});
  class Server {
    constructor() { this.sockets = { adapter: { rooms: new Map() } }; }
    use(fn) { authorize = fn; }
    on(name, fn) { if (name === "connection") connect = fn; }
    to(room) { this.room = room; return this; }
    emit(event, data) { events.push({ event, data }); }
  }
  const signaling = load("socket.js", {
    "socket.io": { Server }, "./services/callSessions": calls,
    "./models/User": { findById: async id => ({ _id: id, role: "student", name: id }) },
    "./models/ContactRequest": {}, "./services/callNotifications": { sendIncomingCallPush: async () => {}, sendCallDismissPush: async () => {} },
    jsonwebtoken: { verify: token => { if (!token.startsWith("signed:")) throw new Error(); return { uid: token.slice(7) }; } },
  });
  signaling.initSocket({});
  const make = (uid, token = `signed:${uid}`) => {
    const handlers = {}, socket = { data: {}, handshake: { auth: { token }, query: { userId: "forged-user" } },
      join: room => { socket.room = room; }, on: (name, fn) => { handlers[name] = fn; }, emit() {}, to() { return this; } };
    let error; authorize(socket, value => { error = value; });
    if (!error) connect(socket);
    return { socket, handlers, error };
  };
  assert.ok(make("x", "bad-token").error);
  const caller = make("a"), receiver = make("b"), stranger = make("c");
  assert.equal(caller.socket.room, "user_a");
  let accepted;
  await caller.handlers["call-user"]({ to: "b", offer: { type: "offer", sdp: "offer" }, callType: "video" }, result => { accepted = result; });
  assert.ok(accepted.callId);
  const count = events.length;
  stranger.handlers["ice-candidate"]({ callId: accepted.callId, candidate: { candidate: "candidate:forged" } });
  let answerResult;
  stranger.handlers["answer-call"]({ callId: accepted.callId, answer: { type: "answer", sdp: "sdp" } }, result => { answerResult = result; });
  assert.ok(answerResult.error); assert.equal(events.length, count);
  receiver.handlers["answer-call"]({ callId: accepted.callId, answer: { type: "answer", sdp: "sdp" } }, result => { answerResult = result; });
  assert.equal(answerResult.success, true);
  caller.handlers["end-call"]({ callId: accepted.callId });
  assert.equal(calls.currentCall("b"), undefined);
});

const sendFixture = ({ source, existing } = {}) => {
  let saved; const notifications = [];
  const io = { to() { return this; }, emit() {} };
  const controller = load("controllers/communityController.js", {
    "../models/CommunityPost": {}, "../models/CommunityComment": {}, "../models/Course": {}, "../models/ContactRequest": {},
    "../models/User": { findById: async id => ({ _id: id, name: id, role: "student" }) },
    "../models/PrivateMessage": {
      findOne: async () => existing,
      findById: () => source ? Object.assign(source, { populate: async () => source }) : { populate: async () => null },
      create: async value => { saved = { ...value, _id: "new-message", createdAt: new Date(), populate: async () => {} }; return saved; },
    },
    "../models/Notification": { create: async data => { notifications.push(data); return { _id: "notification-1" }; } },
    "../socket": { getIO: () => io },
    "../services/emailService": { sendEmail() {}, emailTemplates: {}, queueEmail() {} },
  });
  return { send: controller.sendMessage, notifications, saved: () => saved };
};
test("replies retain a quote from the same conversation and include grouping metadata", async () => {
  const fixture = sendFixture({ source: { _id: "original", sender: { _id: "b", name: "Friend" }, receiver: "a", content: "Question" } });
  const res = response();
  await fixture.send({ user: { uid: "a" }, body: { receiverId: "b", content: "Answer", replyTo: "original" } }, res);
  assert.equal(res.statusCode, 201); assert.equal(fixture.saved().replyTo, "original");
  assert.equal(fixture.saved().replyPreview.content, "Question");
  assert.equal(fixture.notifications[0].pushData.threadId, "a");
  assert.equal(fixture.notifications[0].pushData.messageId, "new-message");
});
test("reply cannot quote another person's conversation", async () => {
  const fixture = sendFixture({ source: { sender: { _id: "c" }, receiver: "d", content: "Private" } });
  const res = response(); await fixture.send({ user: { uid: "a" }, body: { receiverId: "b", content: "reply", replyTo: "private" } }, res);
  assert.equal(res.statusCode, 400); assert.equal(fixture.saved(), undefined);
});
test("forward copies only an accessible original's content and attachments", async () => {
  const fixture = sendFixture({ source: { sender: "a", receiver: "c", content: "Original", attachments: [{ fileName: "file.pdf", fileUrl: "/uploads/file.pdf" }] } });
  const res = response(); await fixture.send({ user: { uid: "a" }, body: { receiverId: "b", forwardOf: "original", content: "forged override" } }, res);
  assert.equal(res.statusCode, 201); assert.equal(fixture.saved().content, "Original"); assert.equal(fixture.saved().forwarded, true);
  assert.equal(fixture.saved().attachments[0].fileUrl, "/uploads/file.pdf");
});
test("retrying a client message id returns the existing message without another alert", async () => {
  const fixture = sendFixture({ existing: { _id: "already-sent" } });
  const res = response(); await fixture.send({ user: { uid: "a" }, body: { receiverId: "b", content: "Hello", clientMessageId: "same-request" } }, res);
  assert.equal(res.body.message._id, "already-sent"); assert.equal(fixture.notifications.length, 0); assert.equal(fixture.saved(), undefined);
});

test("native decline capability is limited to the intended recipient and ringing session", () => {
  const ended = [], call = { callId: "c1", calleeId: "recipient", state: "ringing" };
  let capability;
  const actions = load("controllers/callActions.js", {
    jsonwebtoken: { verify: () => { if (!capability) throw new Error(); return capability; } },
    "../services/callSessions": { memberCall: (uid, id) => uid === "recipient" && id === "c1" ? call : null },
    "../socket": { endSession: id => ended.push(id) },
  });
  const req = { body: { actionToken: "capability" }, params: { callId: "c1" } };
  let res = response(); actions.declineCall(req, res); assert.equal(res.statusCode, 401);
  capability = { purpose: "other", callId: "c1", uid: "recipient" };
  res = response(); actions.declineCall(req, res); assert.equal(res.statusCode, 403);
  capability = { purpose: "decline-call", callId: "c1", uid: "outsider" };
  actions.declineCall(req, response()); assert.equal(ended.length, 0);
  capability.uid = "recipient"; actions.declineCall(req, response()); assert.equal(ended.length, 1);
  call.state = "active"; actions.declineCall(req, response()); assert.equal(ended.length, 1);
});
