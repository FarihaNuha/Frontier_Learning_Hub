import { useState, useEffect, useRef, useCallback } from "react";
import * as docx from "docx-preview";
import JSZip from "jszip";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { communityApi } from "../services/communityApi";
import api from "../services/api";
import TeacherSidebar from "../components/TeacherSidebar";
import StudentSidebar from "../components/StudentSidebar";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiSend,
  FiUser,
  FiSearch,
  FiMessageSquare,
  FiSlash,
  FiPaperclip,
  FiImage,
  FiFile,
  FiCamera,
  FiMic,
  FiX,
  FiTrash2,
  FiPhone,
  FiVideo,
  FiPhoneOff,
  FiPhoneMissed,
  FiClock,
  FiCheck,
  FiAlertCircle,
  FiSend as FiRequestSend,
  FiInbox,
  FiMonitor,
  FiBookOpen,
} from "react-icons/fi";
import "../styles/community.css";

// ========================= WebRTC helpers =========================
const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

// ==================================================================

export default function MessagePage() {
  const { userId } = useParams();
  const { user, socket, onlineUsers } = useAuth();
  const navigate = useNavigate();

  // ---- messaging state ----
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(!userId);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  // ---- tab state ----
  const [activeTab, setActiveTab] = useState(tabParam === "requests" ? "requests" : "messages"); // "messages" | "requests"

  useEffect(() => {
    if (tabParam === "requests") {
      setActiveTab("requests");
    } else {
      setActiveTab("messages");
    }
  }, [tabParam]);

  // ---- contact request state ----
  const [contactRequests, setContactRequests] = useState([]);
  const [crLoading, setCrLoading] = useState(false);
  // student: form
  const [crTeacherId, setCrTeacherId] = useState("");
  const [crSubject, setCrSubject] = useState("");
  const [crTopic, setCrTopic] = useState("");
  const [crSending, setCrSending] = useState(false);
  // teacher: responding
  const [respondingId, setRespondingId] = useState(null);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");

  // ---- messaging lock state ----
  const [activeSlot, setActiveSlot] = useState(null); // null = locked, or { scheduleStart, scheduleEnd }

  // ---- WebRTC call state ----
  const [callState, setCallState] = useState("idle"); // idle | calling | incoming | active
  const [callType, setCallType] = useState("video"); // video | audio
  const [incomingCall, setIncomingCall] = useState(null);
  const [callPartner, setCallPartner] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const docxContainerRef = useRef(null);
  const isCallerRef = useRef(false);
  const isCallAnsweredRef = useRef(false);
  const callStartTimeRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const quickEmojis = ["❤️", "👍", "😂", "😮", "😢", "😡"];

  // ==================================================================
  //  Lifecycle
  // ==================================================================

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchContactRequests();
    }
  }, [user]);

  useEffect(() => {
    if (user && userId) {
      fetchConversation(userId);
      setShowNewMessage(false);
    }
  }, [userId, user]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Check active slot whenever selectedUser or contactRequests changes
  useEffect(() => {
    if (!selectedUser) { setActiveSlot(null); return; }
    // If current user is student and selected user is teacher
    if (user?.role === "student" && selectedUser?.role === "teacher") {
      const now = new Date();
      const slot = contactRequests.find(
        (r) =>
          r.status === "accepted" &&
          ((r.teacher?._id || r.teacher) === (selectedUser._id || selectedUser.id)) &&
          new Date(r.scheduleStart) <= now &&
          new Date(r.scheduleEnd) >= now
      );
      setActiveSlot(slot || null);
    } else {
      setActiveSlot("open"); // teachers and student-student chats are always open
    }
  }, [selectedUser, contactRequests, user?.role]);

  // Socket listeners for messages, contact requests, WebRTC
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      const msg = data.message;
      fetchUsers();
      const currentActiveId = userId || (selectedUser && (selectedUser._id || selectedUser.id));
      const msgSenderId = msg.sender?._id || msg.sender;
      const msgReceiverId = msg.receiver?._id || msg.receiver;
      if ((msgSenderId === currentActiveId) || (msgReceiverId === currentActiveId)) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        communityApi.getConversation(currentActiveId).catch(console.error);
      }
    };

    const handleReaction = (data) => {
      setMessages((prev) =>
        prev.map((m) => m._id === data.messageId ? { ...m, reactions: data.reactions } : m)
      );
    };

    const handleNewContactRequest = () => { fetchContactRequests(); };
    const handleContactRequestResponse = () => { fetchContactRequests(); };

    const handleIncomingCall = ({ from, callerName, callType: ct, offer }) => {
      isCallerRef.current = false;
      isCallAnsweredRef.current = false;
      callStartTimeRef.current = null;
      setIncomingCall({ from, callerName, callType: ct, offer });
      setCallState("incoming");
    };

    const handleCallAnswered = async ({ answer }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          isCallAnsweredRef.current = true;
          callStartTimeRef.current = Date.now();
          setCallState("active");
          // Process queued ICE candidates
          while (pendingIceCandidatesRef.current.length > 0) {
            const cand = pendingIceCandidatesRef.current.shift();
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
          }
        }
      } catch (err) { console.error("setRemoteDescription error:", err); }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (candidate && peerConnectionRef.current) {
          if (peerConnectionRef.current.remoteDescription && peerConnectionRef.current.remoteDescription.type) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            pendingIceCandidatesRef.current.push(candidate);
          }
        }
      } catch (err) { console.error("ICE candidate error:", err); }
    };

    const handleCallEnded = () => { cleanupCall(); toast("Call ended"); };
    const handleCallError = ({ error }) => {
      cleanupCall();
      toast.error(error);
    };

    socket.on("newPrivateMessage", handleNewMessage);
    socket.on("messageReaction", handleReaction);
    socket.on("newContactRequest", handleNewContactRequest);
    socket.on("contactRequestResponse", handleContactRequestResponse);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-answered", handleCallAnswered);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-error", handleCallError);

    return () => {
      socket.off("newPrivateMessage", handleNewMessage);
      socket.off("messageReaction", handleReaction);
      socket.off("newContactRequest", handleNewContactRequest);
      socket.off("contactRequestResponse", handleContactRequestResponse);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-answered", handleCallAnswered);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-error", handleCallError);
    };
  }, [socket, userId, selectedUser]);

  useEffect(() => {
    if (previewFile?.type === "docx" && docxContainerRef.current && previewFile.blob) {
      docx.renderAsync(previewFile.blob, docxContainerRef.current).catch(console.error);
    }
  }, [previewFile]);

  // ==================================================================
  //  Data fetching
  // ==================================================================

  const fetchUsers = async () => {
    try {
      const courseId = new URLSearchParams(window.location.search).get("courseId");
      const params = courseId ? { courseId } : {};
      const res = await communityApi.getUsers(params);
      setUsers(res.data.users.filter((u) => u._id !== (user?.id || user?._id)));
    } catch (error) { console.error(error); }
  };

  const fetchConversation = async (id) => {
    try {
      setLoading(true);
      const res = await communityApi.getConversation(id);
      setMessages(res.data.messages);
      const otherUser =
        res.data.messages[0]?.sender._id === (user?.id || user?._id)
          ? res.data.messages[0]?.receiver
          : res.data.messages[0]?.sender;
      setSelectedUser(otherUser);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchContactRequests = async () => {
    try {
      setCrLoading(true);
      const res = await communityApi.getContactRequests();
      setContactRequests(res.data.requests || []);
    } catch (err) { console.error(err); } finally { setCrLoading(false); }
  };

  // ==================================================================
  //  Contact Request actions
  // ==================================================================

  const handleSendContactRequest = async (e) => {
    e.preventDefault();
    if (!crTeacherId || !crSubject.trim()) return;
    try {
      setCrSending(true);
      await communityApi.createContactRequest({ teacherId: crTeacherId, subject: crSubject, topic: crTopic });
      toast.success("Contact request sent!");
      setCrTeacherId(""); setCrSubject(""); setCrTopic("");
      fetchContactRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send request");
    } finally { setCrSending(false); }
  };

  const handleRespondToRequest = async (requestId, status) => {
    if (status === "accepted" && (!scheduleStart || !scheduleEnd)) {
      toast.error("Please set a schedule window first."); return;
    }
    try {
      const payload = { status };
      if (status === "accepted") {
        payload.scheduleStart = new Date(scheduleStart).toISOString();
        payload.scheduleEnd = new Date(scheduleEnd).toISOString();
      }
      await communityApi.respondToContactRequest(requestId, payload);
      toast.success(status === "accepted" ? "Request accepted & schedule set!" : "Request declined.");
      setRespondingId(null); setScheduleStart(""); setScheduleEnd("");
      fetchContactRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to respond.");
    }
  };

  // ==================================================================
  //  Messaging
  // ==================================================================

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    if (!selectedUser && !userId) return;

    setSending(true);
    try {
      const targetId = userId || selectedUser._id;
      const token = localStorage.getItem("token");

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append("receiverId", targetId);
        formData.append("content", newMessage);
        formData.append("subject", subject || "Message");
        selectedFiles.forEach((file) => formData.append("files", file));

        const baseUrl = api.defaults.baseURL || "http://localhost:5000/api";
        const res = await fetch(`${baseUrl}/community/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
      } else {
        await communityApi.sendMessage({ receiverId: targetId, subject: subject || "Message", content: newMessage });
      }

      toast.success("Message sent!");
      setNewMessage(""); setSubject(""); setSelectedFiles([]);
      if (!userId) { setShowNewMessage(false); fetchConversation(targetId); }
      else { fetchConversation(userId); }
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Failed to send message");
    } finally { setSending(false); }
  };

  // ==================================================================
  //  File handling
  // ==================================================================

  const getFileUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `http://${window.location.hostname}:5000${url}`;
    }
    return `${window.location.origin}${url}`;
  };

  const handleFileSelect = (acceptType) => {
    const input = document.createElement("input");
    input.type = "file";
    if (acceptType === "camera") { input.accept = "image/*"; input.capture = "environment"; }
    else if (acceptType === "gallery") { input.accept = "image/*"; input.multiple = true; }
    else if (acceptType === "audio") { input.accept = "audio/*"; }
    else { input.accept = ".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls,.zip,.rar,.txt,.csv,.mp4,.webm,.mp3,.wav"; input.multiple = true; }
    input.onchange = (e) => {
      if (e.target.files) setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files)]);
      setShowAttachmentPicker(false);
    };
    input.click();
  };

  const removeSelectedFile = (index) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const openPreview = async (file) => {
    const fileUrl = getFileUrl(file.fileUrl);
    const isPdf = file.fileType === "application/pdf" || file.fileName?.endsWith(".pdf");
    const isDocx = file.fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.fileName?.endsWith(".docx");
    const isPptx = file.fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || file.fileName?.endsWith(".pptx");
    const isImage = file.fileType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName);
    const isVideo = file.fileType?.startsWith("video/") || /\.(mp4|webm|ogg)$/i.test(file.fileName);
    const isAudio = file.fileType?.startsWith("audio/") || /\.(mp3|wav|ogg)$/i.test(file.fileName);

    if (isImage || isVideo || isAudio) { window.open(fileUrl, "_blank"); return; }
    if (isPdf) { setPreviewFile({ url: fileUrl, name: file.fileName, type: "pdf" }); return; }
    if (isDocx) {
      try {
        const res = await fetch(fileUrl); const blob = await res.blob();
        setPreviewFile({ url: URL.createObjectURL(blob), name: file.fileName, type: "docx", blob });
      } catch { window.open(fileUrl, "_blank"); }
      return;
    }
    if (isPptx) {
      try {
        const res = await fetch(fileUrl); const blob = await res.blob();
        const zip = await JSZip.loadAsync(blob);
        const slideFiles = Object.keys(zip.files).filter((name) => name.match(/^ppt\/slides\/slide\d+\.xml$/)).sort();
        const slides = [];
        for (const sf of slideFiles) {
          const content = await zip.files[sf].async("text");
          const parser = new DOMParser(); const xml = parser.parseFromString(content, "text/xml");
          const texts = Array.from(xml.getElementsByTagName("*")).filter((el) => el.localName === "t").map((el) => el.textContent).filter(Boolean);
          if (texts.length > 0) slides.push({ name: sf.replace(/^.*\/slide(\d+)\.xml$/, "Slide $1"), texts });
        }
        setPreviewFile({ url: fileUrl, name: file.fileName, type: "pptx", slides });
      } catch { window.open(fileUrl, "_blank"); }
      return;
    }
    setPreviewFile({ url: fileUrl, name: file.fileName, type: "unsupported" });
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const res = await fetch(fileUrl); const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { window.open(fileUrl, "_blank"); }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await communityApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      toast.success("Message deleted");
    } catch (err) { toast.error(err.response?.data?.error || "Failed to delete message"); }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const res = await communityApi.toggleReaction(messageId, emoji);
      setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, reactions: res.data.reactions } : m));
    } catch (err) { console.error("Reaction error:", err); }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // ==================================================================
  //  WebRTC Call logic
  // ==================================================================

  const createPeerConnection = useCallback((targetId) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", { to: targetId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        if (event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        } else {
          let currentStream = remoteVideoRef.current.srcObject;
          if (!currentStream || !(currentStream instanceof MediaStream)) {
            currentStream = new MediaStream();
            remoteVideoRef.current.srcObject = currentStream;
          }
          currentStream.addTrack(event.track);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        cleanupCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket]);

  if (!user) return null;

  const startCall = async (type) => {
    if (!selectedUser || !socket) return;
    try {
      isCallerRef.current = true;
      isCallAnsweredRef.current = false;
      callStartTimeRef.current = null;
      setCallType(type);
      setCallPartner(selectedUser);
      setCallState("calling");

      const stream = await navigator.mediaDevices.getUserMedia(
        type === "video" ? { video: true, audio: true } : { audio: true }
      );
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const targetId = selectedUser._id || selectedUser.id;
      const pc = createPeerConnection(targetId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", {
        to: targetId,
        offer,
        callerName: user?.name,
        callType: type,
      });
    } catch (err) {
      console.error("Start call error:", err);
      toast.error("Could not start call. Check camera/mic permissions.");
      cleanupCall();
    }
  };

  const answerCall = async () => {
    if (!incomingCall || !socket) return;
    try {
      isCallerRef.current = false;
      isCallAnsweredRef.current = true;
      callStartTimeRef.current = Date.now();
      setCallType(incomingCall.callType);
      setCallState("active");

      const stream = await navigator.mediaDevices.getUserMedia(
        incomingCall.callType === "video" ? { video: true, audio: true } : { audio: true }
      );
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(incomingCall.from);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Flush queued candidates
      while (pendingIceCandidatesRef.current.length > 0) {
        const cand = pendingIceCandidatesRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
      }

      socket.emit("answer-call", { to: incomingCall.from, answer });

      const partnerUser = users.find((u) => u._id === incomingCall.from || u.id === incomingCall.from);
      setCallPartner(partnerUser || { name: incomingCall.callerName });
      setIncomingCall(null);
    } catch (err) {
      console.error("Answer call error:", err);
      toast.error("Failed to answer call.");
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (socket && incomingCall) {
      socket.emit("end-call", { to: incomingCall.from });
    }
    setIncomingCall(null);
    setCallState("idle");
  };

  const endCall = () => {
    const targetId = callPartner?._id || callPartner?.id || incomingCall?.from;
    if (socket && targetId) {
      socket.emit("end-call", { to: targetId });
    }
    cleanupCall();
    toast("Call ended");
  };

  const cleanupCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    // Calculate and log call details if we were the initiator (caller)
    if (isCallerRef.current && callPartner) {
      const partnerId = callPartner._id || callPartner.id;
      if (isCallAnsweredRef.current && callStartTimeRef.current) {
        const durationSec = Math.round((Date.now() - callStartTimeRef.current) / 1000);
        const mins = Math.floor(durationSec / 60).toString().padStart(2, "0");
        const secs = (durationSec % 60).toString().padStart(2, "0");
        const durationStr = `${mins}:${secs}`;
        
        communityApi.sendMessage({
          receiverId: partnerId,
          content: `📞 ${callType === "video" ? "Video" : "Audio"} call - ${durationStr}`
        }).then((res) => {
          setMessages((prev) => [...prev, res.data.message]);
        }).catch(console.error);
      } else {
        communityApi.sendMessage({
          receiverId: partnerId,
          content: `📞 Missed ${callType} call`
        }).then((res) => {
          setMessages((prev) => [...prev, res.data.message]);
        }).catch(console.error);
      }
    }

    // Reset flags
    isCallerRef.current = false;
    isCallAnsweredRef.current = false;
    callStartTimeRef.current = null;

    setCallState("idle");
    setCallPartner(null);
    setIncomingCall(null);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => { t.enabled = isCameraOff; });
      setIsCameraOff(!isCameraOff);
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;

        const videoTrack = stream.getVideoTracks()[0];
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
        } else {
          peerConnectionRef.current.addTrack(videoTrack, stream);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        videoTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.error("Screen share error:", err);
      toast.error("Failed to share screen.");
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    const webcamTrack = localStream ? localStream.getVideoTracks()[0] : null;
    const senders = peerConnectionRef.current ? peerConnectionRef.current.getSenders() : [];
    const videoSender = senders.find((s) => s.track && s.track.kind === "video");

    if (videoSender) {
      videoSender.replaceTrack(webcamTrack || null);
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    setIsScreenSharing(false);
  };

  // ==================================================================
  //  Derived
  // ==================================================================

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const teachers = users.filter((u) => u.role === "teacher");

  const isMessagingLocked =
    user?.role === "student" &&
    selectedUser?.role === "teacher" &&
    !activeSlot;

  const pendingRequests = contactRequests.filter((r) => r.status === "pending");
  const myRequests = contactRequests.filter((r) => r.status !== "pending");

  // ==================================================================
  //  Render
  // ==================================================================

  const courseIdParam = searchParams.get("courseId");

  return (
    <div className="dashboard-container" style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {user?.role === "teacher" ? (
        <TeacherSidebar currentPage="community" courseId={courseIdParam} />
      ) : (
        <StudentSidebar currentPage="community" courseId={courseIdParam} />
      )}
      <div className="messages-container" style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
      {/* ===== Header ===== */}
      <div className="messages-header">
        <button className="back-btn" onClick={() => navigate("/community")}>
          <FiArrowLeft size={20} /> Back to Community
        </button>
        <h1>💬 Messages</h1>
      </div>

      {/* ===== Tab bar ===== */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "24px",
        padding: "6px",
        background: "#e2e8f0",
        borderRadius: "12px",
        width: "fit-content",
      }}>
        <button
          onClick={() => setActiveTab("messages")}
          style={{
            padding: "10px 24px",
            background: activeTab === "messages" ? "white" : "transparent",
            color: activeTab === "messages" ? "var(--pastel-blue-deep)" : "#475569",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "14px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: activeTab === "messages" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          <FiMessageSquare size={16} /> Messages
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          style={{
            padding: "10px 24px",
            background: activeTab === "requests" ? "white" : "transparent",
            color: activeTab === "requests" ? "var(--pastel-blue-deep)" : "#475569",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "14px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: activeTab === "requests" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.2s ease",
            position: "relative",
          }}
        >
          <FiInbox size={16} /> Contact Requests
          {user?.role === "teacher" && pendingRequests.length > 0 && (
            <span style={{
              position: "absolute",
              top: "-4px", right: "-4px",
              background: "#ef4444",
              color: "#fff",
              borderRadius: "50%",
              width: 18, height: 18,
              fontSize: 10, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 5px rgba(239,68,68,0.3)"
            }}>{pendingRequests.length}</span>
          )}
        </button>
      </div>

      {/* ===== MESSAGES TAB ===== */}
      {activeTab === "messages" && (
        <div className="messages-wrapper">
          {/* Sidebar */}
          <div className="users-sidebar">
            <div className="users-header">
              <h3>Conversations</h3>
              <button className="new-message-btn" onClick={() => { setShowNewMessage(true); setSelectedUser(null); }}>
                + New
              </button>
            </div>
            <div className="search-users">
              <FiSearch size={16} />
              <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="users-list">
              {filteredUsers.map((u) => (
                <div key={u._id} className={`user-item ${userId === u._id ? "active" : ""}`}
                  onClick={() => { navigate(`/community/messages/${u._id}`); setSelectedUser(u); setShowNewMessage(false); u.unreadCount = 0; }}
                >
                  <div className="user-avatar-wrapper" style={{ position: "relative" }}>
                    <div className="user-avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {u.profilePicture ? (
                        <img src={u.profilePicture} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                      ) : <FiUser size={20} />}
                    </div>
                    {onlineUsers.includes(u._id || u.id) && (
                      <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", backgroundColor: "#10b981", border: "1.5px solid var(--bg-card)", zIndex: 2 }} title="Online" />
                    )}
                    {u.unreadCount > 0 && <span className="user-unread-badge">{u.unreadCount}</span>}
                  </div>
                  <div className="user-info" style={{ minWidth: 0 }}>
                    <div className="user-info-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "8px" }}>
                        {u.name}
                      </strong>
                      {u.lastMessageTime && (
                        <span className="last-msg-time" style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {new Date(u.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="user-info-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: "4px" }}>
                      <span className="user-role" style={{ 
                        fontSize: "9px", 
                        color: u.role?.toLowerCase() === "teacher" ? "#b45309" : "#0369a1", 
                        background: u.role?.toLowerCase() === "teacher" ? "#fef3c7" : "#e0f2fe",
                        fontWeight: 700, 
                        textTransform: "uppercase", 
                        padding: "2px 6px", 
                        borderRadius: "4px",
                        flexShrink: 0
                      }}>
                        {u.role}
                      </span>
                      {u.lastMessageContent && (
                        <span className="last-msg-snippet" style={{ 
                          fontSize: "12px", 
                          color: "#64748b", 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          maxWidth: "130px",
                          marginLeft: "8px"
                        }}>
                          {u.lastMessageContent}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && <div className="no-users"><p>No users found</p></div>}
            </div>
          </div>

          {/* Chat area */}
          <div className="chat-area">
            {userId || selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="chat-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <div className="chat-user" onClick={() => setShowEmail(!showEmail)} style={{ cursor: "pointer" }} title="Click to toggle email address">
                    <div className="chat-user-avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {selectedUser?.profilePicture ? (
                        <img src={selectedUser.profilePicture} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                      ) : <FiUser size={24} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong>{selectedUser?.name}</strong>
                        {onlineUsers.includes(selectedUser?._id || selectedUser?.id) && (
                          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }} title="Online" />
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>{selectedUser?.role}</span>
                        {selectedUser?.email && (
                          <span style={{ fontSize: "11px", color: "var(--pastel-blue-deep)", background: "var(--pastel-blue-soft)", padding: "1px 8px", borderRadius: "10px", fontWeight: "500", display: showEmail ? "inline-block" : "none" }}>
                            {selectedUser.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header action buttons */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {/* Call buttons — only show when not locked */}
                    {!isMessagingLocked && (
                      <>
                        <button
                          onClick={() => startCall("audio")}
                          title="Voice Call"
                          style={{ padding: "8px", background: "rgba(16,185,129,0.1)", border: "1px solid #10b981", color: "#10b981", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <FiPhone size={16} />
                        </button>
                        <button
                          onClick={() => startCall("video")}
                          title="Video Call"
                          style={{ padding: "8px", background: "rgba(99,102,241,0.1)", border: "1px solid #6366f1", color: "#6366f1", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <FiVideo size={16} />
                        </button>
                      </>
                    )}

                    {/* Suspend button (teacher/admin) */}
                    {(user?.role === "teacher" || user?.role === "admin") && selectedUser?.role === "student" && (
                      <button
                        type="button"
                        style={{ padding: "8px 14px", backgroundColor: "transparent", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.2s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.05)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                        onClick={async () => {
                          if (window.confirm(`Suspend ${selectedUser?.name}?`)) {
                            try {
                              await api.post(`/auth/users/${selectedUser?._id || selectedUser?.id}/block`);
                              toast.success(`${selectedUser?.name} suspended.`);
                            } catch (err) { toast.error(err.response?.data?.error || "Failed to block user."); }
                          }
                        }}
                      >
                        <FiSlash size={14} /> Suspend User
                      </button>
                    )}
                  </div>
                </div>

                {/* Messaging Locked Banner */}
                {isMessagingLocked && (
                  <div style={{
                    margin: "12px 16px",
                    padding: "16px 20px",
                    background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "12px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}>
                    <FiAlertCircle size={20} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: "#ef4444", fontSize: "14px" }}>Messaging Restricted</p>
                      <p style={{ margin: "4px 0 8px", color: "var(--text-secondary)", fontSize: "13px" }}>
                        You can only message or call this teacher during your approved scheduled time slot.
                        Please send a contact request or wait for your scheduled slot to open.
                      </p>
                      <button onClick={() => setActiveTab("requests")} style={{ padding: "6px 14px", background: "var(--pastel-blue-primary)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                        Go to Contact Requests →
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages list */}
                <div className="chat-messages">
                  {loading ? (
                    <div className="loading-state"><div className="loading-spinner"></div></div>
                  ) : messages.length === 0 ? (
                    <div className="empty-chat"><FiMessageSquare size={48} /><p>No messages yet</p></div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg._id} className={`message-bubble ${msg.sender?._id === (user?.id || user?._id) ? "sent" : "received"}`}>
                        <div className="message-bubble-header">
                          {msg.content ? <div className="message-content">{msg.content}</div> : null}
                          {msg.sender?._id === (user?.id || user?._id) && (
                            <button className="msg-delete-btn" onClick={() => handleDeleteMessage(msg._id)} title="Delete message">
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="message-attachments">
                            {msg.attachments.map((file, idx) => {
                              const isImage = file.fileType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName);
                              const isVideo = file.fileType?.startsWith("video/") || /\.(mp4|webm|ogg)$/i.test(file.fileName);
                              const isAudio = file.fileType?.startsWith("audio/") || /\.(mp3|wav|ogg)$/i.test(file.fileName);
                              const fileUrl = getFileUrl(file.fileUrl);
                              if (isImage) return (
                                <div key={idx} className="msg-attachment-item">
                                  <img src={fileUrl} alt={file.fileName} className="msg-attachment-image" onClick={() => window.open(fileUrl, "_blank")} />
                                  <div className="msg-attachment-actions">
                                    <button className="msg-attach-action-btn view-btn" onClick={() => openPreview(file)}>👁 View</button>
                                    <button className="msg-attach-action-btn download-btn" onClick={() => downloadFile(fileUrl, file.fileName)}>⬇ Save</button>
                                  </div>
                                </div>
                              );
                              if (isVideo) return (
                                <div key={idx} className="msg-attachment-item">
                                  <video src={fileUrl} controls className="msg-attachment-video" />
                                  <div className="msg-attachment-actions">
                                    <button className="msg-attach-action-btn download-btn" onClick={() => downloadFile(fileUrl, file.fileName)}>⬇ Save</button>
                                  </div>
                                </div>
                              );
                              if (isAudio) return (
                                <div key={idx} className="msg-attachment-item">
                                  <audio src={fileUrl} controls className="msg-attachment-audio" />
                                  <div className="msg-attachment-actions">
                                    <button className="msg-attach-action-btn download-btn" onClick={() => downloadFile(fileUrl, file.fileName)}>⬇ Save</button>
                                  </div>
                                </div>
                              );
                              return (
                                <div key={idx} className="msg-attachment-item">
                                  <div className="msg-attachment-file">
                                    <FiFile size={18} />
                                    <span className="msg-file-name">{file.fileName}</span>
                                    <span className="msg-file-type">{(file.fileType || "document").split("/").pop()}</span>
                                  </div>
                                  <div className="msg-attachment-actions">
                                    <button className="msg-attach-action-btn view-btn" onClick={() => openPreview(file)}>👁 View</button>
                                    <button className="msg-attach-action-btn download-btn" onClick={() => downloadFile(fileUrl, file.fileName)}>⬇ Save</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="msg-reactions">
                            {quickEmojis.map((emoji) => {
                              const count = msg.reactions.filter((r) => r.emoji === emoji).length;
                              const hasReacted = msg.reactions.some((r) => r.emoji === emoji && (r.user === user?.id || r.user === user?._id || r.user?._id === user?.id));
                              return count > 0 ? (
                                <button key={emoji} className={`msg-reaction-badge ${hasReacted ? "reacted" : ""}`} onClick={() => handleToggleReaction(msg._id, emoji)}>
                                  {emoji} {count}
                                </button>
                              ) : null;
                            })}
                          </div>
                        )}
                        <div className="msg-reaction-row">
                          {quickEmojis.map((emoji) => (
                            <button key={emoji} className="msg-reaction-btn" onClick={() => handleToggleReaction(msg._id, emoji)} title={emoji}>{emoji}</button>
                          ))}
                        </div>
                        <div className="message-time">{new Date(msg.createdAt).toLocaleTimeString()}</div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                {!isMessagingLocked && (
                  <div className="message-input-wrapper">
                    {selectedFiles.length > 0 && (
                      <div className="selected-files-preview">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="selected-file-chip">
                            {file.type?.startsWith("image/") ? (
                              <img src={URL.createObjectURL(file)} alt="" className="file-chip-thumb" />
                            ) : <FiFile size={16} />}
                            <span className="file-chip-name">{file.name}</span>
                            <button type="button" className="file-chip-remove" onClick={() => removeSelectedFile(idx)}><FiX size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {showAttachmentPicker && (
                      <div className="attachment-picker">
                        <button type="button" className="attach-option" onClick={() => handleFileSelect("gallery")}><FiImage size={20} /> Gallery</button>
                        <button type="button" className="attach-option" onClick={() => handleFileSelect("camera")}><FiCamera size={20} /> Camera</button>
                        <button type="button" className="attach-option" onClick={() => handleFileSelect("document")}><FiFile size={20} /> Document</button>
                        <button type="button" className="attach-option" onClick={() => handleFileSelect("audio")}><FiMic size={20} /> Audio</button>
                      </div>
                    )}
                    <form className="message-input-form" onSubmit={handleSendMessage}>
                      <button type="button" className="attach-btn" onClick={() => setShowAttachmentPicker(!showAttachmentPicker)}>
                        <FiPaperclip size={20} />
                      </button>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                      />
                      <button type="submit" disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}>
                        <FiSend size={20} />
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-chat" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px", padding: "40px 24px", textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #7EC8E3 0%, #3B8DB3 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(59,141,179,0.25)" }}>
                  <FiMessageSquare size={32} color="#fff" />
                </div>
                <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>Community Hub</h3>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)", maxWidth: 280, lineHeight: 1.6 }}>
                  Connect, collaborate, and communicate with everyone in your academic community. Select a conversation from the left to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CONTACT REQUESTS TAB ===== */}
      {activeTab === "requests" && (
        <div style={{ padding: "28px", maxWidth: "920px", margin: "0 auto", width: "100%" }}>
          {/* STUDENT: Send request form */}
          {user?.role === "student" && (
            <div
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
                borderRadius: "20px",
                padding: "32px",
                marginBottom: "32px",
                boxShadow: "0 10px 30px rgba(59, 141, 179, 0.08)",
                border: "1.5px solid #b1d4e5",
                transition: "transform 0.2s ease, box-shadow 0.2s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", borderBottom: "1px dashed rgba(59,141,179,0.2)", paddingBottom: "18px" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #3B8DB3 0%, #2563eb 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "24px",
                    boxShadow: "0 6px 16px rgba(37,99,235,0.25)"
                  }}
                >
                  <FiRequestSend />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#1e3a5f", letterSpacing: "-0.3px" }}>
                    Request Teacher Contact
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "var(--text-secondary)" }}>
                    Submit a formal inquiry or schedule a 1-on-1 consultation window with your teacher.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendContactRequest} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13.5px", fontWeight: 700, color: "#1e3a5f" }}>
                      Select Instructor / Teacher <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={crTeacherId}
                      onChange={(e) => setCrTeacherId(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "13px 18px",
                        borderRadius: "12px",
                        border: "1.5px solid #b1d4e5",
                        background: "#ffffff",
                        color: "var(--text-primary)",
                        fontSize: "14px",
                        fontWeight: 500,
                        outline: "none",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                        transition: "all 0.2s"
                      }}
                    >
                      <option value="">— Choose a teacher —</option>
                      {teachers.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} {t.department ? `(${t.department})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13.5px", fontWeight: 700, color: "#1e3a5f" }}>
                      Subject / Course Title <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={crSubject}
                      onChange={(e) => setCrSubject(e.target.value)}
                      placeholder="e.g. Mathematics, Web Development"
                      required
                      style={{
                        width: "100%",
                        padding: "13px 18px",
                        borderRadius: "12px",
                        border: "1.5px solid #b1d4e5",
                        background: "#ffffff",
                        color: "var(--text-primary)",
                        fontSize: "14px",
                        fontWeight: 500,
                        outline: "none",
                        boxSizing: "border-box",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                        transition: "all 0.2s"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "13.5px", fontWeight: 700, color: "#1e3a5f" }}>
                    Topic / Discussion Reason
                  </label>
                  <textarea
                    value={crTopic}
                    onChange={(e) => setCrTopic(e.target.value)}
                    placeholder="Describe what topic, assignment, or query you would like to discuss with your teacher..."
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "13px 18px",
                      borderRadius: "12px",
                      border: "1.5px solid #b1d4e5",
                      background: "#ffffff",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                      fontWeight: 500,
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                      transition: "all 0.2s"
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                  <button
                    type="submit"
                    disabled={crSending}
                    style={{
                      padding: "13px 32px",
                      background: "linear-gradient(135deg, #3B8DB3 0%, #2563eb 100%)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      fontWeight: 700,
                      fontSize: "14.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      boxShadow: "0 6px 18px rgba(37,99,235,0.3)",
                      opacity: crSending ? 0.7 : 1,
                      transition: "all 0.2s ease"
                    }}
                  >
                    <FiRequestSend size={18} /> {crSending ? "Sending Request..." : "Send Contact Request"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TEACHER: Pending requests */}
          {user?.role === "teacher" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", fontSize: "18px" }}>
                  <FiInbox size={22} color="#3B8DB3" /> Incoming Contact Requests
                </h3>
                {pendingRequests.length > 0 && (
                  <span style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "20px", padding: "4px 14px", fontSize: "12px", fontWeight: 700 }}>
                    {pendingRequests.length} pending
                  </span>
                )}
              </div>
              {crLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>Loading requests...</div>
              ) : pendingRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
                  <FiInbox size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>No pending contact requests</p>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req._id}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderLeft: "5px solid #f59e0b",
                      borderRadius: "16px",
                      padding: "22px",
                      marginBottom: "16px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.04)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                      <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                        {req.student?.profilePicture ? (
                          <img 
                            src={req.student.profilePicture} 
                            alt="Profile" 
                            style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--border-color)" }} 
                          />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #3B8DB3, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
                            {req.student?.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: "16px", color: "var(--text-primary)" }}>{req.student?.name}</p>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>{req.student?.email}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: "12px", background: "rgba(245,158,11,0.12)", color: "#d97706", border: "1px solid rgba(245,158,11,0.25)", padding: "4px 14px", borderRadius: "20px", fontWeight: 700 }}>
                        🕐 Pending Approval
                      </span>
                    </div>

                    <div style={{ padding: "14px 16px", background: "var(--bg-secondary)", borderRadius: "12px", marginBottom: "16px" }}>
                      <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <FiBookOpen size={16} color="#3B8DB3" />
                        {req.subject}
                      </p>
                      {req.topic && <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{req.topic}</p>}
                    </div>
                    <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--text-muted)" }}>
                      Submitted on: {new Date(req.createdAt).toLocaleString()}
                    </p>

                    {respondingId === req._id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "rgba(59,141,179,0.06)", borderRadius: "12px", border: "1px solid rgba(59,141,179,0.2)" }}>
                        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>📅 Set Schedule Window</p>
                        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)", fontWeight: 600 }}>Start Time</label>
                            <input
                              type="datetime-local"
                              value={scheduleStart}
                              onChange={(e) => setScheduleStart(e.target.value)}
                              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "13px", boxSizing: "border-box" }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)", fontWeight: 600 }}>End Time</label>
                            <input
                              type="datetime-local"
                              value={scheduleEnd}
                              onChange={(e) => setScheduleEnd(e.target.value)}
                              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "13px", boxSizing: "border-box" }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                          <button onClick={() => handleRespondToRequest(req._id, "accepted")} style={{ padding: "10px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            <FiCheck size={16} /> Accept & Schedule
                          </button>
                          <button onClick={() => { setRespondingId(null); setScheduleStart(""); setScheduleEnd(""); }} style={{ padding: "10px 18px", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={() => setRespondingId(req._id)} style={{ padding: "10px 22px", background: "#10b981", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                          <FiCheck size={16} /> Accept
                        </button>
                        <button onClick={() => handleRespondToRequest(req._id, "rejected")} style={{ padding: "10px 18px", background: "transparent", color: "#ef4444", border: "1.5px solid #ef4444", borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                          <FiX size={16} /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {/* All requests (both roles) — history */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "32px", marginBottom: "16px" }}>
            <FiClock size={22} color="#3B8DB3" />
            <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "18px", fontWeight: 700 }}>
              {user?.role === "student" ? "My Contact Requests" : "Request History"}
            </h3>
          </div>

          {crLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>Loading requests...</div>
          ) : contactRequests.filter((r) => user?.role === "teacher" ? r.status !== "pending" : true).length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
              <p style={{ margin: 0, fontSize: "14px" }}>No contact requests found.</p>
            </div>
          ) : (
            contactRequests
              .filter((r) => user?.role === "teacher" ? r.status !== "pending" : true)
              .map((req) => {
                const statusColor = { pending: "#f59e0b", accepted: "#10b981", rejected: "#ef4444" };
                const statusLabel = { pending: "🕐 Pending", accepted: "✅ Accepted", rejected: "❌ Declined" };
                const statusBg = { pending: "rgba(245,158,11,0.12)", accepted: "rgba(16,185,129,0.12)", rejected: "rgba(239,68,68,0.12)" };
                const otherPerson = user?.role === "student" ? req.teacher : req.student;
                return (
                  <div
                    key={req._id}
                    style={{
                      background: "var(--bg-card)",
                      border: `1px solid var(--border-color)`,
                      borderLeft: `5px solid ${statusColor[req.status]}`,
                      borderRadius: "16px",
                      padding: "20px 24px",
                      marginBottom: "14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "16px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "260px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3B8DB3, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                          {otherPerson?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>{otherPerson?.name}</span>
                          <span style={{ marginLeft: "8px", fontSize: "11px", background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                            {user?.role === "student" ? "Teacher" : "Student"}
                          </span>
                        </div>
                      </div>

                      <div style={{ margin: "10px 0", padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: "10px" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <FiBookOpen size={15} color="#3B8DB3" />
                          {req.subject}
                        </p>
                        {req.topic && <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{req.topic}</p>}
                      </div>

                      {req.status === "accepted" && req.scheduleStart && (
                        <div style={{ marginTop: "8px", padding: "8px 12px", background: "rgba(16,185,129,0.08)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)" }}>
                          <p style={{ margin: 0, fontSize: "12px", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                            🗓️ Scheduled Window: {new Date(req.scheduleStart).toLocaleString()} – {new Date(req.scheduleEnd).toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                      <span
                        style={{
                          padding: "6px 16px",
                          borderRadius: "20px",
                          background: statusBg[req.status],
                          color: statusColor[req.status],
                          border: `1px solid ${statusColor[req.status]}33`,
                          fontSize: "12px",
                          fontWeight: 700
                        }}
                      >
                        {statusLabel[req.status]}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* ===== File Preview Modal ===== */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => { setPreviewFile(null); if (previewFile.url?.startsWith("blob:")) URL.revokeObjectURL(previewFile.url); }}>
          <div className="modal-container preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
            <div className="modal-header">
              <h2>{previewFile.name}</h2>
              <button className="close-btn" onClick={() => { setPreviewFile(null); if (previewFile.url?.startsWith("blob:")) URL.revokeObjectURL(previewFile.url); }}><FiX size={20} /></button>
            </div>
            <div className="preview-body" style={{ padding: "16px", minHeight: "300px", maxHeight: "70vh", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewFile.type === "pdf" ? (
                <embed src={previewFile.url} type="application/pdf" style={{ width: "100%", height: "70vh", borderRadius: "8px" }} />
              ) : previewFile.type === "docx" ? (
                <div ref={docxContainerRef} className="docx-preview-container" />
              ) : previewFile.type === "pptx" && previewFile.slides ? (
                <div className="pptx-preview-container">
                  {previewFile.slides.map((slide, i) => (
                    <div key={i} className="pptx-slide">
                      <div className="pptx-slide-header">{slide.name}</div>
                      {slide.texts.map((t, j) => <p key={j} className="pptx-slide-text">{t}</p>)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="unsupported-preview">
                  <FiFile size={48} />
                  <p>Preview not available for this file type.</p>
                  <p className="unsupported-hint">Use <strong>Download</strong> to save the file.</p>
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ padding: "0 16px 16px" }}>
              {previewFile.url && <button className="btn-primary" onClick={() => downloadFile(previewFile.url, previewFile.name)}>⬇ Download</button>}
              <button className="btn-secondary" onClick={() => { setPreviewFile(null); if (previewFile.url?.startsWith("blob:")) URL.revokeObjectURL(previewFile.url); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Incoming Call Modal ===== */}
      {callState === "incoming" && incomingCall && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "24px", padding: "40px", textAlign: "center", maxWidth: "340px", width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", border: "1px solid var(--border-color)" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>
              {incomingCall.callType === "video" ? "📹" : "📞"}
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px" }}>{incomingCall.callerName}</h3>
            <p style={{ margin: "0 0 28px", color: "var(--text-secondary)", fontSize: "14px" }}>
              Incoming {incomingCall.callType} call...
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
              <button onClick={rejectCall} style={{ width: 60, height: 60, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(239,68,68,0.5)" }}>
                <FiPhoneOff size={24} />
              </button>
              <button onClick={answerCall} style={{ width: 60, height: 60, borderRadius: "50%", background: "#10b981", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(16,185,129,0.5)" }}>
                <FiPhone size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Outgoing Call / Active Call Modal ===== */}
      {(callState === "calling" || callState === "active") && (
        <div style={{ position: "fixed", inset: 0, background: "#0a0a1a", zIndex: 9998, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {/* Video streams */}
          {callType === "video" && (
            <div style={{ position: "relative", width: "100%", maxWidth: "900px", height: "70vh", background: "#111", borderRadius: "20px", overflow: "hidden", marginBottom: "24px" }}>
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <video ref={localVideoRef} autoPlay playsInline muted style={{ position: "absolute", bottom: 16, right: 16, width: 160, height: 120, objectFit: "cover", borderRadius: "12px", border: "2px solid rgba(255,255,255,0.3)" }} />
              {callState === "calling" && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#fff", background: "rgba(0,0,0,0.6)" }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 16 }}>
                    {callPartner?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <h2 style={{ margin: "0 0 8px" }}>{callPartner?.name}</h2>
                  <p style={{ margin: 0, opacity: 0.7, fontSize: "14px" }}>Calling...</p>
                </div>
              )}
            </div>
          )}

          {callType === "audio" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "40px", color: "#fff" }}>
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, marginBottom: 20, boxShadow: "0 0 0 20px rgba(99,102,241,0.15), 0 0 0 40px rgba(99,102,241,0.07)" }}>
                {callPartner?.name?.charAt(0).toUpperCase() || "?"}
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: "24px" }}>{callPartner?.name}</h2>
              <p style={{ margin: 0, opacity: 0.6, fontSize: "15px" }}>{callState === "calling" ? "Calling..." : "Call in progress"}</p>
              <audio ref={remoteVideoRef} autoPlay />
            </div>
          )}

          {/* Call controls */}
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <button onClick={toggleMute} style={{ width: 56, height: 56, borderRadius: "50%", background: isMuted ? "#ef4444" : "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", transition: "all 0.2s" }} title={isMuted ? "Unmute" : "Mute"}>
              <FiMic size={22} />
            </button>
            {callType === "video" && (
              <button onClick={toggleCamera} style={{ width: 56, height: 56, borderRadius: "50%", background: isCameraOff ? "#ef4444" : "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", transition: "all 0.2s" }} title={isCameraOff ? "Turn camera on" : "Turn camera off"}>
                <FiVideo size={22} />
              </button>
            )}
            {callType === "video" && (
              <button 
                onClick={toggleScreenShare} 
                style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: "50%", 
                  background: isScreenSharing ? "#10b981" : "rgba(255,255,255,0.15)", 
                  border: "none", 
                  color: "#fff", 
                  cursor: "pointer", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  backdropFilter: "blur(8px)", 
                  transition: "all 0.2s" 
                }} 
                title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
              >
                <FiMonitor size={22} />
              </button>
            )}
            <button onClick={endCall} style={{ width: 68, height: 68, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(239,68,68,0.6)" }} title="End call">
              <FiPhoneOff size={28} />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
