const { initializeApp, getApps, cert, applicationDefault } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

let firebaseApp;
let initializationError;

const initFCM = () => {
  if (firebaseApp) return true;
  try {
    firebaseApp = getApps().find((app) => app.name === "unicore-push");
    if (!firebaseApp) {
      let credential;
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        credential = applicationDefault();
      } else {
        initializationError = "missing_credentials";
        return false;
      }
      firebaseApp = initializeApp({ credential }, "unicore-push");
    }
    initializationError = null;
    return true;
  } catch (error) {
    initializationError = "invalid_credentials";
    console.error("[Push] Firebase initialization failed. Check the server credentials.");
    return false;
  }
};

const getFCMStatus = () => ({ configured: initFCM(), error: initializationError || null });

// A notification payload lets Android display alerts even when the WebView is asleep.
const sendPushNotification = async (token, { title, body, data = {}, link = "", ttl, native = false, control = false, urgent = false }) => {
  if (!token) return { success: false, code: "missing_device_token" };
  if (!initFCM()) {
    console.error(`[Push] Not sent: ${initializationError}. Configure Firebase on the backend.`);
    return { success: false, code: initializationError };
  }
  const stringData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value != null).map(([key, value]) => [key, String(value)]),
  );
  if (link) stringData.link = String(link);
  if (native) Object.assign(stringData, { nativeHandled: "true", title: title || "UniCore", body: body || "" });
  try {
    const messageId = await getMessaging(firebaseApp).send({
      token,
      ...(!native ? { notification: { title: title || "UniCore", body: body || "" } } : {}),
      data: stringData,
      android: {
        priority: control && !urgent ? "normal" : "high",
        ...(ttl != null ? { ttl } : {}),
        ...(!native ? { notification: {
          sound: "default",
          channelId: "unicore_messages_channel",
          icon: "ic_stat_unicore",
          color: "#2C4B66",
          priority: "high",
          ...(stringData.threadId || stringData.notificationId ? { tag: stringData.threadId || stringData.notificationId } : {}),
        } } : {}),
      },
    });
    // FCM acceptance is not a device delivery receipt.
    return { success: true, messageId };
  } catch (error) {
    const code = error.code || "delivery_failed";
    console.error(`[Push] FCM rejected the message: ${code}`);
    return { success: false, code };
  }
};

const getUserTokens = (user) => [...new Set([...(user?.fcmTokens || []), user?.fcmToken].filter(Boolean))];

const sendUserPushNotification = async (userId, payload) => {
  const User = require("../models/User");
  const user = await User.findById(userId).select("+fcmTokens +fcmToken +nativeNotificationTokens");
  const tokens = getUserTokens(user).filter(token => !payload.control || user.nativeNotificationTokens?.includes(token));
  const results = await Promise.all(tokens.map(async (token) => {
    const result = await sendPushNotification(token, {
      ...payload,
      native: user.nativeNotificationTokens?.includes(token),
      data: { ...payload.data, recipientId: String(userId) },
    });
    if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(result.code)) {
      await User.updateOne({ _id: userId }, { $pull: { fcmTokens: token } });
      await User.updateOne({ _id: userId, fcmToken: token }, { $unset: { fcmToken: "" } });
    }
    return result;
  }));
  return { deviceCount: tokens.length, acceptedCount: results.filter((result) => result.success).length };
};

if (!initFCM()) console.warn(`[Push] Disabled: ${initializationError}. Email delivery is independent.`);

module.exports = { initFCM, getFCMStatus, getUserTokens, sendPushNotification, sendUserPushNotification };
