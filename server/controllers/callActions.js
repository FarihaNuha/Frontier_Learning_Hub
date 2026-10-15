const jwt = require("jsonwebtoken");
const calls = require("../services/callSessions");
const { endSession } = require("../socket");

// This short-lived capability can only decline this recipient's ringing call.
// Android can use it without loading the WebView or persisting a login token.
exports.declineCall = (req, res) => {
  let token;
  try { token = jwt.verify(req.body.actionToken, process.env.JWT_SECRET || "your_super_secret_key_change_this"); }
  catch { return res.status(401).json({ error: "Call action expired" }); }
  if (token.purpose !== "decline-call" || token.callId !== req.params.callId) return res.status(403).json({ error: "Invalid call action" });
  const call = calls.memberCall(token.uid, token.callId);
  if (call?.calleeId === token.uid && call.state === "ringing") endSession(call.callId, "Call declined");
  return res.json({ success: true });
};
