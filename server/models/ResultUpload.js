const mongoose = require("mongoose");

const resultUploadSchema = new mongoose.Schema({
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
  resultType: {
    type: String,
    enum: ["Midterm", "Final"],
    default: "Final",
  },
  department: {
    type: String,
    default: "",
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
  totalRecords: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Draft", "Submitted", "Verified", "Published", "Correction Requested", "Deleted"],
    default: "Draft",
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  correctionComment: {
    type: String,
    default: "",
  },
  deadline: {
    type: Date,
    default: null,
  },
  scheduledPublishDate: {
    type: Date,
    default: null,
  },
  correctionWindowEnd: {
    type: Date,
    default: null,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ResultUpload", resultUploadSchema);
