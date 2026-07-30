const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  teacherId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  department: {
    type: String,
    required: true,
  },
  assignedLevelTerm: {
    type: String,
    default: "",
  },
  assignedSession: {
    type: String,
    default: "",
  },
  assignedCourses: [
    {
      courseCode: { type: String, default: "" },
      courseName: { type: String, default: "" },
      levelTerm: { type: String, default: "" },
      level: { type: String, default: "" },
      term: { type: String, default: "" },
      session: { type: String, default: "" },
      department: { type: String, default: "" },
    },
  ],
  adviserSession: {
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Teacher", teacherSchema);
