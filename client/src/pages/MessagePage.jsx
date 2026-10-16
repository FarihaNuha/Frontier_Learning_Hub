import SkeletonLoader from "../components/SkeletonLoader";
import { renderWordPreview } from "../services/wordPreview";
import { mergeMessages, cachedConversation, rememberConversation } from "../services/chatState";
import { Capacitor } from "@capacitor/core";
import FittedDocument from "../components/FittedDocument";
import { absoluteFileUrl } from "../services/urls";
import { downloadFile as saveDownload, openFile } from "../services/nativeFiles";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { communityApi } from "../services/communityApi";
import api from "../services/api";
import { useCall } from "../contexts/CallContext";
import { clearChatNotification, setChatNotificationContext, getChatNotificationSettings, setChatMuted } from "../services/chatNotifications";
import TeacherSidebar from "../components/TeacherSidebar";
import StudentSidebar from "../components/StudentSidebar";
import toast from "react-hot-toast";
import {
  FiDownload,
  FiEye,
  FiBell,
  FiBellOff,
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
  FiPhone,
  FiVideo,
  FiClock,
  FiCheck,
  FiAlertCircle,
  FiSend as FiRequestSend,
  FiInbox,
  FiBookOpen,
  FiCalendar,
} from "react-icons/fi";
import "../styles/community.css";
import "../styles/chat-actions.css";

