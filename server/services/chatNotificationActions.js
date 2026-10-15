const jwt = require("jsonwebtoken");

const secret = () => process.env.JWT_SECRET || "your_super_secret_key_change_this";
// No `uid` claim: this capability must never work as an ordinary login token.
exports.createActionToken = (recipientId, peerId, messageId) => jwt.sign({
  purpose: "notification-chat-action", recipientId: String(recipientId),
  peerId: String(peerId), messageId: String(messageId),
}, secret(), { expiresIn: "7d", audience: "unicore-notification-actions" });
exports.verifyActionToken = token => jwt.verify(token, secret(), {
  algorithms: ["HS256"], audience: "unicore-notification-actions",
});
