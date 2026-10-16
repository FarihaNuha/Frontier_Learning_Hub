const jwt = require("jsonwebtoken");
const { sendUserPushNotification } = require("./fcmService");

// Legacy sockets identify themselves by a query string. Only an authenticated
// caller may trigger a device push; do not trust the query or callerName.
const sendIncomingCallPush = async ({ authToken, caller, callee, callType, callId, expiresAt = Date.now() + 45000 }) => {
  if (!authToken || !caller || !callee || caller.isBlocked || callee.isBlocked) return;
  let decoded;
  try {
    decoded = jwt.verify(authToken, process.env.JWT_SECRET || "your_super_secret_key_change_this");
  } catch {
    return;
  }
  if (String(decoded.uid) !== String(caller._id)) return;
  return sendUserPushNotification(callee._id, {
    title: `Incoming ${callType === "video" ? "video" : "audio"} call`,
    body: `${caller.name} is calling you`,
    data: { type: "incoming_call", notificationId: callId, callId, callerId: String(caller._id),
      callerName: caller.name, callType, expiresAt, serverTime: Date.now(),
      actionToken: jwt.sign({ purpose: "decline-call", callId, uid: String(callee._id) }, process.env.JWT_SECRET || "your_super_secret_key_change_this", { expiresIn: "60s" }) },
    link: `/community/messages/${caller._id}`,
    ttl: Math.max(0, expiresAt - Date.now()),
  });
};

const sendCallDismissPush = (call, reason) => sendUserPushNotification(call.calleeId, {
  control: true, urgent: true, ttl: 60000,
  data: { type: "call_ended", callId: call.callId, notificationId: `${call.callId}:ended`, reason },
});
module.exports = { sendIncomingCallPush, sendCallDismissPush };
