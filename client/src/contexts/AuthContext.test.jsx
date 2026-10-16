import React, { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { io } from "socket.io-client";
import api from "../services/api";
jest.mock("socket.io-client", () => ({ io: jest.fn() }));
jest.mock("../services/api", () => ({ BACKEND_URL: "https://fixture.invalid", __esModule: true, default: { defaults: { headers: { common: {} } }, get: jest.fn(() => new Promise(() => {})) } }));
jest.mock("../services/apiCache", () => ({ clearAllCache: jest.fn() }));
jest.mock("../services/startup", () => ({ prepareHome: jest.fn() }));
jest.mock("../services/chatNotifications", () => ({ setChatNotificationContext: jest.fn(), getChatNotificationSettings: jest.fn() }));
jest.mock("../services/notificationCache", () => ({ invalidateNotificationReads: jest.fn() }));
jest.mock("../services/nativeBridge", () => ({ isNativePlatform: () => false, syncNativePushToken: jest.fn(), disconnectNativePushToken: jest.fn(), showNativeNotification: jest.fn() }));
function Profile() { const { setUser } = useAuth(); return <button onClick={() => setUser({ id: "a", name: "Updated", role: "student" })}>Refresh profile</button>; }
test("strict remount and profile refresh retain exactly one signalling socket", async () => {
  api.get.mockImplementation(() => new Promise(() => {}));
  localStorage.setItem("token", "fixture-session"); localStorage.setItem("user", JSON.stringify({ id: "a", role: "student" }));
  const connections = [];
  io.mockImplementation(() => { const socket = { close: jest.fn(), on: jest.fn(), off: jest.fn() }; connections.push(socket); return socket; });
  const view = render(<StrictMode><AuthProvider><Profile /></AuthProvider></StrictMode>);
  await waitFor(() => expect(connections.length).toBeGreaterThan(0));
  expect(connections.filter(socket => socket.close.mock.calls.length === 0)).toHaveLength(1);
  const count = connections.length; fireEvent.click(screen.getByText("Refresh profile"));
  expect(connections).toHaveLength(count);
  view.unmount(); expect(connections.every(socket => socket.close.mock.calls.length === 1)).toBe(true);
  localStorage.clear();
});
