const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  uploadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ResultUpload",
    required: true,
  },
  resultType: {
    type: String,
    enum: ["Midterm", "Final"],
    default: "Final",
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  studentId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  studentName: {
    type: String,
    default: "",
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  teacherEmail: {
    type: String,
    required: true,
    lowercase: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    default: null,
  },
  courseCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  courseTitle: {
    type: String,
    required: true,
    trim: true,
  },
  courseType: {
    type: String,
    default: "Theory",
  },
  creditHours: {
    type: Number,
    default: 3,
  },
  department: {
    type: String,
    default: "",
  },
  program: {
    type: String,
    default: "",
  },
  session: {
    type: String,
    required: true,
    trim: true,
  },
  level: {
    type: String,
    required: true,
    trim: true,
  },
  term: {
    type: String,
    required: true,
    trim: true,
  },
  midPartA: {
    type: Number,
    default: null,
  },
  midPartB: {
    type: Number,
    default: null,
  },
  finalPartA: {
    type: Number,
    default: null,
  },
  finalPartB: {
    type: Number,
    default: null,
  },
  attendance: {
    type: Number,
    default: null,
  },
  continuousAssessment: {
    type: Number,
    default: null,
  },
  finalExam: {
    type: Number,
    default: null,
  },
  totalMarks: {
    type: Number,
    default: null,
  },
  letterGrade: {
    type: String,
    default: "",
    uppercase: true,
    trim: true,
  },
  gradePoint: {
    type: Number,
    default: null,
  },
  semesterGPA: {
    type: Number,
    default: null,
  },
  status: {
    type: String,
    enum: ["Draft", "Submitted", "Verified", "Published", "Correction Requested"],
    default: "Draft",
  },
  correctionComment: {
    type: String,
    default: "",
  },
  submittedAt: {
    type: Date,
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  publishedAt: {
    type: Date,
    default: null,
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

resultSchema.index({ studentId: 1, courseCode: 1, session: 1, level: 1, term: 1, resultType: 1 });

module.exports = mongoose.model("Result", resultSchema);
