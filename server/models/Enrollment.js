const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  studentId: {
    type: String,
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CourseImport",
  },
  courseCode: {
    type: String,
    required: true,
  },
  courseTitle: {
    type: String,
    required: true,
  },
  session: {
    type: String,
    default: "",
  },
  level: {
    type: String,
    default: "",
  },
  term: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index: one enrollment record per (student + courseCode + session)
// This enforces session isolation — 2025-26 enrollment never overwrites 2024-25
enrollmentSchema.index({ student: 1, courseCode: 1, session: 1 }, { sparse: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
