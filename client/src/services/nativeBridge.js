import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { PushNotifications } from "@capacitor/push-notifications";
import api from "./api";

/**
 * Check if running in a native Capacitor environment (with deferred bridge detection)
 */
export const isNativePlatform = () => {
  if (typeof window !== "undefined" && window.Capacitor) {
    if (typeof window.Capacitor.isNativePlatform === "function") {
      return window.Capacitor.isNativePlatform();
    }
    return window.Capacitor.platform === "android" || window.Capacitor.platform === "ios";
  }
  return Capacitor.isNativePlatform();
};

/**
 * Initialize Capacitor Native Mobile Features
 * - Android Gesture / Hardware Back Button navigation
 * - Status Bar appearance
 * - Firebase Cloud Messaging (FCM) Push Notifications
 */
export const initNativeFeatures = (navigate) => {
  let attempts = 0;
  const maxAttempts = 10;

  const trySetup = () => {
    if (!isNativePlatform()) {
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(trySetup, 250);
        return;
      }
      console.log("🌐 Running in standard Web Browser environment.");
      return;
    }

    console.log("📱 Running in Native Capacitor Android environment.");

    // 1. Android Status Bar styling
    try {
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setBackgroundColor({ color: "#2C4B66" });
    } catch (e) {
      console.log("StatusBar setup note:", e.message);
    }

    // 2. Hardware & Gesture Back Button Handler
    try {
      App.addListener("backButton", ({ canGoBack }) => {
        // Priority 1: Close open modals or drawers if any
        const openModals = document.querySelectorAll(
          ".modal-overlay, .share-modal-overlay, .file-preview-overlay, .preview-modal-overlay, .notification-drawer-overlay"
        );
        if (openModals && openModals.length > 0) {
          const closeBtn = document.querySelector(".modal-close-btn, .close-btn, .close-drawer-btn");
          if (closeBtn) {
            closeBtn.click();
            return;
          }
        }

        // Priority 2: Close active mobile sidebar drawer
        const mobileOverlay = document.querySelector(".mobile-sidebar-overlay.active");
        if (mobileOverlay) {
          mobileOverlay.click();
          return;
        }

        // Priority 3: In chat conversation on mobile, go back to conversation list
        if (
          window.location.pathname.includes("/community/messages/") &&
          window.location.pathname !== "/community/messages"
        ) {
          navigate("/community/messages");
          return;
        }

        // Priority 4: Route navigation back if not on home/login page
        const currentPath = window.location.pathname;
        const isRootPage =
          currentPath === "/courses" ||
          currentPath === "/student/dashboard" ||
          currentPath === "/teacher/dashboard" ||
          currentPath === "/admin/dashboard" ||
          currentPath === "/auth" ||
          currentPath === "/";

        if (!isRootPage) {
          window.history.back();
        } else {
          // Exit native app
          App.exitApp();
        }
      });
    } catch (e) {
      console.warn("Back button listener warning:", e.message);
    }

    // 3. Register for Push Notifications (FCM)
    initPushNotifications(navigate);
  };

  trySetup();
};

export const initPushNotifications = async (navigate) => {
  if (!isNativePlatform()) return;

  try {
    let permStatus = await PushNotifications.checkPermissions();
    console.log("🔔 Initial PushNotification checkPermissions status:", JSON.stringify(permStatus));

    if (permStatus.receive !== "granted") {
      permStatus = await PushNotifications.requestPermissions();
      console.log("🔔 After requestPermissions status:", JSON.stringify(permStatus));
    }

    if (permStatus.receive !== "granted") {
      console.log("⚠️ Push notification permission not granted:", permStatus.receive);
      return;
    }

    // Create high-priority notification channel for Android 8.0+
    try {
      await PushNotifications.createChannel({
        id: "unicore_messages_channel",
        name: "UniCore Notifications",
        description: "Notifications for community messages, exams, assignments, and lectures",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
      });
      console.log("✅ Created Android notification channel: unicore_messages_channel");
    } catch (channelErr) {
      console.warn("Notification channel creation note:", channelErr.message);
    }

    await PushNotifications.register();

    // Successfully registered with FCM
    PushNotifications.addListener("registration", async (token) => {
      console.log("✅ FCM Native Device Token:", token.value);
      localStorage.setItem("fcm_token", token.value);

      // If user is currently authenticated, save device token to DB
      const authToken = localStorage.getItem("token");
      if (authToken && token.value) {
        try {
          await api.post("/auth/fcm-token", { fcmToken: token.value });
          console.log("✅ FCM Device Token synced with server profile");
        } catch (err) {
          console.error("Failed to sync FCM device token:", err);
        }
      }
    });

    PushNotifications.addListener("registrationError", (error) => {
      console.error("❌ Native FCM registration error:", error);
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("🔔 Foreground push notification received:", notification);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("👆 Notification opened by user:", action);
      const link = action.notification?.data?.link;
      if (link && navigate) {
        navigate(link);
      }
    });
  } catch (err) {
    console.error("Push notification setup error:", err);
  }
};
