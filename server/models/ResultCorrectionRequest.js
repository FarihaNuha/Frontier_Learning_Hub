const mongoose = require("mongoose");

const resultCorrectionRequestSchema = new mongoose.Schema(
  {
    uploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResultUpload",
    },
    resultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentId: {
      type: String,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    teacherEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    courseCode: {
      type: String,
      required: true,
    },
    courseTitle: {
      type: String,
      required: true,
    },
    studentMessage: {
      type: String,
      required: true,
    },
    teacherReply: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "Replied", "Resolved"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResultCorrectionRequest", resultCorrectionRequestSchema);
