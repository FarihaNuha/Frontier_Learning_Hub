const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Assignment title is required"],
  },
  description: {
    type: String,
    default: "",
  },
  course: {
    type: String,
    default: "",
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    default: null,
  },
  department: {
    type: String,
    enum: ["EDTE", "IRE", "Software", "Cyber", "DataScience", "General"],
    required: true,
  },
  deadline: {
    type: Date,
    required: [true, "Deadline is required"],
  },
  totalMarks: {
    type: Number,
    default: 100,
  },
  submissionEnabled: {
    type: Boolean,
    default: true,
  },
  fileURL: {
    type: String,
    default: "",
  },
  fileName: {
    type: String,
    default: "",
  },
  fileType: {
    type: String,
    default: "",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Assignment", assignmentSchema);
