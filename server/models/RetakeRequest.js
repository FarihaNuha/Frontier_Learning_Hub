const mongoose = require("mongoose");

const retakeRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  studentId: {
    type: String,
    required: true,
    uppercase: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    default: "",
  },
  courseCode: {
    type: String,
    required: true,
    uppercase: true,
  },
  courseTitle: {
    type: String,
    required: true,
  },
  creditHours: {
    type: Number,
    default: 3,
  },
  previousGrade: {
    type: String,
    default: "F",
  },
  previousGradePoint: {
    type: Number,
    default: 0.0,
  },
  targetSession: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    default: "Level 1",
  },
  term: {
    type: String,
    default: "Term 1",
  },
  adviserEmail: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["Pending Adviser Approval", "Approved", "Rejected"],
    default: "Pending Adviser Approval",
  },
  comment: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("RetakeRequest", retakeRequestSchema);
