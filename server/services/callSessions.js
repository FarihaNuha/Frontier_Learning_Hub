const { randomUUID } = require("crypto");
const sessions = new Map();
const active = new Map();

// Bounded call lifecycle shared by every socket belonging to each participant.
const createCall = ({ callerId, calleeId, offer, callType, callerName }) => {
  if (active.has(callerId) || active.has(calleeId)) return null;
  const call = { callId: randomUUID(), callerId, calleeId, offer, callType, callerName, state: "ringing", createdAt: Date.now(), candidates: [] };
  sessions.set(call.callId, call); active.set(callerId, call.callId); active.set(calleeId, call.callId);
  return call;
};
const currentCall = uid => sessions.get(active.get(uid));
const memberCall = (uid, id) => { const call = sessions.get(id); return call && [call.callerId, call.calleeId].includes(uid) ? call : null; };
const endCall = id => {
  const call = sessions.get(id);
  if (call) { sessions.delete(id); active.delete(call.callerId); active.delete(call.calleeId); }
  return call;
};
module.exports = { createCall, currentCall, memberCall, endCall };
