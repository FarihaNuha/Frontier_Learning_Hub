const mongoose = require("mongoose");
const { sendPushNotification } = require("../services/fcmService");

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

// Auto-dispatch FCM Push Notification on single notification create
notificationSchema.post("save", async function (doc) {
  try {
    if (!doc.userId) return;
    const User = mongoose.model("User");
    const recipient = await User.findById(doc.userId).select("fcmToken name");
    if (recipient && recipient.fcmToken) {
      await sendPushNotification(recipient.fcmToken, {
        title: doc.title,
        body: doc.message,
        data: {
          notificationId: String(doc._id),
          type: String(doc.type || "general"),
          link: String(doc.link || ""),
        },
        link: doc.link || "",
      });
    }
  } catch (err) {
    console.error("FCM push notification dispatch error:", err.message);
  }
});

// Auto-dispatch FCM Push Notification on bulk insert (e.g. results/announcements)
notificationSchema.post("insertMany", async function (docs) {
  try {
    if (!Array.isArray(docs) || docs.length === 0) return;
    const User = mongoose.model("User");
    for (const doc of docs) {
      if (!doc.userId) continue;
      const recipient = await User.findById(doc.userId).select("fcmToken");
      if (recipient && recipient.fcmToken) {
        sendPushNotification(recipient.fcmToken, {
          title: doc.title,
          body: doc.message,
          data: {
            notificationId: String(doc._id),
            type: String(doc.type || "general"),
            link: String(doc.link || ""),
          },
          link: doc.link || "",
        }).catch((e) => console.error("FCM bulk push error:", e.message));
      }
    }
  } catch (err) {
    console.error("FCM insertMany push error:", err.message);
  }
});

module.exports = mongoose.model("Notification", notificationSchema);
