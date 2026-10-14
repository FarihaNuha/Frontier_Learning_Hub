const User = require("../models/User");
const { getFCMStatus, getUserTokens, sendPushNotification } = require("../services/fcmService");

const validToken = (value) => typeof value === "string" && value.length >= 20 && value.length <= 4096 && !/\s/.test(value);

exports.saveFcmToken = async (req, res) => {
  const { fcmToken } = req.body;
  if (!validToken(fcmToken)) return res.status(400).json({ error: "A valid device token is required." });
  try {
    // A shared phone must stop receiving alerts for its previous account.
    await User.updateMany({ _id: { $ne: req.user.uid } }, { $pull: { fcmTokens: fcmToken } });
    await User.updateMany({ fcmToken }, { $unset: { fcmToken: "" } });
    await User.updateOne({ _id: req.user.uid }, { $addToSet: { fcmTokens: fcmToken } });
    res.json({ success: true, push: getFCMStatus() });
  } catch (error) {
    res.status(500).json({ error: "Could not register this phone for notifications." });
  }
};

exports.removeFcmToken = async (req, res) => {
  const { fcmToken } = req.body;
  if (!validToken(fcmToken)) return res.status(400).json({ error: "A valid device token is required." });
  try {
    await User.updateOne({ _id: req.user.uid }, { $pull: { fcmTokens: fcmToken } });
    await User.updateOne({ _id: req.user.uid, fcmToken }, { $unset: { fcmToken: "" } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Could not disconnect this phone's notifications." });
  }
};

exports.getPushStatus = async (req, res) => res.json(getFCMStatus());

const lastTest = new Map();
exports.testPushNotification = async (req, res) => {
  const { fcmToken } = req.body;
  if (!validToken(fcmToken)) return res.status(400).json({ error: "Enable notifications on this phone first." });
  try {
    const user = await User.findById(req.user.uid).select("+fcmTokens +fcmToken");
    if (!getUserTokens(user).includes(fcmToken)) {
      return res.status(403).json({ error: "This phone is not registered to your account." });
    }
    const now = Date.now();
    for (const [id, timestamp] of lastTest) if (now - timestamp >= 30000) lastTest.delete(id);
    if (lastTest.has(req.user.uid)) return res.status(429).json({ error: "Wait 30 seconds before testing again." });
    lastTest.set(req.user.uid, now);
    const result = await sendPushNotification(fcmToken, {
      title: "UniCore notifications",
      body: "This phone can receive UniCore app notifications.",
      link: "/settings",
      data: { notificationId: `test:${now}`, type: "test", recipientId: req.user.uid },
      ttl: 60000,
    });
    if (!result.success) return res.status(503).json({ error: "App notifications could not be sent. Please contact the administrator.", code: result.code });
    res.json({ success: true, message: "Test sent. Check your phone's notification panel." });
  } catch (error) {
    res.status(500).json({ error: "Could not send the test notification." });
  }
};
