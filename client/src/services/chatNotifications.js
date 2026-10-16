import { Capacitor, registerPlugin } from "@capacitor/core";
const Native = registerPlugin("UniCoreNotifications");
const currentOwner = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return localStorage.getItem("token") ? String(user?.id || user?._id || "") : "";
  } catch { return ""; }
};
export const getChatNotificationSettings = async threadId => {
  if (!Capacitor.isNativePlatform() || !threadId) return { supported: false, muted: false };
  try {
    await setChatNotificationContext();
    const result = await Native.getThreadSettings({ userId: currentOwner(), threadId: String(threadId) });
    return { supported: true, muted: result.muted === true };
  } catch { return { supported: false, muted: false }; }
};
export const setChatMuted = async (threadId, muted) => {
  if (!Capacitor.isNativePlatform() || !threadId) throw new Error("Update the app to manage chat notifications");
  await setChatNotificationContext();
  await Native.setThreadMuted({ userId: currentOwner(), threadId: String(threadId), muted });
};
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
