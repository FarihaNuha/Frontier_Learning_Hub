const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Notice = require("../models/Notice");
const ResultUpload = require("../models/ResultUpload");
const Teacher = require("../models/Teacher");

async function test() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  console.log("=== TESTING TEACHER QUERY ===");
  const teacherUser = await User.findOne({ role: "teacher" });
  console.log("Teacher User:", teacherUser?.email, teacherUser?._id);

  if (teacherUser) {
    try {
      const teacherId = teacherUser._id;
      const uploads = await ResultUpload.find({ teacher: teacherId, resultType: "Midterm" }).lean();
      console.log("Uploads found:", uploads.length);
    } catch (err) {
      console.error("ResultUpload query error:", err);
    }

    try {
      const allDeadlines = await Notice.find({
        deadlineDate: { $ne: null },
        targetAudience: { $in: ["Teachers", "All"] },
      }).sort({ createdAt: -1 }).lean();
      console.log("All deadlines found:", allDeadlines.length);
    } catch (err) {
      console.error("Notice query error:", err);
    }
  }

  await mongoose.disconnect();
}

test().catch(console.error);
