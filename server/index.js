require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
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

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
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

// Static files - uploads folder (with inline Content-Disposition for browser preview)
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const inlineTypes = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".ogg", ".mp3", ".wav"];
    if (inlineTypes.includes(ext)) {
      res.setHeader("Content-Disposition", "inline");
    }
  }
}));

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
    message: "UFTB_Moodle API is running...",
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
