const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  answer: { type: mongoose.Schema.Types.Mixed },
  marksObtained: { type: Number, default: 0 },
  isCorrect: { type: Boolean, default: false },
  aiPercentage: { type: Number, default: 0 },
  feedback: { type: String, default: "" },
});

const examSubmissionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  answers: [answerSchema],
  totalMarksObtained: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  tabSwitches: { type: Number, default: 0 },
  securityViolations: { type: Number, default: 0 },
  cheatingDetected: { type: Boolean, default: false },
  reason: { type: String, default: "" },
  aiPercentage: { type: Number, default: 0 },
  graded: { type: Boolean, default: false },
  feedback: { type: String, default: "" },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ExamSubmission", examSubmissionSchema);
