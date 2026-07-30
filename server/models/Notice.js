const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["Academic", "Exam", "Event", "General", "Registration"],
    default: "General",
  },
  attachments: [
    {
      fileName: { type: String, default: "" },
      fileUrl: { type: String, required: true },
      fileType: { type: String, enum: ["pdf", "image", "file"], default: "file" },
    },
  ],
  pdfUrl: {
    type: String,
    default: "",
  },
  imageUrls: [
    {
      type: String,
    },
  ],
  isPinned: {
    type: Boolean,
    default: false,
  },
  isScheduled: {
    type: Boolean,
    default: false,
  },
  scheduledAt: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ["Draft", "Published", "Scheduled"],
    default: "Published",
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  authorName: {
    type: String,
    default: "Admin Registrar",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  targetAudience: {
    type: String,
    enum: ["Teachers", "Students", "All"],
    default: "All",
  },
  // For result deadlines set by admin
  deadlineDate: {
    type: Date,
    default: null,
  },
  resultDeadlineType: {
    type: String,
    enum: ["Midterm", "Final", null],
    default: null,
  },
});

noticeSchema.index({ isPinned: -1, createdAt: -1 });

module.exports = mongoose.model("Notice", noticeSchema);
