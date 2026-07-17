const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema({
  studentIdNumber: {
    type: String,
    required: [true, "Student ID Number is required"],
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  courseCode: {
    type: String,
    required: [true, "Course code is required"],
  },
  attendance: {
    type: Number,
    default: 0,
  },
  quiz: {
    type: Number,
    default: 0,
  },
  assignment: {
    type: Number,
    default: 0,
  },
  presentation: {
    type: Number,
    default: 0,
  },
  totalMarks: {
    type: Number,
    default: 0,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique index to prevent duplicate records for the same student in the same course
assessmentSchema.index({ studentIdNumber: 1, courseCode: 1 }, { unique: true });

module.exports = mongoose.model("Assessment", assessmentSchema);
