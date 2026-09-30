import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { PushNotifications } from "@capacitor/push-notifications";
import api from "./api";

/**
 * Initialize Capacitor Native Mobile Features
 * - Android Gesture / Hardware Back Button navigation
 * - Status Bar appearance
 * - Firebase Cloud Messaging (FCM) Push Notifications
 */
export const initNativeFeatures = (navigate) => {
  if (!Capacitor.isNativePlatform()) {
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
      // Priority 1: Close open modals if any
      const openModals = document.querySelectorAll(
        ".modal-overlay, .share-modal-overlay, .file-preview-overlay, .preview-modal-overlay"
      );
      if (openModals && openModals.length > 0) {
        const closeBtn = document.querySelector(".modal-close-btn, .close-btn");
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
        // Double-check or exit native app
        App.exitApp();
      }
    });
  } catch (e) {
    console.warn("Back button listener warning:", e.message);
  }

  // 3. Register for Push Notifications (FCM)
  initPushNotifications(navigate);
};

export const initPushNotifications = async (navigate) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.log("Push notification permission not granted");
      return;
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
