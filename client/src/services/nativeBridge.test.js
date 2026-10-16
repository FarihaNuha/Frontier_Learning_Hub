jest.mock("./chatNotifications", () => ({ notificationMode: jest.fn(async () => "native-v2"), setChatNotificationContext: jest.fn(async () => {}) }));
jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: jest.fn(() => true) } }));
jest.mock("@capacitor/app", () => ({ App: { addListener: jest.fn(async () => ({ remove: jest.fn() })), exitApp: jest.fn(), getLaunchUrl: jest.fn(async () => undefined) } }));
jest.mock("@capacitor/status-bar", () => ({ StatusBar: { setStyle: jest.fn(async () => {}), setBackgroundColor: jest.fn(async () => {}) }, Style: { Light: "LIGHT" } }));
jest.mock("@capacitor/push-notifications", () => ({ PushNotifications: {
  addListener: jest.fn(async () => ({ remove: jest.fn() })),
  checkPermissions: jest.fn(async () => ({ receive: "granted" })),
  requestPermissions: jest.fn(async () => ({ receive: "denied" })),
  register: jest.fn(async () => {}),
} }));
jest.mock("@capacitor/local-notifications", () => ({ LocalNotifications: {
  addListener: jest.fn(async () => ({ remove: jest.fn() })),
  checkPermissions: jest.fn(async () => ({ display: "granted" })),
  createChannel: jest.fn(async () => {}), schedule: jest.fn(async () => {}),
} }));
jest.mock("./api", () => ({ __esModule: true, default: {
  post: jest.fn(async () => ({ data: { success: true, push: { configured: true } } })),
  delete: jest.fn(async () => ({ data: { success: true } })),
  get: jest.fn(async () => ({ data: { configured: true } })),
} }));

let bridge, push, local, app, api;
beforeEach(() => {
  jest.resetModules();
  localStorage.clear();
  sessionStorage.clear();
  bridge = require("./nativeBridge");
  push = require("@capacitor/push-notifications").PushNotifications;
  local = require("@capacitor/local-notifications").LocalNotifications;
  app = require("@capacitor/app").App;
  api = require("./api").default;
});

test("repeated initialization keeps one back handler and one listener per push event", async () => {
  await Promise.all([bridge.initNativeFeatures(jest.fn()), bridge.initNativeFeatures(jest.fn())]);
  await bridge.initNativeFeatures(jest.fn());
  expect(app.addListener.mock.calls.filter(([name]) => name === "backButton")).toHaveLength(1);
  for (const name of ["registration", "registrationError", "pushNotificationReceived", "pushNotificationActionPerformed"]) {
    expect(push.addListener.mock.calls.filter(([event]) => event === name)).toHaveLength(1);
  }
  expect(push.addListener.mock.invocationCallOrder[0]).toBeLessThan(push.register.mock.invocationCallOrder[0]);
});

test("call timestamps become valid Android IDs and immediate alerts need no alarm scheduling", async () => {
  await bridge.showNativeNotification({ id: Date.now(), title: "Incoming call", body: "Caller" });
  const notification = local.schedule.mock.calls[0][0].notifications[0];
  expect(notification.id).toBeGreaterThan(0);
  expect(notification.id).toBeLessThanOrEqual(2147483647);
  expect(notification.schedule).toBeUndefined();
});

test("one event arriving through both socket and FCM displays only once", async () => {
  const notification = { id: "notification-123", title: "New lecture", body: "Lecture 1" };
  await Promise.all([bridge.showNativeNotification(notification), bridge.showNativeNotification(notification)]);
  expect(local.schedule).toHaveBeenCalledTimes(1);
});

test("denied permission does not register for push or try to display a local alert", async () => {
  push.checkPermissions.mockResolvedValue({ receive: "denied" });
  local.checkPermissions.mockResolvedValue({ display: "denied" });
  expect(await bridge.enableNativeNotifications()).toBe(false);
  expect(push.register).not.toHaveBeenCalled();
  expect(await bridge.showNativeNotification({ id: 1, title: "Test" })).toBe(false);
  expect(local.schedule).not.toHaveBeenCalled();
});

