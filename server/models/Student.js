const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  universityEmail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  department: {
    type: String,
    required: true,
  },
  program: {
    type: String,
    required: true,
  },
  batch: {
    type: String,
    required: true,
  },
  session: {
    type: String,
    required: true,
  },
  admissionSemester: {
    type: String,
    required: true,
  },
  currentLevel: {
    type: Number,
    required: true,
  },
  currentTerm: {
    type: Number,
    required: true,
  },
  accountStatus: {
    type: String,
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Student", studentSchema);
