import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CallProvider } from "./CallContext";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import { captureScreen, listenForNativeAnswer } from "../services/callBridge";
jest.mock("./AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../services/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock("@capacitor/app", () => ({ App: { addListener: jest.fn() } }));
jest.mock("../services/callBridge", () => ({ dismissNativeCall: jest.fn(), setNativeCallContext: jest.fn(), listenForNativeAnswer: jest.fn(async () => () => {}), captureScreen: jest.fn() }));
jest.mock("react-hot-toast", () => { const toast = jest.fn(); toast.error = jest.fn(); return { __esModule: true, default: toast }; });
let handlers, socket, pc, stream;
beforeEach(() => {
  listenForNativeAnswer.mockResolvedValue(() => {});
  jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  handlers = {};
  socket = { connected: true, on: jest.fn((name, fn) => { handlers[name] = fn; }), off: jest.fn(), emit: jest.fn(), timeout: jest.fn() };
  socket.timeout.mockReturnValue({ emit: jest.fn((event, data, ack) => ack(null, { success: true })) });
  useAuth.mockReturnValue({ socket });
  api.get.mockResolvedValue({ data: { iceServers: [{ urls: "turn:example.test", username: "u", credential: "p" }], relayConfigured: true } });
  const track = { stop: jest.fn(), enabled: true };
  stream = { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [] };
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: jest.fn(async () => stream) } });
  window.MediaStream = jest.fn(() => ({ addTrack: jest.fn() }));
  pc = { addTransceiver: jest.fn(() => ({ sender: { replaceTrack: jest.fn(async () => {}) } })), setRemoteDescription: jest.fn(async desc => { pc.remoteDescription = desc; }), createAnswer: jest.fn(async () => ({ type: "answer", sdp: "answer" })), setLocalDescription: jest.fn(async () => {}), addIceCandidate: jest.fn(async () => {}), close: jest.fn() };
  window.RTCPeerConnection = jest.fn(() => pc);
});
test("incoming call works outside the chat page and queues ICE before microphone access", async () => {
  const view = render(<CallProvider><div>Dashboard</div></CallProvider>);
  act(() => {
    handlers["incoming-call"]({ callId: "c1", from: "a", callerName: "Caller", callType: "audio", offer: { type: "offer", sdp: "offer" } });
    handlers["ice-candidate"]({ callId: "c1", candidate: { candidate: "candidate:queued" } });
  });
  expect(screen.getByText("Incoming audio call")).toBeTruthy();
  fireEvent.click(screen.getByText("Answer"));
  await waitFor(() => expect(pc.addIceCandidate).toHaveBeenCalledWith({ candidate: "candidate:queued" }));
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: false }));
  act(() => handlers["call-ended"]({ callId: "different-call" }));
  expect(pc.close).not.toHaveBeenCalled();
  act(() => handlers["call-ended"]({ callId: "c1" }));
  expect(pc.close).toHaveBeenCalled(); expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  view.unmount();
});
test("declining a call signals its session and removes the call overlay", () => {
  render(<CallProvider><div>Dashboard</div></CallProvider>);
  act(() => handlers["incoming-call"]({ callId: "c2", callerName: "Caller", callType: "video" }));
  fireEvent.click(screen.getByText("Decline"));
  expect(socket.emit).toHaveBeenCalledWith("end-call", { callId: "c2", reason: "declined" });
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("native Answer action received before call recovery answers the matching session", async () => {
  render(<CallProvider><div>Dashboard</div></CallProvider>);
  act(() => listenForNativeAnswer.mock.calls[0][0]({ callId: "native-call" }));
  act(() => handlers["incoming-call"]({ callId: "native-call", from: "a", callerName: "Caller", callType: "audio", offer: { type: "offer", sdp: "sdp" } }));
  await waitFor(() => expect(pc.setRemoteDescription).toHaveBeenCalled());
  expect(screen.queryByText("Answer")).toBeNull();
});

test("audio calls reserve a video sender and replace it for screen sharing", async () => {
  const captureTrack = { stop: jest.fn() }, stopCapture = jest.fn();
  captureScreen.mockResolvedValue({ stream: { getVideoTracks: () => [captureTrack] }, stop: stopCapture });
  navigator.mediaDevices.getDisplayMedia = jest.fn();
  render(<CallProvider><div>Dashboard</div></CallProvider>);
  act(() => handlers["incoming-call"]({ callId: "screen-call", from: "a", callerName: "Caller", callType: "audio", offer: { type: "offer", sdp: "sdp" } }));
  fireEvent.click(screen.getByText("Answer"));
  await waitFor(() => expect(pc.setLocalDescription).toHaveBeenCalled());
  expect(pc.addTransceiver).toHaveBeenCalledWith("video", expect.objectContaining({ direction: "sendrecv" }));
  act(() => { pc.connectionState = "connected"; pc.onconnectionstatechange(); });
  fireEvent.click(screen.getByText("Share screen"));
  await screen.findByText("Stop sharing");
  const sender = pc.addTransceiver.mock.results[1].value.sender;
  expect(sender.replaceTrack).toHaveBeenCalledWith(captureTrack);
  fireEvent.click(screen.getByText("Stop sharing"));
  await waitFor(() => expect(stopCapture).toHaveBeenCalled());
  expect(sender.replaceTrack).toHaveBeenLastCalledWith(null);
});

test("answer binds microphone and camera to the offered transceivers", async () => {
  const audioSender = { replaceTrack: jest.fn(async () => {}) }, videoSender = { replaceTrack: jest.fn(async () => {}) };
  pc.getTransceivers = () => [{ receiver: { track: { kind: "audio" } }, sender: audioSender }, { receiver: { track: { kind: "video" } }, sender: videoSender }];
  render(<CallProvider>Dashboard</CallProvider>);
  act(() => handlers["incoming-call"]({ callId: "offered", from: "a", callType: "audio", offer: { type: "offer", sdp: "offer" } }));
  fireEvent.click(screen.getByText("Answer"));
  await waitFor(() => expect(audioSender.replaceTrack).toHaveBeenCalledWith(stream.getAudioTracks()[0]));
  expect(pc.setRemoteDescription.mock.invocationCallOrder[0]).toBeLessThan(audioSender.replaceTrack.mock.invocationCallOrder[0]);
  expect(pc.addTransceiver).not.toHaveBeenCalled();
  expect(videoSender.replaceTrack).toHaveBeenCalledWith(null);
});

test("returning to the app recovers pending ringing; expired calls are ignored", () => {
  render(<CallProvider>Dashboard</CallProvider>);
  const before = socket.emit.mock.calls.filter(([event]) => event === "call-ready").length;
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(socket.emit.mock.calls.filter(([event]) => event === "call-ready")).toHaveLength(before + 1);
  act(() => handlers["incoming-call"]({ callId: "expired", expiresAt: Date.now() - 100 }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("duplicate ringing with clock skew shows one answerable portal outside the page", () => {
  const view = render(<div style={{ transform: "translateZ(0)" }}><CallProvider>Courses</CallProvider></div>);
  const call = { callId: "clock-skew", callerName: "Friend", callType: "audio", expiresAt: 1045000, serverTime: 1000000, ringForMs: 45000, offer: { type: "offer", sdp: "offer" } };
  act(() => { handlers["incoming-call"](call); handlers["incoming-call"](call); });
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(view.container.querySelector('[role="dialog"]')).toBeNull();
  expect(screen.getByRole("button", { name: "Answer", exact: true })).toBeTruthy();
  fireEvent.click(screen.getByText("Decline"));
  expect(socket.emit).toHaveBeenCalledWith("end-call", { callId: "clock-skew", reason: "declined" });
});

test("a temporary signalling disconnect preserves an active media call", async () => {
  jest.useFakeTimers();
  const view = render(<CallProvider>Dashboard</CallProvider>);
  act(() => handlers["incoming-call"]({ callId: "recover", from: "a", callType: "audio", offer: { type: "offer", sdp: "sdp" } }));
  fireEvent.click(screen.getByText("Answer"));
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  act(() => { pc.connectionState = "connected"; pc.onconnectionstatechange(); socket.connected = false; handlers.disconnect(); });
  expect(pc.close).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(1000); socket.connected = true; handlers.connect(); jest.advanceTimersByTime(16000); });
  expect(pc.close).not.toHaveBeenCalled();
  view.unmount(); jest.useRealTimers();
});