test("a failed token sync can retry and reports missing server credentials", async () => {
  localStorage.setItem("token", "signed-in-session");
  localStorage.setItem("fcm_token", "phone-registration-token");
  api.post.mockRejectedValueOnce(new Error("offline"));
  expect(await bridge.syncNativePushToken()).toBe(false);
  api.post.mockResolvedValueOnce({ data: { push: { configured: false } } });
  expect(await bridge.syncNativePushToken()).toBe(true);
  expect(bridge.getNativeNotificationStatus()).toMatchObject({ synced: true, serverConfigured: false });
  expect(bridge.getNativeNotificationStatus().error).toMatch(/administrator/);
});

test("logout unregisters only this phone and allows registration after a new login", async () => {
  localStorage.setItem("token", "account-A");
  localStorage.setItem("fcm_token", "phone-registration-token");
  await bridge.syncNativePushToken();
  await bridge.disconnectNativePushToken();
  expect(api.delete).toHaveBeenCalledWith("/auth/fcm-token", expect.objectContaining({ data: { fcmToken: "phone-registration-token" } }));
  localStorage.setItem("token", "account-B");
  await bridge.syncNativePushToken();
  expect(api.post).toHaveBeenCalledTimes(2);
});

test("foreground pushes for a different account are ignored", async () => {
  localStorage.setItem("token", "session");
  localStorage.setItem("user", JSON.stringify({ id: "user-A" }));
  await bridge.enableNativeNotifications();
  const handler = push.addListener.mock.calls.find(([event]) => event === "pushNotificationReceived")[1];
  handler({ title: "Private message", data: { recipientId: "user-B", notificationId: "123" } });
  expect(local.schedule).not.toHaveBeenCalled();
});

test("a notification opened before login is restored after sign-in", () => {
  const navigate = jest.fn();
  bridge.setGlobalNavigate(navigate);
  bridge.navigateTo("/student/exams/course-1?examId=exam-1");
  expect(navigate).toHaveBeenCalledWith("/auth");
  localStorage.setItem("token", "signed-in-session");
  bridge.restoreNotificationNavigation();
  expect(navigate).toHaveBeenLastCalledWith("/student/exams/course-1?examId=exam-1");
  expect(sessionStorage.getItem("notification_link")).toBeNull();
});

test("push already rendered natively cannot create a second local notification", async () => {
  await bridge.enableNativeNotifications();
  const handler = push.addListener.mock.calls.find(([event]) => event === "pushNotificationReceived")[1];
  handler({ title: "Message", data: { nativeHandled: "true", notificationId: "event-1" } });
  expect(local.schedule).not.toHaveBeenCalled();
});

test("system Back uses the conversation close action even without WebView history", async () => {
  window.history.replaceState({}, "", "/community/messages/friend");
  document.body.innerHTML = '<button class="mobile-back-to-contacts-btn">Back</button>';
  const close = jest.fn(); document.querySelector("button").onclick = close;
  await bridge.initNativeFeatures(jest.fn());
  app.addListener.mock.calls.find(([event]) => event === "backButton")[1]({ canGoBack: false });
  expect(close).toHaveBeenCalledTimes(1); expect(app.exitApp).not.toHaveBeenCalled();
  document.body.innerHTML = ""; window.history.replaceState({}, "", "/");
});

test("a stalled status-bar bridge cannot block Back or push registration", async () => {
  require("@capacitor/status-bar").StatusBar.setStyle.mockImplementation(() => new Promise(() => {}));
  await bridge.initNativeFeatures(jest.fn());
  expect(app.addListener.mock.calls.some(([event]) => event === "backButton")).toBe(true);
  expect(push.register).toHaveBeenCalled();
});
