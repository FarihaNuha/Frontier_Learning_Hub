import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import api from "./api";

let navigateHandler = null;

export const setGlobalNavigate = (nav) => {
  if (typeof nav === "function") {
    navigateHandler = nav;
  }
};

export const navigateTo = (link) => {
  if (!link) return;
  console.log("🚀 Deep linking navigation to:", link);
  try {
    if (navigateHandler) {
      navigateHandler(link);
    } else if (typeof window !== "undefined") {
      window.location.href = link;
    }
  } catch (err) {
    console.error("Navigation error:", err);
    if (typeof window !== "undefined") {
      window.location.href = link;
    }
  }
};

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
 * Show a native floating heads-up Android notification (like WhatsApp / Messenger / Google Classroom)
 * or web browser notification fallback
 */
export const showNativeNotification = async ({ title, body, link, id }) => {
  try {
    if (isNativePlatform()) {
      const notifId = id
        ? typeof id === "number"
          ? id
          : Math.abs(hashCode(String(id)))
        : Math.floor(Math.random() * 1000000) + 1;

      // Ensure notification channel exists
      await ensureHeadsUpChannel();

      // Check and request permission if needed
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
      } catch (permErr) {
        console.warn("Permission check note:", permErr);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: title || "UniCore Notification",
            body: body || "",
            channelId: "unicore_heads_up_channel",
            extra: { link: link || "/notifications" },
            schedule: { at: new Date(Date.now() + 50) },
          },
        ],
      });
      console.log("🔔 Native heads-up floating notification scheduled:", title);
    } else {
      // Standard Web Browser Notification fallback
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          const n = new Notification(title || "UniCore Notification", {
            body: body || "",
            icon: "/logo192.png",
            badge: "/logo192.png",
            data: { link: link || "/notifications" },
          });
          n.onclick = () => {
            window.focus();
            navigateTo(link || "/notifications");
          };
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((res) => {
            if (res === "granted") {
              const n = new Notification(title || "UniCore Notification", {
                body: body || "",
                icon: "/logo192.png",
                data: { link: link || "/notifications" },
              });
              n.onclick = () => {
                window.focus();
                navigateTo(link || "/notifications");
              };
            }
          });
        }
      }
    }
  } catch (err) {
    console.warn("Notification display error:", err.message);
  }
};

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

let channelCreated = false;
const ensureHeadsUpChannel = async () => {
  if (!isNativePlatform() || channelCreated) return;
  try {
    await LocalNotifications.createChannel({
      id: "unicore_heads_up_channel",
      name: "UniCore Heads-Up Alerts",
      description: "High priority alerts for incoming calls, messages, exams, assignments, and lectures",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: "#3B8DB3",
    });
    channelCreated = true;
    console.log("✅ Created Android high-priority channel: unicore_heads_up_channel");
  } catch (channelErr) {
    console.warn("Channel create warning:", channelErr.message);
  }
};

/**
 * Initialize Capacitor Native Mobile Features
 * - Android Gesture / Hardware Back Button navigation
 * - Status Bar appearance
 * - Firebase Cloud Messaging (FCM) Push Notifications
 * - Native Heads-up Local Notifications (like WhatsApp / Google Classroom)
 */
export const initNativeFeatures = (navigate) => {
  if (navigate) {
    setGlobalNavigate(navigate);
  }

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
      // Web notification permission request
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
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
          navigateTo("/community/messages");
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

    // 3. Register for Push Notifications (FCM) & Heads-up Local Notifications
    initLocalNotifications(navigate);
    initPushNotifications(navigate);
  };

  trySetup();
};

export const initLocalNotifications = async (navigate) => {
  if (navigate) setGlobalNavigate(navigate);
  if (!isNativePlatform()) return;

  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      perm = await LocalNotifications.requestPermissions();
    }

    await ensureHeadsUpChannel();

    // Handle tap on floating local notification banner -> deep link navigate
    LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      console.log("👆 Native local notification tapped:", action);
      const link = action.notification?.extra?.link;
      if (link) {
        navigateTo(link);
      }
    });
  } catch (err) {
    console.error("Local notifications setup error:", err);
  }
};

export const initPushNotifications = async (navigate) => {
  if (navigate) setGlobalNavigate(navigate);
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
      showNativeNotification({
        title: notification.title,
        body: notification.body,
        link: notification.data?.link,
      });
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("👆 Notification opened by user:", action);
      const link = action.notification?.data?.link;
      if (link) {
        navigateTo(link);
      }
    });
  } catch (err) {
    console.error("Push notification setup error:", err);
  }
};
