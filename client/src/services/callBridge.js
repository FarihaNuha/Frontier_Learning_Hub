import { Capacitor, registerPlugin } from "@capacitor/core";
const Calls = registerPlugin("UniCoreCalls");
const Capture = registerPlugin("UniCoreScreenShare");
export const setNativeCallContext = callId => {
  if (Capacitor.isNativePlatform()) Calls.visible({ callId: callId || "" }).catch(() => {});
};
export const dismissNativeCall = callId => {
  if (Capacitor.isNativePlatform() && callId) Calls.dismiss({ callId }).catch(() => {});
};
export const listenForNativeAnswer = async handler => {
  if (!Capacitor.isNativePlatform()) return () => {};
  let listener;
  try {
    const consume = async () => { const action = await Calls.takeAction(); if (action.callId) handler(action); };
    listener = await Calls.addListener("callAction", consume);
    await consume();
    return () => listener.remove();
  } catch { listener?.remove(); return () => {}; }
};
export const openCallSettings = () => Calls.settings();
export const getCallSettings = () => Calls.status();

export async function captureScreen(onStopped) {
  if (!Capacitor.isNativePlatform()) {
    if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Screen sharing is unavailable in this browser. Use the latest UniCore Android app or a desktop browser.");
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    stream.getVideoTracks()[0].onended = onStopped;
    return { stream, stop: () => stream.getTracks().forEach(track => { track.onended = null; track.stop(); }) };
  }
  const canvas = document.createElement("canvas");
  if (!canvas.captureStream) throw new Error("Update Android System WebView to share your screen.");
  canvas.width = 540; canvas.height = 960;
  const context = canvas.getContext("2d");
  context.fillRect(0, 0, canvas.width, canvas.height);
  const stream = canvas.captureStream(0), track = stream.getVideoTracks()[0];
  if (!track?.requestFrame) { stream.getTracks().forEach(t => t.stop()); throw new Error("Update Android System WebView to share your screen."); }
  let frameListener, stopListener, stopped = false;
  const stop = () => {
    if (stopped) return; stopped = true;
    frameListener?.remove(); stopListener?.remove();
    stream.getTracks().forEach(t => t.stop()); Capture.stop().catch(() => {});
  };
  try {
    frameListener = await Capture.addListener("frame", ({ jpeg, width, height }) => {
      if (stopped) return;
      const img = new Image();
      img.onload = () => {
        if (!stopped) {
          if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
          context.drawImage(img, 0, 0); track.requestFrame();
          Capture.frameConsumed().catch(() => {});
        }
      };
      img.onerror = () => Capture.frameConsumed().catch(() => {});
      img.src = `data:image/jpeg;base64,${jpeg}`;
    });
    stopListener = await Capture.addListener("stopped", () => { if (!stopped) { stop(); onStopped(); } });
    await Capture.start();
    if (stopped) throw new Error("Screen sharing stopped");
    return { stream, stop };
  } catch (error) { stop(); throw error; }
}
