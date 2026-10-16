const { Server } = require("socket.io");
const User = require("./models/User");
const ContactRequest = require("./models/ContactRequest");
const jwt = require("jsonwebtoken");
const calls = require("./services/callSessions");
const { sendIncomingCallPush, sendCallDismissPush } = require("./services/callNotifications");

let io;
const onlineUsers = new Set();
const endSession = (callId, reason) => {
  const call = calls.endCall(callId);
  if (!call) return;
  clearTimeout(call.timer);
  io.to(`user_${call.callerId}`).to(`user_${call.calleeId}`).emit("call-ended", { callId, reason });
  sendCallDismissPush(call, reason).catch(error => console.error("[Push] Call dismissal failed:", error.message));
};

const initSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost",
    "https://localhost",
    "capacitor://localhost",
    "ionic://localhost",
  ];
  if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(",").forEach((url) => allowedOrigins.push(url.trim()));
  }

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        try {
          const url = new URL(origin);
          if (url.hostname.endsWith(".vercel.app")) return callback(null, true);
          if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return callback(null, true);
          if (url.protocol === "capacitor:" || url.protocol === "ionic:") return callback(null, true);
        } catch (e) {}
        callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    try {
      const decoded = jwt.verify(socket.handshake.auth?.token || "", process.env.JWT_SECRET || "your_super_secret_key_change_this");
      if (!decoded.uid) return next(new Error("Sign in again"));
      socket.data.userId = String(decoded.uid);
      next();
    } catch { next(new Error("Sign in again")); }
  });
  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const activeStatus = socket.handshake.query.activeStatus !== "false";

    if (userId) {
      socket.join(`user_${userId}`);
      if (activeStatus) {
        onlineUsers.add(userId);
      }
      console.log(`✅ User connected: ${userId} (activeStatus: ${activeStatus})`);
      io.emit("online_users", Array.from(onlineUsers));
    }

    socket.on("update_active_status", ({ activeStatus }) => {
      if (userId) {
        if (activeStatus) {
          onlineUsers.add(userId);
        } else {
          onlineUsers.delete(userId);
        }
        console.log(`ℹ️ User active status updated: ${userId} -> ${activeStatus}`);
        io.emit("online_users", Array.from(onlineUsers));
      }
    });

    // ===== WebRTC Signaling Relays =====

    const incoming = call => ({ from: call.callerId, callId: call.callId, callerName: call.callerName, callType: call.callType, offer: call.offer, expiresAt: call.createdAt + 45000, serverTime: Date.now(), ringForMs: Math.max(0, call.createdAt + 45000 - Date.now()) });
    socket.on("call-ready", () => {
      const call = calls.currentCall(userId);
      if (call?.state === "ringing" && call.calleeId === userId) {
        socket.emit("incoming-call", incoming(call));
        for (const item of call.candidates) if (item.from !== userId) socket.emit("ice-candidate", { callId: call.callId, candidate: item.candidate });
      } else if (call?.state === "active") {
        if (call.callerId === userId && call.answer) socket.emit("call-answered", { callId: call.callId, answer: call.answer });
        for (const item of call.candidates) if (item.from !== userId) socket.emit("ice-candidate", { callId: call.callId, candidate: item.candidate });
      }
    });
    socket.on("call-user", async ({ to, offer, callType }, ack = () => {}) => {
      try {
        const [caller, callee] = await Promise.all([User.findById(userId), User.findById(to)]);
        if (!caller || !callee || caller.isBlocked || callee.isBlocked || userId === String(to) || ["admin", "superadmin"].includes(callee.role)) return ack({ error: "This person cannot be called" });
        if (!offer || offer.type !== "offer" || typeof offer.sdp !== "string" || offer.sdp.length > 100000) return ack({ error: "Invalid call offer" });
        if (caller.role === "student" && callee.role === "teacher") {
          const now = new Date();
          if (!await ContactRequest.findOne({ student: userId, teacher: to, status: "accepted", scheduleStart: { $lte: now }, scheduleEnd: { $gte: now } })) return ack({ error: "Calls to this teacher require an approved contact time" });
        }
        const call = calls.createCall({ callerId: userId, calleeId: String(to), callerName: caller.name, callType: callType === "video" ? "video" : "audio", offer });
        if (!call) return ack({ error: "One of you is already in a call" });
        call.timer = setTimeout(() => { if (call.state === "ringing") endSession(call.callId, "No answer"); }, 45000);
        call.timer.unref?.();
        io.to(`user_${to}`).emit("incoming-call", incoming(call));
        ack({ callId: call.callId });
        sendIncomingCallPush({ authToken: socket.handshake.auth?.token, caller, callee, callType: call.callType, callId: call.callId, expiresAt: call.createdAt + 45000 })
          .catch(error => console.error("[Push] Call alert failed:", error.message));
      } catch { ack({ error: "Could not start the call" }); }
    });
    socket.on("answer-call", ({ callId, answer }, ack = () => {}) => {
      const call = calls.memberCall(userId, callId);
      if (!call || call.calleeId !== userId || call.state !== "ringing" || !answer || answer.type !== "answer" || typeof answer.sdp !== "string" || answer.sdp.length > 100000) return ack({ error: "Call is no longer available" });
      call.state = "active"; call.answer = answer; clearTimeout(call.timer);
      call.timer = setTimeout(() => endSession(callId, "Call duration limit reached"), 2 * 60 * 60 * 1000); call.timer.unref?.();
      io.to(`user_${call.callerId}`).emit("call-answered", { callId, answer });
      socket.to(`user_${userId}`).emit("call-ended", { callId, reason: "Answered on another device" });
      sendCallDismissPush(call, "answered").catch(error => console.error("[Push] Call dismissal failed:", error.message));
      ack({ success: true });
    });
    socket.on("ice-candidate", ({ callId, candidate }) => {
      const call = calls.memberCall(userId, callId);
      if (!call || !candidate || typeof candidate.candidate !== "string" || candidate.candidate.length > 4000) return;
      if (call.candidates.length < 200) call.candidates.push({ from: userId, candidate });
      const to = call.callerId === userId ? call.calleeId : call.callerId;
      io.to(`user_${to}`).emit("ice-candidate", { callId, candidate });
    });
    socket.on("end-call", ({ callId, reason }) => {
      if (calls.memberCall(userId, callId)) endSession(callId, reason === "declined" ? "Call declined" : "Call ended");
    });
    socket.on("screen-sharing", ({ callId, sharing }) => {
      const call = calls.memberCall(userId, callId);
      if (!call || call.state !== "active" || typeof sharing !== "boolean") return;
      const to = call.callerId === userId ? call.calleeId : call.callerId;
      io.to(`user_${to}`).emit("screen-sharing", { callId, sharing });
    });

    // ===== Disconnect =====
    socket.on("disconnect", () => {
      if (userId) {
        const remaining = io.sockets.adapter.rooms.get(`user_${userId}`);
        if (!remaining?.size) {
          onlineUsers.delete(userId);
          const call = calls.currentCall(userId);
          // Ringing has its own 45s expiry. Sleeping Android WebViews must not
          // cancel it before the push notification can wake the recipient.
          if (call?.state === "active") { const grace = setTimeout(() => { if (!io.sockets.adapter.rooms.get(`user_${userId}`)?.size) endSession(call.callId, "Connection lost"); }, 15000); grace.unref?.(); }
        }
        console.log(`❌ User disconnected: ${userId}`);
        io.emit("online_users", Array.from(onlineUsers));
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

module.exports = { initSocket, getIO, endSession };
