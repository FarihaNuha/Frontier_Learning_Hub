import { Capacitor, registerPlugin } from "@capacitor/core";
const Native = registerPlugin("UniCoreNotifications");
export const notificationMode = async () => {
  if (!Capacitor.isNativePlatform()) return "legacy";
  try { return (await Native.capabilities()).mode; } catch { return "legacy"; }
};
export const setChatNotificationContext = async (threadId) => {
  if (!Capacitor.isNativePlatform()) return;
  const user = JSON.parse(localStorage.getItem("user") || "null");
  try { await Native.setContext({ userId: localStorage.getItem("token") ? String(user?.id || user?._id || "") : "", ...(threadId !== undefined ? { threadId } : {}) }); } catch { /* Older APK. */ }
};
export const clearChatNotification = async (threadId, before = 0) => {
  if (!Capacitor.isNativePlatform()) return;
  try { await Native.clearThread({ threadId, before }); } catch { /* Older APK. */ }
};
