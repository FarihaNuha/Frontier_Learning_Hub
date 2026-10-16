import { clearConversations } from "../services/chatState";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "../contexts/AuthContext";
import MessagePage from "./MessagePage";
import { communityApi } from "../services/communityApi";
import { getChatNotificationSettings, setChatMuted } from "../services/chatNotifications";
import { useParams } from "react-router-dom";
jest.mock("react-router-dom", () => ({ useParams: jest.fn(() => ({ userId: "friend" })), useNavigate: () => jest.fn(), useSearchParams: () => [new URLSearchParams()] }));
jest.mock("../contexts/AuthContext", () => { const auth = { user: { id: "me", role: "student", name: "Me" }, socket: null, onlineUsers: [] }; return { useAuth: () => auth }; });
jest.mock("../contexts/CallContext", () => ({ useCall: () => ({ startCall: jest.fn() }) }));
jest.mock("../components/TeacherSidebar", () => () => null);
jest.mock("../components/StudentSidebar", () => () => null);
jest.mock("../services/chatNotifications", () => ({ clearChatNotification: jest.fn(), setChatNotificationContext: jest.fn(), getChatNotificationSettings: jest.fn(async () => ({ supported: false, muted: false })), setChatMuted: jest.fn(async () => {}) }));
jest.mock("../services/nativeFiles", () => ({ downloadFile: jest.fn(), openFile: jest.fn() }));
jest.mock("../services/urls", () => ({ absoluteFileUrl: value => value }));
jest.mock("../services/api", () => ({ __esModule: true, default: { defaults: { baseURL: "/api" } } }));
jest.mock("../services/communityApi", () => ({ communityApi: { getUsers: jest.fn(), getConversation: jest.fn(), getContactRequests: jest.fn(), sendMessage: jest.fn(), toggleReaction: jest.fn(), readMessages: jest.fn() } }));
const friend = { _id: "friend", name: "Friend", role: "student" };
const message = { _id: "message-1", sender: friend, receiver: { _id: "me" }, content: "Question", createdAt: new Date().toISOString() };
beforeEach(() => {
  clearConversations();
  jest.clearAllMocks();
  useParams.mockReturnValue({ userId: "friend" });
  getChatNotificationSettings.mockResolvedValue({ supported: false, muted: false });
  setChatMuted.mockResolvedValue(undefined);
  useAuth().socket = null;
  Element.prototype.scrollIntoView = jest.fn();
  communityApi.getUsers.mockResolvedValue({ data: { users: [friend] } });
  communityApi.getContactRequests.mockResolvedValue({ data: { requests: [] } });
  communityApi.getConversation.mockResolvedValue({ data: { user: friend, messages: [message] } });
  communityApi.sendMessage.mockResolvedValue({ data: { message: { ...message, _id: "sent-ack", sender: { _id: "me" }, receiver: friend } } });
  communityApi.readMessages.mockResolvedValue({ data: { readThrough: 1234 } });
  Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: () => "request-1" } });
});

test("hardware/router Back clears the conversation and ignores its late response", async () => {
  const view = render(<MessagePage />); await screen.findByText("Question");
  let finish;
  communityApi.getConversation.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  useParams.mockReturnValue({}); view.rerender(<MessagePage />);
  await waitFor(() => expect(screen.queryByLabelText("Back to conversations")).toBeNull());
  await act(async () => finish({ data: { user: friend, messages: [message] } }));
  expect(screen.queryByLabelText("Back to conversations")).toBeNull();
  expect(screen.queryByPlaceholderText("Type a message...")).toBeNull();
});
test("a muted conversation can be unmuted and muted again without hiding messages", async () => {
  getChatNotificationSettings.mockResolvedValue({ supported: true, muted: true });
  render(<MessagePage />);
  fireEvent.click(await screen.findByRole("button", { name: "Unmute message notifications" }));
  await waitFor(() => expect(setChatMuted).toHaveBeenCalledWith("friend", false));
  fireEvent.click(await screen.findByRole("button", { name: "Mute message notifications" }));
  await waitFor(() => expect(setChatMuted).toHaveBeenCalledWith("friend", true));
  expect(await screen.findByText("Question")).toBeTruthy();
});
test("tapping a message offers actions and reply submission retains its original id", async () => {
  render(<MessagePage />);
  fireEvent.click(await screen.findByText("Question"));
  fireEvent.click(screen.getByText("Reply"));
  fireEvent.change(screen.getByPlaceholderText("Type a message..."), { target: { value: "My answer" } });
  fireEvent.submit(screen.getByPlaceholderText("Type a message...").closest("form"));
  await waitFor(() => expect(communityApi.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ receiverId: "friend", content: "My answer", replyTo: "message-1", clientMessageId: "request-1" })));
});
test("forward sends the source id to the selected destination", async () => {
  render(<MessagePage />);
  fireEvent.click(await screen.findByText("Question"));
  fireEvent.click(screen.getByText("Forward"));
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "friend" } });
  fireEvent.click(screen.getByRole("button", { name: "Forward", exact: true }));
  await waitFor(() => expect(communityApi.sendMessage).toHaveBeenCalledWith({ receiverId: "friend", forwardOf: "message-1", clientMessageId: "request-1" }));
});

