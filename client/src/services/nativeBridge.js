import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import api from "./api";
import { notificationMode, setChatNotificationContext } from "./chatNotifications";

const CHANNEL_ID = "unicore_messages_channel";
const STATUS_EVENT = "unicore-notifications-changed";
let navigateHandler;
let setupPromise;
let permissionPromise;
let syncPromise;
let syncedKey;
const listeners = new Map();
const displayed = new Map();
let status = { permission: "unknown", registered: false, synced: false, serverConfigured: null, error: null };

export const isNativePlatform = () => Capacitor.isNativePlatform() || Boolean(window.Capacitor?.isNativePlatform?.());
export const getNativeNotificationStatus = () => ({ ...status, native: isNativePlatform() });
const updateStatus = (patch) => {
  status = { ...status, ...patch };
  window.dispatchEvent(new CustomEvent(STATUS_EVENT));
};
export const subscribeNativeNotificationStatus = (listener) => {
  window.addEventListener(STATUS_EVENT, listener);
  return () => window.removeEventListener(STATUS_EVENT, listener);
};

export const setGlobalNavigate = (navigate) => { if (typeof navigate === "function") navigateHandler = navigate; };
export const navigateTo = (link) => {
  // Notification links must remain inside this app.
  if (typeof link !== "string" || !link.startsWith("/") || link.startsWith("//") || link.includes("\\")) return;
  if (!localStorage.getItem("token") && link !== "/auth") {
    sessionStorage.setItem("notification_link", link);
    if (navigateHandler) navigateHandler("/auth");
    return;
  }
  if (navigateHandler) navigateHandler(link);
  else window.location.href = link;
};

export const restoreNotificationNavigation = () => {
  const link = sessionStorage.getItem("notification_link");
  if (link && localStorage.getItem("token")) {
    sessionStorage.removeItem("notification_link");
    navigateTo(link);
  }
};

const openAppUrl = ({ url }) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "unicore:") navigateTo(`${parsed.hostname ? `/${parsed.hostname}` : ""}${parsed.pathname}${parsed.search}`);
  } catch { /* Ignore invalid external links. */ }
};

const addListenerOnce = (key, plugin, event, callback) => {
  if (!listeners.has(key)) {
    listeners.set(key, plugin.addListener(event, callback).catch((error) => {
      listeners.delete(key);
      throw error;
    }));
  }
  return listeners.get(key);
};

export const notificationId = (value) => {
  if (Number.isInteger(value) && value > 0 && value <= 2147483647) return value;
  let hash = 0;
  for (const char of String(value)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return (hash >>> 0) % 2147483647 || 1;
};

const ensureChannel = () => LocalNotifications.createChannel({
  id: CHANNEL_ID,
  name: "UniCore notifications",
  description: "Messages, calls, posts, lectures, assignments and exams",
  importance: 5, visibility: 0, vibration: true, lights: true,
});

export const showNativeNotification = async ({ title, body, link, id }) => {
  try {
    const key = String(id || `${title}|${body}|${link}`);
    const now = Date.now();
    for (const [entry, time] of displayed) if (now - time > 60000) displayed.delete(entry);
    if (displayed.has(key)) return false;
    displayed.set(key, now);
    if (isNativePlatform()) {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== "granted") { displayed.delete(key); return false; }
      await ensureChannel();
      // Omit schedule: an alert must be shown now, without exact-alarm access.
      await LocalNotifications.schedule({ notifications: [{
        id: notificationId(key), title: title || "UniCore", body: body || "",
        channelId: CHANNEL_ID, smallIcon: "ic_stat_unicore", autoCancel: true,
        extra: { link: link || "/notifications" },
      }] });
      return true;
    }
    if ("Notification" in window) {
      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      if (permission === "granted") {
        const notification = new Notification(title || "UniCore", { body, icon: "/logo192.png", tag: key });
        notification.onclick = () => { window.focus(); navigateTo(link || "/notifications"); };
        return true;
      }
    }
    displayed.delete(key);
    return false;
  } catch (error) {
    displayed.delete(String(id || `${title}|${body}|${link}`));
    updateStatus({ error: "Could not display notifications. Check UniCore in your phone's notification settings." });
    console.warn("[Push] Notification display failed:", error.message);
    return false;
  }
};

export const syncNativePushToken = async ({ force = false } = {}) => {
  if (!isNativePlatform()) return false;
  const token = localStorage.getItem("fcm_token");
  const auth = localStorage.getItem("token");
  if (!token || !auth) return false;
  const key = `${auth}:${token}`;
  if (!force && syncedKey === key) return true;
  if (syncPromise) {
    await syncPromise;
    if (syncedKey === key) return true;
  }
  syncPromise = (async () => {
    try {
      await setChatNotificationContext();
      const mode = await notificationMode();
      const { data } = await api.post("/auth/fcm-token", { fcmToken: token, notificationMode: mode }, { timeout: 60000 });
      if (localStorage.getItem("token") !== auth) return false;
      syncedKey = key;
      updateStatus({ synced: true, serverConfigured: data.push?.configured ?? null,
        error: data.push?.configured === false ? "The server's app notifications need setup. Please contact the administrator." : null });
      return true;
    } catch (error) {
      updateStatus({ synced: false, error: "Could not connect this phone for notifications. Check your internet and retry." });
      return false;
    }
  })();
  try { return await syncPromise; } finally { syncPromise = null; }
};

