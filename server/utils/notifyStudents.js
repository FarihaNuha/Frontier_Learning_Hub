const Notification = require("../models/Notification");
const { getIO } = require("../socket");
// One database write for a class, with FCM delivery handled by the durable outbox.
exports.notifyStudents = async (students, payload) => {
  if (!students.length) return [];
  const notifications = await Notification.insertMany(students.map(student => ({ ...payload, userId: student._id })));
  const io = getIO();
  for (const notification of notifications) io?.to(`user_${notification.userId}`).emit("newNotification", {
    _id: notification._id, title: notification.title, message: notification.message,
    type: notification.type, link: notification.link,
  });
  return notifications;
};
