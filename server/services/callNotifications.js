const jwt = require("jsonwebtoken");
const { sendUserPushNotification } = require("./fcmService");

// Legacy sockets identify themselves by a query string. Only an authenticated
// caller may trigger a device push; do not trust the query or callerName.
const sendIncomingCallPush = async ({ authToken, caller, callee, callType, callId }) => {
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
    body: `${caller.name} is calling you. Open UniCore to view the conversation.`,
    data: { type: "incoming_call", notificationId: callId, callerId: String(caller._id) },
    link: `/community/messages/${caller._id}`,
    ttl: 30000,
  });
};

module.exports = { sendIncomingCallPush };
