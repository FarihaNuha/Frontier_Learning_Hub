const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
    await mongoose.connect(mongoUri);
    console.log("Connected to database.");

    const Submission = require("../models/Submission");
    const User = require("../models/User");

    const users = await User.find({});
    console.log("\n=== USERS ===");
    users.forEach(u => {
      console.log(`User: ${u.name}, ID: ${u._id}`);
    });

    const subs = await Submission.find({}).populate("studentId").populate("similarityMatchedStudent");
    console.log("\n=== SUBMISSIONS ===");
    subs.forEach(s => {
      console.log({
        id: s._id,
        assignmentId: s.assignmentId,
        studentName: s.studentId?.name,
        studentId: s.studentId?._id,
        submittedAt: s.submittedAt,
        similarityPercent: s.similarityPercent,
        matchedStudentName: s.similarityMatchedStudent?.name,
        matchedStudentId: s.similarityMatchedStudent?._id,
        matchedSub: s.similarityMatchedSubmission,
        files: s.files.map(f => f.originalName)
      });
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
