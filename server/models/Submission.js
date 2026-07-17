const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Assignment",
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fileURL: {
    type: String,
    default: "",
  },
  originalName: {
    type: String,
    default: "",
  },
  files: [
    {
      fileURL: { type: String, required: true },
      originalName: { type: String, required: true }
    }
  ],
  comment: {
    type: String,
    default: "",
  },
  isLate: {
    type: Boolean,
    default: false,
  },
  marks: {
    type: Number,
    default: null,
  },
  feedback: {
    type: String,
    default: "",
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  similarityPercent: {
    type: Number,
    default: 0,
  },
  similarityMatchedStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  similarityMatchedSubmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Submission",
    default: null,
  },
  similarityMatches: [
    {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      submissionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Submission",
        required: true
      },
      similarityPercent: {
        type: Number,
        required: true
      }
    }
  ]
});

module.exports = mongoose.model("Submission", submissionSchema);