test("sending uses the acknowledged message without downloading the conversation again", async () => {
  communityApi.sendMessage.mockResolvedValue({ data: { message: { _id: "sent-2", content: "Fast reply", sender: { _id: "me" }, receiver: friend, createdAt: new Date().toISOString() } } });
  render(<MessagePage />); await screen.findByText("Question");
  fireEvent.change(screen.getByPlaceholderText("Type a message..."), { target: { value: "Fast reply" } });
  fireEvent.submit(screen.getByPlaceholderText("Type a message...").closest("form"));
  await screen.findByText("Fast reply");
  expect(communityApi.getConversation).toHaveBeenCalledTimes(1);
});

test("socket delivery appends one message and marks its ID read without refetching history", async () => {
  const handlers = {};
  useAuth().socket = { on: (event, fn) => { handlers[event] = fn; }, off: jest.fn() };
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  render(<MessagePage />); await screen.findByText("Question");
  await act(async () => handlers.newPrivateMessage({ message: { ...message, _id: "incoming-2", content: "Another question" } }));
  await screen.findByText("Another question", { selector: ".message-content" });
  expect(communityApi.readMessages).toHaveBeenCalledWith("friend", ["incoming-2"]);
  expect(communityApi.getConversation).toHaveBeenCalledTimes(1);
});

test("a slow send immediately shows Sending and clears only the submitted draft", async () => {
  let acknowledge;
  communityApi.sendMessage.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
  render(<MessagePage />); await screen.findByText("Question");
  const input = screen.getByPlaceholderText("Type a message...");
  fireEvent.change(input, { target: { value: "First draft" } });
  fireEvent.submit(input.closest("form"));
  expect(screen.getByText("First draft")).toBeTruthy();
  expect(screen.getByText("◷ Sending…")).toBeTruthy();
  expect(input.value).toBe("");
  fireEvent.change(input, { target: { value: "Next draft" } });
  await act(async () => acknowledge({ data: { message: { _id: "confirmed", sender: { _id: "me" }, receiver: friend, content: "First draft", createdAt: new Date().toISOString() } } }));
  expect(input.value).toBe("Next draft");
  expect(screen.queryByText("◷ Sending…")).toBeNull();
  expect(screen.getAllByText("First draft")).toHaveLength(1);
});

test("failed sends retain a Retry action and retry with the same id", async () => {
  communityApi.sendMessage.mockRejectedValueOnce(new Error("Offline"));
  render(<MessagePage />); await screen.findByText("Question");
  const input = screen.getByPlaceholderText("Type a message...");
  fireEvent.change(input, { target: { value: "Retry me" } });
  fireEvent.submit(input.closest("form"));
  const retry = await screen.findByRole("button", { name: "Retry", exact: true });
  const firstId = communityApi.sendMessage.mock.calls[0][0].clientMessageId;
  communityApi.sendMessage.mockResolvedValue({ data: { message: { _id: "confirmed-retry", sender: { _id: "me" }, receiver: friend, content: "Retry me", createdAt: new Date().toISOString() } } });
  fireEvent.click(retry);
  await waitFor(() => expect(screen.queryByRole("button", { name: "Retry", exact: true })).toBeNull());
  expect(communityApi.sendMessage.mock.calls[1][0].clientMessageId).toBe(firstId);
  expect(screen.getAllByText("Retry me")).toHaveLength(1);
});

test("older history loads with its cursor and preserves the latest messages", async () => {
  communityApi.getConversation.mockResolvedValueOnce({ data: { user: friend, messages: [message], hasMore: true, nextCursor: "older-page" } });
  render(<MessagePage />); await screen.findByText("Question");
  communityApi.getConversation.mockResolvedValueOnce({ data: { user: friend, messages: [{ ...message, _id: "older", content: "Earlier question", createdAt: "2025-01-01T00:00:00Z" }], hasMore: false } });
  fireEvent.click(screen.getByRole("button", { name: "Load earlier messages" }));
  await screen.findByText("Earlier question");
  expect(screen.getByText("Question")).toBeTruthy();
  expect(communityApi.getConversation).toHaveBeenLastCalledWith("friend", { limit: 40, cursor: "older-page" });
});
