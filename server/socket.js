const { Server } = require("socket.io");
const User = require("./models/User");
const ContactRequest = require("./models/ContactRequest");

let io;
const onlineUsers = new Set();

const initSocket = (server) => {
  const allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];
  if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(",").forEach(url => allowedOrigins.push(url.trim()));
  }

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        try {
          const url = new URL(origin);
          if (url.hostname.endsWith(".vercel.app")) return callback(null, true);
        } catch (e) {}
        callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
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

    // Caller initiates a call
    socket.on("call-user", async ({ to, offer, callerName, callType }) => {
      try {
        const caller = await User.findById(userId);
        const callee = await User.findById(to);
        if (caller && callee && caller.role === "student" && callee.role === "teacher") {
          const now = new Date();
          const activeRequest = await ContactRequest.findOne({
            student: userId,
            teacher: to,
            status: "accepted",
            scheduleStart: { $lte: now },
            scheduleEnd: { $gte: now }
          });
          if (!activeRequest) {
            socket.emit("call-error", { error: "You cannot call this teacher outside of your scheduled contact hours. Please send a contact request or wait for your approved slot." });
            return;
          }
        }
        io.to(`user_${to}`).emit("incoming-call", {
          from: userId,
          callerName,
          callType: callType || "video",
          offer
        });
      } catch (err) {
        console.error("Socket call-user error:", err);
        socket.emit("call-error", { error: "Failed to process call." });
      }
    });

    // Receiver answers the call
    socket.on("answer-call", ({ to, answer }) => {
      io.to(`user_${to}`).emit("call-answered", { answer });
    });

    // ICE candidate relay
    socket.on("ice-candidate", ({ to, candidate }) => {
      io.to(`user_${to}`).emit("ice-candidate", { candidate });
    });

    // End call from either side
    socket.on("end-call", ({ to }) => {
      io.to(`user_${to}`).emit("call-ended");
    });

    // ===== Disconnect =====
    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(userId);
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

module.exports = { initSocket, getIO };
