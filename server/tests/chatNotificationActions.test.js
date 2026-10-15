const test = require("node:test"), assert = require("node:assert/strict");
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const tokens = require("../services/chatNotificationActions");
const jwt = require("jsonwebtoken");
const response = () => ({ code: 200, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } });
const fixture = (overrides = {}) => {
  const message = { _id: "message", sender: "peer", receiver: "recipient", reactions: [], save: async () => {} };
  const user = { _id: "recipient", role: "student" };
  const sent = [], events = [], module = { exports: {} };
  const dependencies = {
    "../services/chatNotificationActions": tokens,
    "../models/PrivateMessage": { findById: async () => message },
    "../models/User": { findById: async () => user },
    "../socket": { getIO: () => ({ to: room => ({ emit: (name, data) => events.push({ room, name, data }) }) }) },
    "./communityController": { sendMessage: async (req, res) => { sent.push(req.body); res.json({ success: true }); } },
    ...overrides,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../controllers/chatNotificationActions.js"), "utf8"), {
    module, exports: module.exports, require: name => dependencies[name],
  });
  const req = { params: { messageId: "message" }, body: { actionToken: tokens.createActionToken("recipient", "peer", "message"),
    action: "reply", content: "hello", requestId: "01234567-abcd-0123-abcd-0123456789ab", receiverId: "attacker", replyTo: "other" } };
  return { message, user, sent, events, req, run: module.exports.performAction };
};
test("notification capability is audience-scoped and cannot supply a login uid", () => {
  const token = tokens.createActionToken("recipient", "peer", "message"), claims = tokens.verifyActionToken(token);
  assert.equal(claims.uid, undefined); assert.equal(claims.recipientId, "recipient");
  assert.equal(claims.aud, "unicore-notification-actions"); assert.equal(claims.exp - claims.iat, 7 * 86400);
  assert.throws(() => tokens.verifyActionToken(token.slice(0, -3) + "bad"));
  const key = process.env.JWT_SECRET || "your_super_secret_key_change_this";
  assert.throws(() => tokens.verifyActionToken(jwt.sign({ purpose: "notification-chat-action" }, key, { expiresIn: -1, audience: claims.aud })));
  assert.throws(() => tokens.verifyActionToken(jwt.sign({ uid: "recipient" }, key, { audience: "other" })));
});
test("invalid, wrong-purpose and wrong-message capabilities cannot perform actions", async () => {
  for (const change of [f => { f.req.body.actionToken = "bad"; }, f => { f.req.params.messageId = "other"; },
    f => { f.req.body.action = "delete"; }, f => { f.req.body.actionToken = jwt.sign({ uid: "recipient" }, process.env.JWT_SECRET || "your_super_secret_key_change_this"); }]) {
    const f = fixture(); change(f); const res = response(); await f.run(f.req, res);
    assert.ok([401, 403].includes(res.code)); assert.equal(f.sent.length, 0);
  }
});
test("reply ignores supplied destination and delegates existing chat validation with a stable retry id", async () => {
  const f = fixture(), res = response(); await f.run(f.req, res);
  assert.equal(res.code, 200); assert.equal(f.sent[0].receiverId, "peer"); assert.equal(f.sent[0].replyTo, "message");
  assert.equal(f.sent[0].clientMessageId, "notification:01234567-abcd-0123-abcd-0123456789ab");
});
test("blocked users, foreign conversations, hidden and deleted messages reject quick actions", async () => {
  for (const change of [f => { f.user.isBlocked = true; }, f => { f.message.receiver = "other"; },
    f => { f.message.sender = "other"; }, f => { f.message.deletedAt = new Date(); }, f => { f.message.deletedFor = ["recipient"]; }]) {
    const f = fixture(); change(f); const res = response(); await f.run(f.req, res);
    assert.ok([401, 404].includes(res.code)); assert.equal(f.sent.length, 0);
  }
});
test("empty, oversized or non-idempotent replies are rejected", async () => {
  for (const change of [f => { f.req.body.content = "  "; }, f => { f.req.body.content = "x".repeat(1001); },
    f => { f.req.body.requestId = "bad"; }]) {
    const f = fixture(); change(f); const res = response(); await f.run(f.req, res);
    assert.equal(res.code, 400); assert.equal(f.sent.length, 0);
  }
});
test("Like is idempotent and syncs to both conversation participants", async () => {
  const f = fixture(); f.req.body.action = "like";
  await f.run(f.req, response()); await f.run(f.req, response());
  assert.equal(f.message.reactions.length, 1); assert.equal(f.message.reactions[0].emoji, "👍");
  assert.equal(f.events.length, 4); assert.equal(f.events[0].room, "user_peer"); assert.equal(f.events[1].room, "user_recipient");
});
