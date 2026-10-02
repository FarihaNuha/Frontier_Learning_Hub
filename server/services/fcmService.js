let admin = null;
try {
  admin = require("firebase-admin");
} catch (e) {
  console.log("ℹ️ firebase-admin optional module not loaded yet.");
}

let fcmInitialized = false;

const initFCM = () => {
  if (fcmInitialized || !admin) return;

  try {
    const getCertFn = () => {
      try {
        const { cert } = require("firebase-admin/app");
        if (typeof cert === "function") return cert;
      } catch (e) {}
      if (typeof admin.cert === "function") return admin.cert;
      if (admin.credential && typeof admin.credential.cert === "function") return admin.credential.cert;
      return null;
    };

    const getAppDefaultFn = () => {
      try {
        const { applicationDefault } = require("firebase-admin/app");
        if (typeof applicationDefault === "function") return applicationDefault;
      } catch (e) {}
      if (typeof admin.applicationDefault === "function") return admin.applicationDefault;
      if (admin.credential && typeof admin.credential.applicationDefault === "function") return admin.credential.applicationDefault;
      return null;
    };

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === "string"
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : process.env.FIREBASE_SERVICE_ACCOUNT;
      const certFn = getCertFn();
      if (!certFn) throw new Error("Could not find cert() function in firebase-admin");
      admin.initializeApp({
        credential: certFn(serviceAccount),
      });
      fcmInitialized = true;
      console.log("✅ Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const appDefaultFn = getAppDefaultFn();
      if (!appDefaultFn) throw new Error("Could not find applicationDefault() function in firebase-admin");
      admin.initializeApp({
        credential: appDefaultFn(),
      });
      fcmInitialized = true;
      console.log("✅ Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS");
    } else {
      console.log("ℹ️ FCM: Firebase credentials not detected. FCM running in standby mode.");
    }
  } catch (error) {
    console.warn("⚠️ FCM initialization warning:", error.message);
  }
};

// Initialize on boot
initFCM();

/**
 * Send push notification to a device FCM token
 * @param {string} token - Target user device FCM token
 * @param {object} payload - { title, body, data, link }
 */
const sendPushNotification = async (token, { title, body, data = {}, link = "" }) => {
  if (!token) return;

  if (!fcmInitialized || !admin) {
    console.log(`📱 [FCM Standby] Push to ${token.substring(0, 12)}... | "${title}": "${body}"`);
    return { mock: true, success: true };
  }

  try {
    const stringData = {};
    for (const [key, value] of Object.entries(data || {})) {
      stringData[key] = String(value);
    }
    if (link) stringData.link = String(link);

    const message = {
      token,
      notification: {
        title: title || "UniCore Notification",
        body: body || "",
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "unicore_messages_channel",
          priority: "high",
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ FCM push delivered:", response);
    return response;
  } catch (error) {
    console.error("❌ FCM delivery error:", error.message);
    return null;
  }
};

module.exports = {
  initFCM,
  sendPushNotification,
};
