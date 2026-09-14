const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const cors = require("cors");
const http = require("http");
const fs = require("fs");

// Ensure uploads folder exists in production/Render filesystem
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads directory at:", uploadsDir);
}

const connectDB = require("./config/db");
const { initSocket } = require("./socket");
const startScheduler = require("./scheduler/deadlineReminder");

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

const allowedOrigins = ["http://localhost:3000", "http://localhost:3001"];
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(",").forEach(url => allowedOrigins.push(url.trim()));
}

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.indexOf(origin) !== -1) return true;
  try {
    const url = new URL(origin);
    if (url.hostname.endsWith(".vercel.app")) return true;
  } catch (e) {}
  return false;
};

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Auto-restore missing files from DB helper
const restoreMissingFileFromDB = async (filename, targetFilePath) => {
  try {
    const Assignment = require("./models/Assignment");
    const Submission = require("./models/Submission");
    const Lecture = require("./models/Lecture");
    const CommunityPost = require("./models/CommunityPost");

    // 1. Check Assignment
    const assignmentDoc = await Assignment.findOne({
      $or: [
        { fileURL: { $regex: filename, $options: "i" } },
        { fileName: { $regex: filename, $options: "i" } }
      ]
    }).lean();

    if (assignmentDoc && assignmentDoc.fileData) {
      fs.writeFileSync(targetFilePath, Buffer.from(assignmentDoc.fileData, "base64"));
      return true;
    }

    // 2. Check Submission
    const subDoc = await Submission.findOne({
      $or: [
        { fileURL: { $regex: filename, $options: "i" } },
        { originalName: { $regex: filename, $options: "i" } },
        { "files.fileURL": { $regex: filename, $options: "i" } },
        { "files.originalName": { $regex: filename, $options: "i" } }
      ]
    }).lean();

    if (subDoc) {
      let b64 = subDoc.fileData || "";
      if (!b64 && subDoc.files && subDoc.files.length > 0) {
        const fMatch = subDoc.files.find(f => f.fileURL && f.fileURL.includes(filename));
        if (fMatch && fMatch.fileData) b64 = fMatch.fileData;
      }
      if (b64) {
        fs.writeFileSync(targetFilePath, Buffer.from(b64, "base64"));
        return true;
      }
    }

    // 3. Check Lecture
    const lecDoc = await Lecture.findOne({
      $or: [
        { fileURL: { $regex: filename, $options: "i" } },
        { originalName: { $regex: filename, $options: "i" } }
      ]
    }).lean();

    if (lecDoc && lecDoc.fileData) {
      fs.writeFileSync(targetFilePath, Buffer.from(lecDoc.fileData, "base64"));
      return true;
    }

    // 4. Check CommunityPost
    const commDoc = await CommunityPost.findOne({
      $or: [
        { fileUrl: { $regex: filename, $options: "i" } },
        { "attachments.fileUrl": { $regex: filename, $options: "i" } }
      ]
    }).lean();

    if (commDoc && commDoc.fileData) {
      fs.writeFileSync(targetFilePath, Buffer.from(commDoc.fileData, "base64"));
      return true;
    }
  } catch (err) {
    console.error("Auto restore file error:", err);
  }
  return false;
};

// Static files - uploads folder (with inline Content-Disposition for browser preview)
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), {
  setHeaders: (res, filePath) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    const ext = path.extname(filePath).toLowerCase();
    const inlineTypes = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".ogg", ".mp3", ".wav"];
    if (inlineTypes.includes(ext)) {
      res.setHeader("Content-Disposition", "inline");
    }
  }
}));

// Fallback for missing uploads: auto-restore from DB if file physical binary is absent on current device
app.use("/uploads", async (req, res, next) => {
  try {
    const filename = req.path.replace(/^\//, "");
    if (!filename) return next();

    const uploadsDir = path.join(__dirname, "../uploads");
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
      return next();
    }

    const restored = await restoreMissingFileFromDB(filename, filePath);
    if (restored && fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const inlineTypes = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".ogg", ".mp3", ".wav"];
      if (inlineTypes.includes(ext)) {
        res.setHeader("Content-Disposition", "inline");
      }
      return res.sendFile(filePath);
    }
  } catch (err) {
    console.error("Upload fallback restore error:", err);
  }
  next();
});

// ==================== API ROUTES ====================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/lectures", require("./routes/lectureRoutes"));
app.use("/api/assignments", require("./routes/assignmentRoutes"));
app.use("/api/exams", require("./routes/examRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/courses", require("./routes/courseRoutes"));
app.use("/api/community", require("./routes/communityRoutes"));
app.use("/api/assessments", require("./routes/assessmentRoutes"));
app.use("/api/ums/admin", require("./routes/umsAdminRoutes"));
app.use("/api/registration", require("./routes/registrationRoutes"));
app.use("/api/announcements", require("./routes/announcementRoutes"));
app.use("/api/results", require("./routes/resultRoutes"));
app.use("/api/academic", require("./routes/academicRoutes"));
app.use("/api/service", require("./routes/serviceRoutes"));
app.use("/api/registration-payments", require("./routes/registrationPaymentRoutes"));

// ==================== TEST ROUTES ====================
app.get("/api/test", (req, res) => {
  res.json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
    status: "active",
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "UniCore API is running...",
    version: "1.0.0",
  });
});

// ==================== ERROR HANDLER ====================
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start the reminder scheduler
startScheduler();

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 API test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🔌 Socket.IO ready`);
});

// Prevent unhandled promise rejections from crashing the server
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️  Unhandled Rejection at:", promise, "reason:", reason);
  // Do NOT exit the process — log and continue
});

process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught Exception:", err.message, err.stack);
  // Do NOT exit the process — log and continue
});
