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
  pushData: { type: mongoose.Schema.Types.Mixed, select: false },
  isRead: {
    type: Boolean,
    default: false,
  },
  pushStatus: { type: String, enum: ["pending", "sending", "delivered", "failed"], default: function () { return this.isNew ? "pending" : undefined; }, select: false },
  pushNextAttempt: { type: Date, default: Date.now, select: false },
  pushAttempts: { type: Number, default: 0, select: false },
  pushPriority: { type: Number, default: function () { return this.type === "chat_message" ? 0 : 10; }, select: false },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Send once on creation, not when an existing notification is edited.
notificationSchema.pre("save", function () {
  this.$locals.sendPush = this.isNew;
});

notificationSchema.post("save", function () {
  if (this.$locals.sendPush) require("../services/notificationDelivery").wake();
});

notificationSchema.post("insertMany", function (docs) {
  if (!Array.isArray(docs)) return;
  require("../services/notificationDelivery").wake();
});

notificationSchema.index({ pushStatus: 1, pushPriority: 1, pushNextAttempt: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
