const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "lecture_upload",
      "assignment_due",
      "exam_reminder",
      "submission_status",
      "marksheet_upload",
      "community_post",
      "chat_message",
      "general",
      "join_request",
      "join_approved",
      "join_rejected",
      "contact_request",
      "contact_request_response",
    ],
    required: true,
  },
  link: String,
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
