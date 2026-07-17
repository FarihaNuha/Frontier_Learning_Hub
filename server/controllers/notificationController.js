const Notification = require("../models/Notification");

// @desc    Get user notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.uid })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await Notification.findByIdAndUpdate(notificationId, { isRead: true });

    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Mark all as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.uid, isRead: false },
      { isRead: true },
    );

    res.json({ message: "All marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