export default function MessagePage() {
  const { userId } = useParams();
  const { user, socket, onlineUsers } = useAuth();
  const navigate = useNavigate();

  // ---- messaging state ----
  const [users, setUsers] = useState([]);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [usersOffset, setUsersOffset] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [contactTeachers, setContactTeachers] = useState([]);
  const usersRequest = useRef(0);
  const firstSearch = useRef(true);
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
  const [actionMessage, setActionMessage] = useState(null);
  const [replying, setReplying] = useState(null);
  const [editing, setEditing] = useState(null);
  const [forwarding, setForwarding] = useState(null);
  const [forwardTarget, setForwardTarget] = useState("");
  const sendId = useRef(null);
  const pendingSends = useRef(new Map());
  const deliveredEvents = useRef(new Set());
  const conversationRequest = useRef(0);
  const [olderCursor, setOlderCursor] = useState(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const preserveScroll = useRef(false);
  const lastRenderedMessage = useRef(null);
  const chatId = userId || selectedUser?._id || selectedUser?.id;
  const [muteSettings, setMuteSettings] = useState(null);
  const [changingMute, setChangingMute] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setMuteSettings(null);
    const refresh = () => getChatNotificationSettings(chatId).then(settings => {
      if (!cancelled) setMuteSettings(settings.supported ? settings : null);
    });
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", refresh); };
  }, [chatId]);
  const toggleChatMute = async () => {
    if (changingMute || !muteSettings) return;
    const target = chatId;
    const next = !muteSettings.muted;
    setChangingMute(true);
    try {
      await setChatMuted(target, next);
      if (String(activeChatRef.current) === String(target)) setMuteSettings({ supported: true, muted: next });
      toast.success(next ? "Message notifications muted on this phone until you unmute" : "Message notifications unmuted");
    } catch { toast.error("Could not change notification settings. Update the app and try again."); }
    finally { setChangingMute(false); }
  };
  const ownMessage = msg => String(msg.sender?._id || msg.sender) === String(user?.id || user?._id);
  useEffect(() => {
    setReplying(null); setEditing(null); setActionMessage(null); sendId.current = null;
    const visible = event => {
      setChatNotificationContext(document.visibilityState === "visible" ? chatId || "" : "");
      if (event && chatId && document.visibilityState === "visible") {
        fetchConversation(chatId);
      }
    };
    visible(); document.addEventListener("visibilitychange", visible);
    return () => { document.removeEventListener("visibilitychange", visible); setChatNotificationContext(""); };
  }, [chatId]);

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

  const { startCall: beginCall } = useCall();
  const startCall = type => selectedUser && beginCall(selectedUser, type);
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(null);
  activeChatRef.current = userId || selectedUser?._id || selectedUser?.id;
  const docxContainerRef = useRef(null);
  const quickEmojis = ["❤️", "👍", "😂", "😮", "😢", "😡"];

  // ==================================================================
  //  Lifecycle
  // ==================================================================

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchContactRequests();
    }
  }, [user?.id, user?._id]);

  useEffect(() => {
    if (user && userId) {
      fetchConversation(userId);
      setShowNewMessage(false);
    }
  }, [userId, user?.id, user?._id]);

  useEffect(() => { lastRenderedMessage.current = null; }, [chatId]);
  useEffect(() => {
    const last = messages.at(-1), previousId = lastRenderedMessage.current;
    lastRenderedMessage.current = last?._id;
    if (preserveScroll.current) { preserveScroll.current = false; return; }
    const box = document.querySelector(".chat-messages");
    const nearBottom = !box || box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    if (last && last._id !== previousId && (!previousId || ownMessage(last) || nearBottom)) scrollToBottom();
  }, [messages]);
  useEffect(() => {
    if (chatId && selectedUser && String(selectedUser._id || selectedUser.id) === String(chatId)) rememberConversation(user?.id || user?._id, chatId, { user: selectedUser, messages, nextCursor: olderCursor, hasMore: hasOlder });
  }, [messages, selectedUser, chatId, olderCursor, hasOlder, user?.id, user?._id]);

  useEffect(() => {
    if (firstSearch.current) { firstSearch.current = false; return; }
    const timer = setTimeout(() => fetchUsers(), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  useEffect(() => {
    if (activeTab === "requests" && user?.role === "student") communityApi.getUsers({ role: "teacher" }).then(res => setContactTeachers(res.data.users || [])).catch(console.error);
  }, [activeTab, user?.role]);

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
    let usersRefresh;

    const handleNewMessage = (data) => {
      const msg = data.message;
      if (deliveredEvents.current.has(msg._id)) return;
      deliveredEvents.current.add(msg._id);
      if (deliveredEvents.current.size > 200) deliveredEvents.current.delete(deliveredEvents.current.values().next().value);
      const peerId = String(msg.sender?._id || msg.sender) === String(user?.id || user?._id) ? String(msg.receiver?._id || msg.receiver) : String(msg.sender?._id || msg.sender);
      setUsers(previous => previous.map(person => String(person._id) === peerId ? { ...person, lastMessageTime: msg.createdAt, lastMessageContent: msg.content, unreadCount: peerId === String(activeChatRef.current) ? 0 : (person.unreadCount || 0) + (String(msg.receiver?._id || msg.receiver) === String(user?.id || user?._id) ? 1 : 0) } : person).sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0)));
      const currentActiveId = userId || (selectedUser && (selectedUser._id || selectedUser.id));
      const msgSenderId = msg.sender?._id || msg.sender;
      const msgReceiverId = msg.receiver?._id || msg.receiver;
      if ((msgSenderId === currentActiveId) || (msgReceiverId === currentActiveId)) {
        setMessages(previous => mergeMessages(previous, [{ ...msg, delivery: undefined }]));
        if (document.visibilityState === "visible" && String(msgReceiverId) === String(user?.id || user?._id)) {
          communityApi.readMessages(currentActiveId, [msg._id]).then(res => clearChatNotification(currentActiveId, res.data.readThrough)).catch(console.error);
        }
      }
    };

    const handleReaction = (data) => {
      setMessages((prev) =>
        prev.map((m) => m._id === data.messageId ? { ...m, reactions: data.reactions } : m)
      );
    };

    const handleNewContactRequest = () => { fetchContactRequests(); };
    const handleContactRequestResponse = () => { fetchContactRequests(); };

    const updated = ({ message }) => setMessages(prev => prev.map(m => m._id === message._id ? { ...m, ...message, sender: m.sender, receiver: m.receiver } : m));
    const hidden = ({ messageId }) => setMessages(prev => prev.filter(m => m._id !== messageId));
    const read = ({ readerId, readAt, readThrough }) => setMessages(prev => prev.map(m => ownMessage(m) && String(m.receiver?._id || m.receiver) === String(readerId) && new Date(m.createdAt).getTime() <= (readThrough || new Date(readAt).getTime()) ? { ...m, isRead: true, readAt } : m));
    const cleared = ({ threadId, readThrough }) => clearChatNotification(threadId, readThrough);
    socket.on("messageUpdated", updated); socket.on("messageHidden", hidden); socket.on("messagesRead", read); socket.on("conversationRead", cleared);
    socket.on("newPrivateMessage", handleNewMessage);
    socket.on("messageReaction", handleReaction);
    socket.on("newContactRequest", handleNewContactRequest);
    socket.on("contactRequestResponse", handleContactRequestResponse);

    return () => {
      clearTimeout(usersRefresh);
      socket.off("messageUpdated", updated); socket.off("messageHidden", hidden); socket.off("messagesRead", read); socket.off("conversationRead", cleared);
      socket.off("newPrivateMessage", handleNewMessage);
      socket.off("messageReaction", handleReaction);
      socket.off("newContactRequest", handleNewContactRequest);
      socket.off("contactRequestResponse", handleContactRequestResponse);
    };
  }, [socket, userId, selectedUser]);

  useEffect(() => {
    if (previewFile?.type === "docx" && docxContainerRef.current && previewFile.blob) {
      return renderWordPreview(previewFile.blob, docxContainerRef.current, () => toast.error("Could not preview this document. Download it to open."));
    }
  }, [previewFile]);

  // ==================================================================
  //  Data fetching
  // ==================================================================

  const fetchUsers = async (append = false) => {
    const request = ++usersRequest.current;
    setLoadingUsers(true);
    try {
      const courseId = new URLSearchParams(window.location.search).get("courseId");
      const res = await communityApi.getUsers({ limit: 40, offset: append ? usersOffset : 0, q: searchTerm.trim(), ...(courseId ? { courseId } : {}) });
      if (request !== usersRequest.current) return;
      const people = (res.data.users || []).filter(person => String(person._id) !== String(user?.id || user?._id) && !["admin", "superadmin"].includes(person.role));
      setUsers(previous => append ? [...previous, ...people.filter(person => !previous.some(item => item._id === person._id))] : people);
      setHasMoreUsers(Boolean(res.data.hasMore)); setUsersOffset(res.data.nextOffset || 0);
    } catch (error) { console.error(error); }
    finally { if (request === usersRequest.current) setLoadingUsers(false); }
  };

  const fetchConversation = async (id, older = false) => {
    const requestId = ++conversationRequest.current;
    const owner = user?.id || user?._id;
    const cached = older ? null : cachedConversation(owner, id);
    if (cached) { setMessages(cached.messages); setSelectedUser(cached.user); setHasOlder(cached.hasMore); setOlderCursor(cached.nextCursor); }
    if (older) setLoadingOlder(true); else setLoading(!cached);
    const scrollBox = document.querySelector(".chat-messages");
    const oldHeight = scrollBox?.scrollHeight || 0;
    try {
      const res = await communityApi.getConversation(id, { limit: 40, ...(older ? { cursor: olderCursor } : {}) });
      if (requestId !== conversationRequest.current) return;
      if (older) {
        preserveScroll.current = true;
        setMessages(previous => mergeMessages(res.data.messages || [], previous));
        requestAnimationFrame(() => { if (scrollBox) scrollBox.scrollTop += scrollBox.scrollHeight - oldHeight; });
      } else {
        setMessages(previous => mergeMessages(res.data.messages || [], previous.filter(message => message.delivery && String(message.receiver?._id || message.receiver) === String(id))));
        clearChatNotification(id, res.data.readThrough);
        setUsers(previous => previous.map(person => String(person._id) === String(id) ? { ...person, unreadCount: 0 } : person));
        api.invalidateReadCache?.("/community/users");
      }
      setHasOlder(Boolean(res.data.hasMore)); setOlderCursor(res.data.nextCursor || null);
      setSelectedUser(res.data.user || users.find(person => String(person._id) === String(id)));
    } catch (error) {
      if (error.response?.status === 403) { toast.error("Messaging is not permitted."); navigate("/community/messages"); setSelectedUser(null); }
      else console.error(error);
    } finally { if (requestId === conversationRequest.current) { setLoading(false); setLoadingOlder(false); } }
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

  const deliverMessage = async draft => {
    if (draft.files.length) setSending(true);
    try {
      let saved;
      if (draft.files.length) {
        const body = new FormData();
        for (const [key, value] of Object.entries({ receiverId: draft.targetId, content: draft.content, subject: draft.subject, clientMessageId: draft.id, ...(draft.reply ? { replyTo: draft.reply._id } : {}) })) body.append(key, value);
        draft.files.forEach(file => body.append("files", file));
        saved = (await api.post("/community/messages", body)).data.message;
      } else {
        saved = (await communityApi.sendMessage({ receiverId: draft.targetId, subject: draft.subject, content: draft.content, replyTo: draft.reply?._id, clientMessageId: draft.id })).data.message;
      }
      pendingSends.current.delete(draft.id);
      if (saved && String(activeChatRef.current) === String(draft.targetId)) setMessages(previous => mergeMessages(previous, [{ ...saved, clientMessageId: draft.id, delivery: undefined }]));
    } catch (error) {
      if (String(activeChatRef.current) === String(draft.targetId)) setMessages(previous => previous.map(message => message.clientMessageId === draft.id ? { ...message, delivery: "failed" } : message));
      toast.error(error.response?.data?.error || "Message not sent. Tap Retry.");
    } finally { if (draft.files.length) setSending(false); }
  };
  const retryMessage = message => {
    const draft = pendingSends.current.get(message.clientMessageId);
    if (!draft) return;
    setMessages(previous => previous.map(item => item.clientMessageId === draft.id ? { ...item, delivery: "sending" } : item));
    deliverMessage(draft);
  };
  const handleSendMessage = async e => {
    e.preventDefault();
    if (sending || (!newMessage.trim() && !selectedFiles.length) || (!selectedUser && !userId)) return;
    if (editing) {
      try {
        const res = await communityApi.editMessage(editing._id, newMessage);
        setMessages(previous => previous.map(message => message._id === editing._id ? { ...message, content: res.data.message.content, editedAt: res.data.message.editedAt } : message));
        setEditing(null); setNewMessage("");
      } catch { toast.error("Could not edit message"); }
      return;
    }
    const draft = { id: crypto.randomUUID(), targetId: userId || selectedUser._id || selectedUser.id, content: newMessage.trim(), subject: subject || "Message", reply: replying, files: selectedFiles };
    pendingSends.current.set(draft.id, draft);
    setMessages(previous => mergeMessages(previous, [{ _id: `pending:${draft.id}`, clientMessageId: draft.id, sender: { _id: user?.id || user?._id }, receiver: draft.targetId,
      content: draft.content || `Uploading ${draft.files.length} attachment(s)…`, createdAt: new Date().toISOString(), delivery: "sending",
      replyPreview: draft.reply ? { senderName: draft.reply.sender?.name || "Message", content: draft.reply.content } : null }]));
    setNewMessage(""); setSubject(""); setSelectedFiles([]); setReplying(null); setShowNewMessage(false);
    await deliverMessage(draft);
  };

  // ==================================================================
  //  File handling
  // ==================================================================

  const getFileUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return absoluteFileUrl(url);
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

    if (isImage || isVideo || isAudio) { openFile({ url: fileUrl, fileName: file.fileName }); return; }
    if (isPdf && Capacitor.isNativePlatform()) { openFile({ url: fileUrl, fileName: file.fileName, mimeType: "application/pdf" }); return; }
    if (isPdf) { setPreviewFile({ url: fileUrl, name: file.fileName, type: "pdf" }); return; }
    if (isDocx) {
      try {
        const res = await fetch(fileUrl); if (!res.ok) throw new Error("File unavailable"); const blob = await res.blob();
        setPreviewFile({ url: URL.createObjectURL(blob), name: file.fileName, type: "docx", blob });
      } catch { openFile({ url: fileUrl, fileName: file.fileName }); }
      return;
    }
    if (isPptx) {
      try {
        const res = await fetch(fileUrl); if (!res.ok) throw new Error("File unavailable"); const blob = await res.blob();
        const { default: JSZip } = await import("jszip");
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
      } catch { openFile({ url: fileUrl, fileName: file.fileName }); }
      return;
    }
    setPreviewFile({ url: fileUrl, name: file.fileName, type: "unsupported" });
  };

  const downloadFile = (fileUrl, fileName) => saveDownload({ url: fileUrl, fileName });

  const handleDeleteMessage = async (messageId, scope = "everyone") => {
    if (!window.confirm(scope === "me" ? "Hide this message for you?" : "Delete this message for everyone?")) return;
    try {
      const res = await communityApi.deleteMessage(messageId, scope);
      setActionMessage(null);
      if (scope === "me") setMessages(prev => prev.filter(m => m._id !== messageId));
      else setMessages(prev => prev.map(m => m._id === messageId ? { ...m, ...res.data.message, sender: m.sender, receiver: m.receiver } : m));
      toast.success("Message deleted");
    } catch (err) { toast.error(err.response?.data?.error || "Failed to delete message"); }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const res = await communityApi.toggleReaction(messageId, emoji);
      setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, reactions: res.data.reactions } : m));
    } catch (err) { toast.error(err.response?.data?.error || "Could not react"); }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });



  // ==================================================================
  //  Derived
  // ==================================================================

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const teachers = contactTeachers.length ? contactTeachers : users.filter((u) => u.role === "teacher");

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
    <div className="dashboard-container" style={{ minHeight: "100vh", background: "#E8F4FD" }}>
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
        <h1>Messages</h1>
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
        <div className={`messages-wrapper ${userId || selectedUser ? "has-active-chat" : ""}`}>
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
                  <div className="user-info" style={{ minWidth: 0, flex: 1 }}>
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
                    {u.email && (
                      <div className="user-email-text" style={{ 
                        fontSize: "11.5px", 
                        color: userId === u._id ? "rgba(255, 255, 255, 0.85)" : "#64748b", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis", 
                        whiteSpace: "nowrap",
                        margin: "1px 0 3px 0",
                        fontWeight: 500
                      }} title={u.email}>
                        {u.email}
                      </div>
                    )}
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
                          color: userId === u._id ? "rgba(255,255,255,0.75)" : "#64748b", 
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
              {hasMoreUsers && <button className="btn-secondary" disabled={loadingUsers} onClick={() => fetchUsers(true)}>{loadingUsers ? "Loading…" : "Load more people"}</button>}
              {filteredUsers.length === 0 && <div className="no-users"><p>No users found</p></div>}
            </div>
          </div>

          {/* Chat area */}
          <div className="chat-area">
            {userId || selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="chat-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <button 
                    className="mobile-back-to-contacts-btn"
                    onClick={() => {
                      setSelectedUser(null);
                      navigate("/community/messages");
                    }}
                    aria-label="Back to conversations"
                  >
                    <FiArrowLeft size={20} />
                  </button>
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
                    {muteSettings && (
                      <button type="button" onClick={toggleChatMute} disabled={changingMute}
                        aria-label={muteSettings.muted ? "Unmute message notifications" : "Mute message notifications"}
                        aria-pressed={muteSettings.muted}
                        title={muteSettings.muted ? "Unmute messages on this phone" : "Mute messages on this phone"}
                        style={{ padding: 8, border: "1px solid #94a3b8", borderRadius: 8, color: muteSettings.muted ? "#b45309" : "#475569", background: "transparent", display: "flex", cursor: "pointer" }}>
                        {muteSettings.muted ? <FiBellOff size={16} /> : <FiBell size={16} />}
                      </button>
                    )}
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
                  {hasOlder && <button className="btn-secondary" disabled={loadingOlder} onClick={() => fetchConversation(chatId, true)}>{loadingOlder ? "Loading…" : "Load earlier messages"}</button>}
                  {loading ? (
                    <SkeletonLoader type="chat" />
                  ) : messages.length === 0 ? (
                    <div className="empty-chat"><FiMessageSquare size={48} /><p>No messages yet</p></div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg._id} className={`message-bubble ${ownMessage(msg) ? "sent" : "received"}`} onClick={e => { if (!msg.delivery && !e.target.closest("button,a,audio,video,img")) setActionMessage(msg); }} onContextMenu={e => { e.preventDefault(); if (!msg.delivery) setActionMessage(msg); }}>
                        {msg.forwarded && <small>Forwarded</small>}
                        {msg.replyPreview && <blockquote className="chat-quote"><strong>{msg.replyPreview.senderName}</strong><p>{msg.replyPreview.content}</p></blockquote>}
                        {msg.deletedAt && <em>This message was deleted</em>}
                        <div className="message-bubble-header">
                          {msg.content ? <div className="message-content">{msg.content}</div> : null}
                          <button className="msg-actions-btn" aria-label="Message actions" disabled={Boolean(msg.delivery)} onClick={() => setActionMessage(msg)}>•••</button>
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
                                  <img src={fileUrl} alt={file.fileName} className="msg-attachment-image" onClick={() => openFile({ url: fileUrl, fileName: file.fileName })} />
                                  <div className="msg-attachment-actions">
                                    <button className="msg-attach-action-btn view-btn" onClick={() => openPreview(file)}><FiEye size={16} aria-hidden="true" /> View</button>
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
                                    <button className="msg-attach-action-btn view-btn" onClick={() => openPreview(file)}><FiEye size={16} aria-hidden="true" /> View</button>
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
                        <div className="message-time">{msg.delivery === "failed" && <button type="button" onClick={() => retryMessage(msg)}>Retry</button>} {msg.editedAt ? "Edited · " : ""}{new Date(msg.createdAt).toLocaleTimeString()} {ownMessage(msg) && <span aria-label={msg.isRead ? "Seen" : "Sent"}>{msg.delivery === "sending" ? "◷ Sending…" : msg.delivery === "failed" ? "Not sent" : msg.isRead ? "✓✓ Seen" : "✓ Sent"}</span>}</div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                {!isMessagingLocked && (
                  <div className="message-input-wrapper">
                    {(replying || editing) && <div className="chat-composer-context"><span>{editing ? "Editing message" : `Replying to ${replying.sender?.name || "message"}`}: {(editing || replying).content || "Attachment"}</span><button onClick={() => { setReplying(null); if (editing) setNewMessage(""); setEditing(null); }}>Cancel</button></div>}
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
                        onChange={(e) => { setNewMessage(e.target.value); sendId.current = null; }}
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
        <div className="contact-requests-panel" style={{ padding: "28px", maxWidth: "920px", margin: "0 auto", width: "100%" }}>
          {/* STUDENT: Send request form */}
          {user?.role === "student" && (
            <div className="contact-request-card"
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
                <SkeletonLoader type="chat" />
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
                        Pending Approval
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
                        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}><FiCalendar size={16} color="#3B8DB3" /> Set Schedule Window</p>
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
            <SkeletonLoader type="chat" />
          ) : contactRequests.filter((r) => user?.role === "teacher" ? r.status !== "pending" : true).length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
              <p style={{ margin: 0, fontSize: "14px" }}>No contact requests found.</p>
            </div>
          ) : (
            contactRequests
              .filter((r) => user?.role === "teacher" ? r.status !== "pending" : true)
              .map((req) => {
                const statusColor = { pending: "#f59e0b", accepted: "#10b981", rejected: "#ef4444" };
                const statusLabel = { pending: "Pending", accepted: "Accepted", rejected: "Declined" };
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
                            <FiCalendar size={14} color="#10b981" /> Scheduled Window: {new Date(req.scheduleStart).toLocaleString()} – {new Date(req.scheduleEnd).toLocaleTimeString()}
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
                <FittedDocument><div ref={docxContainerRef} className="docx-preview-container" /></FittedDocument>
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
              {previewFile.url && <button className="btn-primary" onClick={() => downloadFile(previewFile.url, previewFile.name)}><FiDownload size={16} aria-hidden="true" /> Download</button>}
              <button className="btn-secondary" onClick={() => { setPreviewFile(null); if (previewFile.url?.startsWith("blob:")) URL.revokeObjectURL(previewFile.url); }}>Close</button>
            </div>
          </div>
        </div>
      )}


      {actionMessage && <div className="chat-action-backdrop" onClick={() => setActionMessage(null)}>
        <section className="chat-action-sheet" role="dialog" aria-modal="true" aria-label="Message actions" onClick={e => e.stopPropagation()}>
          <button onClick={() => setActionMessage(null)} aria-label="Close message actions">Close</button>
          {!actionMessage.deletedAt && <>
            <div className="chat-emoji-actions">{quickEmojis.map(emoji => <button key={emoji} onClick={() => { handleToggleReaction(actionMessage._id, emoji); setActionMessage(null); }}>{emoji}</button>)}</div>
            <button onClick={() => { setReplying(actionMessage); setEditing(null); setActionMessage(null); }}>Reply</button>
            <button onClick={() => { setForwarding(actionMessage); setForwardTarget(""); setActionMessage(null); }}>Forward</button>
            {actionMessage.content && <button onClick={async () => { try { await navigator.clipboard.writeText(actionMessage.content); toast.success("Copied"); setActionMessage(null); } catch { toast.error("Could not copy text"); } }}>Copy text</button>}
            {ownMessage(actionMessage) && <><button onClick={() => { setEditing(actionMessage); setReplying(null); setNewMessage(actionMessage.content); setSelectedFiles([]); setActionMessage(null); }}>Edit</button><button onClick={() => handleDeleteMessage(actionMessage._id)}>Delete for everyone</button></>}
          </>}
          <button onClick={() => handleDeleteMessage(actionMessage._id, "me")}>Delete for me</button>
        </section>
      </div>}
      {forwarding && <div className="chat-action-backdrop"><section className="chat-action-sheet" role="dialog" aria-modal="true" aria-label="Forward message">
        <h3>Forward message</h3><label>Send to <select value={forwardTarget} onChange={e => setForwardTarget(e.target.value)}><option value="">Choose a person</option>{users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></label>
        <button disabled={!forwardTarget || sending} onClick={async () => {
          setSending(true);
          try { await communityApi.sendMessage({ receiverId: forwardTarget, forwardOf: forwarding._id, clientMessageId: crypto.randomUUID() }); setForwarding(null); toast.success("Message forwarded"); }
          catch (error) { toast.error(error.response?.data?.error || "Could not forward"); } finally { setSending(false); }
        }}>Forward</button><button onClick={() => setForwarding(null)}>Cancel</button>
      </section></div>}
      </div>
    </div>
  );
}
