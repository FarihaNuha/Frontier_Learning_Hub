// models/PrivateMessage.js
const mongoose = require("mongoose");

const privateMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    default: "",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrivateMessage",
    default: null,
  },
  attachments: [
    {
      fileName: String,
      fileUrl: String,
      fileType: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  reactions: [
    {
      emoji: { type: String, required: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
  ],
});

// Index for faster queries
privateMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
privateMessageSchema.index({ receiver: 1, isRead: 1 });

module.exports = mongoose.model("PrivateMessage", privateMessageSchema);