export const disconnectNativePushToken = async () => {
  if (syncPromise) await syncPromise;
  const token = localStorage.getItem("fcm_token");
  try {
    if (token && isNativePlatform()) await api.delete("/auth/fcm-token", { data: { fcmToken: token }, timeout: 5000 });
  } finally {
    syncedKey = null;
    displayed.clear();
    updateStatus({ synced: false });
  }
};

const installNotificationListeners = async () => {
  await addListenerOnce("registration", PushNotifications, "registration", async ({ value }) => {
    localStorage.setItem("fcm_token", value);
    updateStatus({ registered: true, error: null });
    await syncNativePushToken();
  });
  await addListenerOnce("registrationError", PushNotifications, "registrationError", () => {
    updateStatus({ registered: false, error: "This phone could not register for notifications. Check Google Play services and retry." });
  });
  await addListenerOnce("pushReceived", PushNotifications, "pushNotificationReceived", (notification) => {
    if (notification.data?.nativeHandled === "true") return;
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    if (!localStorage.getItem("token")) return;
    if (notification.data?.recipientId && notification.data.recipientId !== String(currentUser?.id || currentUser?._id)) return;
    showNativeNotification({ title: notification.title, body: notification.body,
      link: notification.data?.link, id: notification.data?.notificationId || notification.id });
  });
  await addListenerOnce("pushAction", PushNotifications, "pushNotificationActionPerformed", ({ notification }) => {
    navigateTo(notification.data?.link || "/notifications");
  });
  await addListenerOnce("localAction", LocalNotifications, "localNotificationActionPerformed", ({ notification }) => {
    navigateTo(notification.extra?.link || "/notifications");
  });
};

export const enableNativeNotifications = () => {
  if (!isNativePlatform()) return Promise.resolve(false);
  if (permissionPromise) return permissionPromise;
  permissionPromise = (async () => {
    try {
      // Register listeners before requesting a token; retain one listener per app lifetime.
      await installNotificationListeners();
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive !== "granted") permission = await PushNotifications.requestPermissions();
      updateStatus({ permission: permission.receive });
      if (permission.receive !== "granted") {
        updateStatus({ error: "Allow notifications for UniCore in your phone's Settings, then return here and retry." });
        return false;
      }
      await ensureChannel();
      await PushNotifications.register();
      await syncNativePushToken({ force: true });
      return true;
    } catch (error) {
      updateStatus({ error: "App notifications could not be enabled. Update UniCore and try again." });
      console.warn("[Push] Setup failed:", error.message);
      return false;
    } finally { permissionPromise = null; }
  })();
  return permissionPromise;
};

export const refreshNativeNotificationStatus = async () => {
  if (!isNativePlatform()) return;
  const permission = await PushNotifications.checkPermissions();
  updateStatus({ permission: permission.receive });
  if (localStorage.getItem("token")) {
    const { data } = await api.get("/auth/push-status", { timeout: 10000 });
    updateStatus({ serverConfigured: data.configured });
  }
};

export const testNativePushNotification = async () => {
  await enableNativeNotifications();
  const token = localStorage.getItem("fcm_token");
  if (!token || status.permission !== "granted") throw new Error("Enable notifications on this phone first.");
  await syncNativePushToken({ force: true });
  const { data } = await api.post("/auth/push-test", { fcmToken: token }, { timeout: 15000 });
  return data.message;
};

const handleBack = ({ canGoBack }) => {
  const modals = document.querySelectorAll(".modal-overlay, .share-modal-overlay, .file-preview-overlay, .file-preview-portal-overlay, .preview-modal-overlay, .notification-drawer-overlay");
  const modal = modals[modals.length - 1];
  const close = modal?.querySelector(".modal-close-btn, .share-modal-close, .close-btn, .close-drawer-btn, [aria-label='Close']");
  if (close) { close.click(); return; }
  const sidebar = document.querySelector(".mobile-sidebar-overlay.active");
  if (sidebar) { sidebar.click(); return; }
  const path = window.location.pathname;
  if (path.startsWith("/community/messages/")) { navigateTo("/community/messages"); return; }
  const roots = ["/", "/courses", "/student/dashboard", "/teacher/dashboard", "/admin/dashboard", "/auth"];
  if (!roots.includes(path) && canGoBack) window.history.back();
  else App.exitApp();
};

export const initNativeFeatures = (navigate) => {
  setGlobalNavigate(navigate);
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
    for (let attempt = 0; attempt < 10 && !isNativePlatform(); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!isNativePlatform()) return;
    await Promise.allSettled([
      StatusBar.setStyle({ style: Style.Light }),
      StatusBar.setBackgroundColor({ color: "#2C4B66" }),
    ]);
    await addListenerOnce("back", App, "backButton", handleBack);
    await addListenerOnce("url", App, "appUrlOpen", openAppUrl);
    const launch = await App.getLaunchUrl();
    if (launch?.url) openAppUrl(launch);
    await addListenerOnce("resume", App, "appStateChange", ({ isActive }) => {
      if (isActive) enableNativeNotifications();
    });
    window.addEventListener("online", () => syncNativePushToken({ force: true }));
    await enableNativeNotifications();
  })().catch((error) => {
    setupPromise = null;
    console.warn("[Push] Native setup failed:", error.message);
  });
  return setupPromise;
};
