const mongoose = require("mongoose");

const academicProfileSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  studentId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  department: {
    type: String,
    default: "",
  },
  program: {
    type: String,
    default: "",
  },
  batch: {
    type: String,
    default: "",
  },
  session: {
    type: String,
    default: "",
  },
  currentLevel: {
    type: String,
    default: "Level 1",
  },
  currentTerm: {
    type: String,
    default: "Term 1",
  },
  totalCreditsRequired: {
    type: Number,
    default: 140,
  },
  totalCreditsEarned: {
    type: Number,
    default: 0,
  },
  creditsRemaining: {
    type: Number,
    default: 140,
  },
  currentCGPA: {
    type: Number,
    default: 0.0,
  },
  lastSemesterGPA: {
    type: Number,
    default: 0.0,
  },
  academicStatus: {
    type: String,
    enum: ["Regular", "Probation", "Retake", "Graduated"],
    default: "Regular",
  },
  completedCourses: [
    {
      courseCode: { type: String, required: true },
      courseTitle: { type: String, required: true },
      creditHours: { type: Number, default: 3 },
      letterGrade: { type: String, required: true },
      gradePoint: { type: Number, required: true },
      completedSession: { type: String, default: "" },
    },
  ],
  incompleteCourses: [
    {
      courseCode: { type: String, required: true },
      courseTitle: { type: String, required: true },
      creditHours: { type: Number, default: 3 },
    },
  ],
  retakeCourses: [
    {
      courseCode: { type: String, required: true },
      courseTitle: { type: String, required: true },
      previousGrade: { type: String, default: "F" },
      status: { type: String, default: "Pending" },
    },
  ],
  isGraduated: {
    type: Boolean,
    default: false,
  },
  graduationDate: {
    type: Date,
    default: null,
  },
  isRegistrationLocked: {
    type: Boolean,
    default: false,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AcademicProfile", academicProfileSchema);
