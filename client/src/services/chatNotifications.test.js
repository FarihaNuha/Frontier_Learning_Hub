jest.mock("@capacitor/core", () => {
  const plugin = {
    setContext: jest.fn(async () => {}),
    getThreadSettings: jest.fn(async () => ({ muted: true })),
    setThreadMuted: jest.fn(async () => {}),
  };
  return { Capacitor: { isNativePlatform: jest.fn(() => true) }, registerPlugin: () => plugin, __plugin: plugin };
});
import { Capacitor, __plugin } from "@capacitor/core";
import { getChatNotificationSettings, setChatMuted } from "./chatNotifications";

beforeEach(() => {
  localStorage.setItem("token", "fixture-token");
  localStorage.setItem("user", JSON.stringify({ id: "fixture-owner" }));
  Capacitor.isNativePlatform.mockReturnValue(true);
  __plugin.setContext.mockResolvedValue(undefined);
  __plugin.getThreadSettings.mockResolvedValue({ muted: true });
  __plugin.setThreadMuted.mockResolvedValue(undefined);
});
test("reads native mute status and allows changing it", async () => {
  expect(await getChatNotificationSettings("peer")).toEqual({ supported: true, muted: true });
  await expect(setChatMuted("peer", false)).resolves.toBeUndefined();
  expect(__plugin.setThreadMuted).toHaveBeenCalledWith({ userId: "fixture-owner", threadId: "peer", muted: false });
});
test("an older APK cannot falsely report that mute was saved", async () => {
  __plugin.getThreadSettings.mockRejectedValue(new Error("not implemented"));
  __plugin.setThreadMuted.mockRejectedValue(new Error("not implemented"));
  expect(await getChatNotificationSettings("peer")).toEqual({ supported: false, muted: false });
  await expect(setChatMuted("peer", true)).rejects.toThrow("not implemented");
});
test("unsupported platforms do not report a successful mute", async () => {
  Capacitor.isNativePlatform.mockReturnValue(false);
  expect(await getChatNotificationSettings("peer")).toEqual({ supported: false, muted: false });
  await expect(setChatMuted("peer", true)).rejects.toThrow("Update the app");
});
