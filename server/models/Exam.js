const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ["mcq", "short"], required: true },
  question: { type: String, required: true },
  marks: { type: Number, required: true, default: 1 },
  options: [String],
  correctAnswer: { type: mongoose.Schema.Types.Mixed },
});

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  course: { type: String, default: "" },
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
  duration: { type: Number, required: true, min: 1, max: 180 },
  questions: [questionSchema],
  totalMarks: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  scheduledAt: { type: Date, required: true },
  deadline: { type: Date, required: true },
  publishMode: { type: String, enum: ["auto", "manual"], default: "auto" },
  resultsPublished: { type: Boolean, default: false },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Exam", examSchema);
