const mongoose = require("mongoose");
const { sendUserPushNotification } = require("../services/fcmService");

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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Send once on creation, not when an existing notification is edited.
notificationSchema.pre("save", function () {
  this.$locals.sendPush = this.isNew;
});

const dispatchPush = async (doc) => {
  try {
    if (!doc.userId) return;
    await sendUserPushNotification(doc.userId, {
      title: doc.title,
      body: doc.message,
      data: { ...doc.pushData, notificationId: String(doc._id), type: doc.type || "general" },
      link: doc.link || "/notifications",
    });
  } catch (error) {
    console.error("[Push] Notification dispatch failed:", error.message);
  }
};

notificationSchema.post("save", async function (doc) {
  if (this.$locals.sendPush) await dispatchPush(doc);
});

notificationSchema.post("insertMany", async function (docs) {
  if (!Array.isArray(docs)) return;
  for (const doc of docs) await dispatchPush(doc);
});

module.exports = mongoose.model("Notification", notificationSchema);
