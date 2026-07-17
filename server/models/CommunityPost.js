const mongoose = require("mongoose");

const communityPostSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    default: "Untitled",
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["general", "question", "announcement", "resource"],
    default: "general",
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    default: null,
  },
  attachments: [
    {
      fileName: String,
      fileUrl: String,
      fileType: String,
    },
  ],
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  dislikes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  sharedPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CommunityPost",
    default: null,
  },
  lecture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lecture",
    default: null,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  isLocked: {
    type: Boolean,
    default: false,
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

module.exports = mongoose.model("CommunityPost", communityPostSchema);
