import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { captureScreen, dismissNativeCall, listenForNativeAnswer, setNativeCallContext } from "../services/callBridge";
import "../styles/calls.css";

const Context = createContext(null);
const blank = { state: "idle" };
export function CallProvider({ children }) {
  const { socket } = useAuth();
  const [view, setView] = useState(blank);
  const session = useRef(null), peer = useRef(null), local = useRef(null), remote = useRef(null);
  const candidates = useRef([]), outgoing = useRef([]), timer = useRef(null), generation = useRef(0);
  const screenStream = useRef(null);
  const reconnectTimer = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [remoteSharing, setRemoteSharing] = useState(false);
  const [answerRequest, setAnswerRequest] = useState(null);
  const videoSender = useRef(null), audioSender = useRef(null);
  const [muted, setMuted] = useState(false), [cameraOff, setCameraOff] = useState(false);
  const audio = useRef(null), localVideo = useRef(null), remoteVideo = useRef(null);
  const update = value => { session.current = value; setView(value || blank); };
  const attach = useCallback(() => {
    if (localVideo.current) localVideo.current.srcObject = screenStream.current?.stream || local.current;
    if (remoteVideo.current) { remoteVideo.current.srcObject = remote.current; remoteVideo.current.play().catch(() => {}); }
    if (audio.current) { audio.current.srcObject = remote.current; audio.current.play().catch(() => {}); }
  }, []);
  const clean = useCallback(() => {
    generation.current++;
    clearTimeout(timer.current);
    clearTimeout(reconnectTimer.current);
    const pc = peer.current; peer.current = null;
    if (session.current?.callId) dismissNativeCall(session.current.callId);
    if (pc) { pc.onconnectionstatechange = null; pc.close(); }
    local.current?.getTracks().forEach(t => t.stop()); local.current = null;
    screenStream.current?.stop(); screenStream.current = null; setSharing(false); setRemoteSharing(false);
    videoSender.current = null; audioSender.current = null; setAnswerRequest(null);
    remote.current = null; candidates.current = []; outgoing.current = [];
    session.current = null; setView(blank); setMuted(false); setCameraOff(false);
    attach();
  }, [attach]);
  const end = useCallback((reason = "ended") => {
    if (session.current?.callId) socket?.emit("end-call", { callId: session.current.callId, reason });
    clean();
  }, [socket, clean]);
  const fail = useCallback(message => { end(); toast.error(message); }, [end]);
  const flush = async () => {
    while (candidates.current.length && peer.current?.remoteDescription) await peer.current.addIceCandidate(candidates.current.shift());
  };
  const acquire = async (type, version) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Calling is unavailable. Update Android System WebView and allow microphone/camera access.");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: type === "video" ? { facingMode: "user" } : false });
    } catch (error) {
      // Some Android/WebView camera drivers reject optional capture hints.
      // A denied permission must still be respected, never repeatedly prompted.
      if (error.name !== "OverconstrainedError") throw error;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
    }
    if (version !== generation.current) { stream.getTracks().forEach(t => t.stop()); throw new Error("Call cancelled"); }
    local.current = stream; attach(); return stream;
  };
  const createPeer = async (stream, version, offer) => {
    const { data } = await api.get("/community/calls/config", { timeout: 10000, cache: false });
    if (version !== generation.current) throw new Error("Call cancelled");
    const pc = new RTCPeerConnection({ iceServers: data.iceServers }); peer.current = pc;
    if (!data.relayConfigured) toast("Some networks may not connect yet. Call setup needs attention from the app administrator.", { id: "call-relay", duration: 6000 });
    remote.current = new MediaStream();
    pc.ontrack = event => { if (!remote.current) return; if (!remote.current.getTracks?.().some(track => track.id === event.track.id)) remote.current.addTrack(event.track); attach(); };
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      if (session.current?.callId) socket.emit("ice-candidate", { callId: session.current.callId, candidate });
      else outgoing.current.push(candidate);
    };
    pc.onconnectionstatechange = () => {
      if (pc !== peer.current) return;
      if (pc.connectionState === "connected") {
        clearTimeout(timer.current); update({ ...session.current, state: "active" });
      } else if (pc.connectionState === "failed") fail("Could not connect the call. Check the network and TURN relay configuration.");
      else if (pc.connectionState === "disconnected") {
        clearTimeout(timer.current); timer.current = setTimeout(() => fail("Call disconnected"), 15000);
      }
    };
    // Reserve a video m-line even for audio calls so screen sharing can replace
    // that track without renegotiation or silently creating an unsignaled track.
    const mic = stream.getAudioTracks()[0], camera = stream.getVideoTracks()[0];
    if (offer) await pc.setRemoteDescription(offer);
    const bind = async (kind, track) => {
      // Answer using the offered media sections. Creating fresh transceivers
      // before applying an offer can leave tracks on unnegotiated sections.
      const offered = offer && pc.getTransceivers?.().find(item => item.receiver.track.kind === kind);
      if (offered) { offered.direction = "sendrecv"; await offered.sender.replaceTrack(track || null); return offered.sender; }
      return pc.addTransceiver(track || kind, { direction: "sendrecv", streams: [stream] }).sender;
    };
    audioSender.current = await bind("audio", mic);
    videoSender.current = await bind("video", camera);
    return pc;
  };
  useEffect(() => { attach(); }, [view.state, view.type, sharing, remoteSharing, attach]);
  useEffect(() => { setNativeCallContext(view.callId); }, [view.callId]);
  useEffect(() => {
    if (!socket) { clean(); return; }
    const ready = () => { clearTimeout(reconnectTimer.current); socket.emit("call-ready"); };
    const resume = () => {
      if (document.visibilityState === "hidden") return;
      if (socket.connected) ready(); else socket.connect?.();
    };
    const incoming = data => {
      if (data.expiresAt && data.expiresAt <= Date.now()) return;
      if (session.current?.callId === data.callId) return;
      if (session.current) return;
      update({ state: "incoming", callId: data.callId, type: data.callType, name: data.callerName, from: data.from, offer: data.offer });
      timer.current = setTimeout(() => { clean(); }, Math.max(0, (data.expiresAt || Date.now() + 45000) - Date.now()));
    };
    const answered = async data => {
      if (data.callId !== session.current?.callId || !peer.current) return;
      try { if (!peer.current.remoteDescription) { update({ ...session.current, state: "connecting" }); await peer.current.setRemoteDescription(data.answer); } await flush(); }
      catch { fail("Could not establish the call"); }
    };
    const ice = async data => {
      if (data.callId !== session.current?.callId) return;
      try {
        if (peer.current?.remoteDescription) await peer.current.addIceCandidate(data.candidate);
        else if (candidates.current.length < 200) candidates.current.push(data.candidate);
      } catch { /* Late candidate after hangup. */ }
    };
    const ended = data => { if (data?.callId === session.current?.callId) { clean(); toast(data.reason || "Call ended"); } };
    const shared = data => { if (data?.callId === session.current?.callId) setRemoteSharing(data.sharing); };
    const disconnected = () => {
      clearTimeout(reconnectTimer.current);
      // Media can keep flowing while Android reconnects its signalling socket.
      // Incoming ringing retains its own expiry while a sleeping app resumes.
      if (session.current && session.current.state !== "incoming") reconnectTimer.current = setTimeout(() => { if (!socket.connected) fail("Call connection was lost. Please retry."); }, 15000);
    };
    socket.on("connect", ready); socket.on("incoming-call", incoming); socket.on("call-answered", answered);
    socket.on("ice-candidate", ice); socket.on("call-ended", ended); socket.on("disconnect", disconnected); socket.on("screen-sharing", shared); ready();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    let disposed = false, removeNative, resumeHandle;
    if (Capacitor.isNativePlatform()) App.addListener("appStateChange", ({ isActive }) => { if (isActive) resume(); }).then(handle => { if (disposed) handle.remove(); else resumeHandle = handle; }).catch(() => {});
    listenForNativeAnswer(action => { if (!disposed) setAnswerRequest(action.callId); }).then(remove => { if (disposed) remove(); else removeNative = remove; });
    return () => {
      socket.off("connect", ready); socket.off("incoming-call", incoming); socket.off("call-answered", answered);
      socket.off("ice-candidate", ice); socket.off("call-ended", ended); socket.off("disconnect", disconnected);
      socket.off("screen-sharing", shared); disposed = true; removeNative?.(); resumeHandle?.remove();
      document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", resume);
      if (session.current?.callId) socket.emit("end-call", { callId: session.current.callId });
      clean();
    };
  }, [socket, clean, fail]);
  useEffect(() => {
    if (!["incoming", "calling"].includes(view.state)) return;
    // Browsers may require a prior tap before playing ringtone audio.
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext(); let oscillator;
    const ring = () => {
      if (ctx.state === "closed") return;
      oscillator = ctx.createOscillator(); const gain = ctx.createGain(); gain.gain.value = 0.08;
      oscillator.frequency.value = view.state === "incoming" ? 660 : 440;
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.45);
    };
    ctx.resume().then(ring).catch(() => {}); const interval = setInterval(ring, 2200);
    return () => { clearInterval(interval); ctx.close().catch(() => {}); };
  }, [view.state]);
  const startCall = async (partner, type) => {
    if (session.current) return toast.error("Finish your current call first");
    if (!socket?.connected) return toast.error("Reconnect before calling");
    const version = ++generation.current;
    update({ state: "preparing", name: partner.name, type });
    try {
      const stream = await acquire(type, version); const pc = await createPeer(stream, version);
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      socket.timeout(15000).emit("call-user", { to: partner._id || partner.id, offer, callType: type }, (err, result) => {
        if (version !== generation.current) { if (result?.callId) socket.emit("end-call", { callId: result.callId }); return; }
        if (err || result?.error || !result?.callId) return fail(result?.error || "Server did not respond. Retry the call.");
        update({ ...session.current, state: "calling", callId: result.callId });
        for (const candidate of outgoing.current.splice(0)) socket.emit("ice-candidate", { callId: result.callId, candidate });
        timer.current = setTimeout(() => fail("No answer"), 47000);
      });
    } catch (error) { if (version === generation.current) fail(error.name === "NotAllowedError" ? "Allow microphone/camera access in your phone settings." : error.response?.data?.error || error.message); }
  };
  const answer = async () => {
    const call = session.current; if (!call?.offer || view.state !== "incoming") return;
    const version = generation.current; clearTimeout(timer.current); dismissNativeCall(call.callId); update({ ...call, state: "connecting" });
    timer.current = setTimeout(() => fail("Call could not connect"), 30000);
    try {
      const stream = await acquire(call.type, version); const pc = await createPeer(stream, version, call.offer);
      await flush();
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      socket.timeout(10000).emit("answer-call", { callId: call.callId, answer }, (err, result) => {
        if (version === generation.current && (err || result?.error)) fail(result?.error || "Call could not be answered");
      });
    } catch (error) { if (version === generation.current) fail(error.name === "NotAllowedError" ? "Allow microphone/camera access to answer." : error.response?.data?.error || error.message); }
  };
  useEffect(() => {
    if (answerRequest && view.state === "incoming" && answerRequest === view.callId) {
      setAnswerRequest(null); answer();
    }
    // Answer is invoked only for this explicit native Answer action/session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerRequest, view.state, view.callId]);
  const toggle = kind => {
    const tracks = kind === "audio" ? local.current?.getAudioTracks() : local.current?.getVideoTracks();
    if (!tracks?.length) return;
    const enabled = !tracks[0].enabled; tracks.forEach(t => { t.enabled = enabled; });
    if (kind === "audio") setMuted(!enabled); else setCameraOff(!enabled);
  };
  const shareScreen = async () => {
    const pc = peer.current, sender = videoSender.current;
    if (!sender || session.current?.state !== "active") return;
    const stop = async () => {
      screenStream.current?.stop(); screenStream.current = null;
      if (peer.current === pc) await sender.replaceTrack(local.current?.getVideoTracks()[0] || null);
      if (session.current?.callId) socket.emit("screen-sharing", { callId: session.current.callId, sharing: false });
      setSharing(false); attach();
    };
    if (screenStream.current) return stop();
    try {
      const capture = await captureScreen(stop);
      if (peer.current !== pc) { capture.stop(); return; }
      screenStream.current = capture;
      await sender.replaceTrack(capture.stream.getVideoTracks()[0]); setSharing(true);
      socket.emit("screen-sharing", { callId: session.current.callId, sharing: true });
      if (localVideo.current) localVideo.current.srcObject = capture.stream;
    } catch { toast.error("Screen sharing was cancelled or is unavailable"); }
  };
  return <Context.Provider value={{ startCall, callState: view.state }}>
    {children}
    {view.state !== "idle" && <div className="call-overlay" role="dialog" aria-modal="true" aria-label="Audio or video call">
      <h2>{view.name}</h2><p role="status">{view.state === "incoming" ? `Incoming ${view.type} call` : view.state}</p>
      {(view.type === "video" || remoteSharing || sharing) && view.state !== "incoming" && <div className="call-video-area"><video ref={remoteVideo} autoPlay playsInline muted /><video ref={localVideo} autoPlay playsInline muted className="call-self-video" /></div>}
      <audio ref={audio} autoPlay playsInline />
      <div className="call-controls">
        {view.state === "incoming" ? <button onClick={answer}>Answer</button> : <>
          <button onClick={() => toggle("audio")}>{muted ? "Unmute" : "Mute"}</button>
          {view.type === "video" && <button onClick={() => toggle("video")}>{cameraOff ? "Camera on" : "Camera off"}</button>}
          {view.state === "active" && (Capacitor.isNativePlatform() || navigator.mediaDevices?.getDisplayMedia) && <button onClick={shareScreen}>{sharing ? "Stop sharing" : "Share screen"}</button>}
          <button onClick={() => { attach(); audio.current?.play().catch(() => toast.error("Tap again to enable sound")); }}>Enable sound</button>
        </>}
        <button className="call-hangup" onClick={() => end(view.state === "incoming" ? "declined" : "ended")}>{view.state === "incoming" ? "Decline" : "End call"}</button>
      </div>
    </div>}
  </Context.Provider>;
}
export const useCall = () => useContext(Context);
