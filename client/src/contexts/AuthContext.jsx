import { createContext, useContext, useState, useEffect } from "react";
import api, { BACKEND_URL } from "../services/api";
import { clearAllCache } from "../services/apiCache";
import toast from "react-hot-toast";
import { setChatNotificationContext, getChatNotificationSettings } from "../services/chatNotifications";
import { io } from "socket.io-client";
import { prepareHome } from "../services/startup";
import { invalidateNotificationReads } from "../services/notificationCache";
import { showNativeNotification, isNativePlatform, syncNativePushToken, disconnectNativePushToken } from "../services/nativeBridge";

const AuthContext = createContext();

const getSocketUrl = () => {
  return BACKEND_URL;
};

const getActiveStatusSetting = () => {
  const storedSettings = localStorage.getItem("user_settings");
  if (storedSettings) {
    try {
      return JSON.parse(storedSettings).activeStatus !== false;
    } catch (e) {}
  }
  return true;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return localStorage.getItem("token") ? JSON.parse(localStorage.getItem("user") || "null") : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    let u = null;

    if (storedUser) {
      try {
        u = JSON.parse(storedUser);
        setUser(u);
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }

    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      prepareHome(u);
      if (u && (u.id || u._id)) {
        const newSocket = io(getSocketUrl(), {
          auth: { token },
          query: { 
            userId: u.id || u._id,
            activeStatus: getActiveStatusSetting()
          },
        });
        setSocket(newSocket);
      }

      // Sync stored native FCM token with server
      const storedFcmToken = localStorage.getItem("fcm_token");
      if (storedFcmToken) {
        syncNativePushToken();
      }

      // Fresh user profile fetch to sync edits
      api.get("/auth/me")
        .then((res) => {
          if (res.data.user) {
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
        })
        .catch((err) => {
          console.error("Error fetching fresh user profile:", err);
          // If session expired or invalid, clear state to force login
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            clearAllCache();
            localStorage.clear();
            sessionStorage.clear();
            setUser(null);
            delete api.defaults.headers.common["Authorization"];
          }
        });
    }

    setLoading(false);

    // Cross-tab profile sync listener
    const handleStorageChange = (e) => {
      if (e.key === "user") {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch (err) {}
      }
      if (e.key === "token" && !e.newValue) {
        setUser(null);
        if (socket) socket.close();
        setSocket(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (socket) socket.close();
    };
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data;

      clearAllCache();
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(user);

      // Sync stored native FCM token with server
      const storedFcmToken = localStorage.getItem("fcm_token");
      if (storedFcmToken) {
        syncNativePushToken();
      }

      // Connect socket on login
      const newSocket = io(getSocketUrl(), {
        auth: { token },
        query: { 
          userId: user.id || user._id,
          activeStatus: getActiveStatusSetting()
        },
      });
      setSocket(newSocket);

      toast.success(`Welcome back, ${user.name}!`);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Login failed");
      throw error;
    }
  };

  const register = async (data) => {
    try {
      const res = await api.post("/auth/register", data);
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(user);

      // Sync stored native FCM token with server
      const storedFcmToken = localStorage.getItem("fcm_token");
      if (storedFcmToken) {
        syncNativePushToken();
      }

      // Connect socket on register
      const newSocket = io(getSocketUrl(), {
        auth: { token },
        query: { 
          userId: user.id || user._id,
          activeStatus: getActiveStatusSetting()
        },
      });
      setSocket(newSocket);

      toast.success("Account created successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Registration failed");
      throw error;
    }
  };

  const logout = async () => {
    const deviceToken = localStorage.getItem("fcm_token");
    try {
      await disconnectNativePushToken();
    } catch (error) {
      toast.error("Could not disconnect app alerts. Reconnect to the internet and sign in again to update this phone.");
    }
    clearAllCache();
    try {
      localStorage.clear();
      if (deviceToken) localStorage.setItem("fcm_token", deviceToken);
      sessionStorage.clear();
    } catch (e) {}
    await setChatNotificationContext();
    delete api.defaults.headers.common["Authorization"];
    setUser(null);

    // Disconnect socket on logout
    if (socket) {
      socket.close();
      setSocket(null);
    }

    toast.success("Logged out successfully");
    window.location.href = "/auth";
  };

  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!socket) {
      setOnlineUsers([]);
      return;
    }

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("force_logout", () => {
      logout();
      toast.error("Your account has been suspended by a moderator.");
    });

    // 1. Standard In-App / Academic / Community Notifications
    const handleNewNotification = (data) => {
      if (!data) return;
      invalidateNotificationReads(data.type, data.link);
      console.log("🔔 [newNotification] socket event received:", data);
      if (data.type === "chat_message") return; // The private-message event owns chat toasts.
      const title = data.title || "UniCore Notification";
      const body = data.message || data.body || "";
      const link = data.link || "/notifications";

      if (!isNativePlatform()) showNativeNotification({
        title,
        body,
        link,
        id: data._id || data.id,
      });

      toast.success(`${title}: ${body}`, {
        icon: "🔔",
        duration: 5000,
        position: "top-right",
      });
    };

    // 2. Academic Notices, Retake, and Payments Notifications
    const handleNewNoticeNotif = (payload) => {
      if (!payload) return;
      const currentUserId = user?._id || user?.id;
      if (payload.userId && String(payload.userId) !== String(currentUserId)) {
        return;
      }
      const notif = payload.notif || payload;
      const title = notif.title || payload.title || "Academic Notice";
      const body = notif.message || notif.body || "";
      const link = notif.link || "/notices";

      if (!isNativePlatform()) showNativeNotification({
        title,
        body,
        link,
        id: notif._id || notif.id,
      });

      toast.success(`${title}: ${body}`, {
        icon: "📢",
        duration: 5000,
        position: "top-right",
      });
    };

    // 3. Community Hub Private Messages
    const handleNewPrivateMessage = async (payload) => {
      if (!payload || !payload.message) return;
      const msg = payload.message;
      api.invalidateReadCache?.("/community/users");
      const currentUserId = user?._id || user?.id;
      const senderId = msg.sender?._id || msg.sender;
      if (String(senderId) === String(currentUserId)) return;
      if (document.visibilityState === "visible" && window.location.pathname.endsWith(`/messages/${senderId}`)) return;
      if ((await getChatNotificationSettings(senderId)).muted) return;

      const senderName = msg.sender?.name || "Direct Message";
      const content = msg.content || (msg.attachments?.length ? "Sent an attachment" : "Sent a message");
      const link = msg.course ? `/community/courses/${msg.course}` : `/community/messages`;

      if (!isNativePlatform()) showNativeNotification({
        title: `💬 ${senderName}`,
        body: content,
        link,
        id: msg._id,
      });

      toast.success(`💬 ${senderName}: ${content}`, {
        duration: 4000,
        position: "top-right",
      });
    };

    // 4. Audio / Video Calling Alerts
    const handleIncomingCall = (data) => {
      if (!data) return;
      const callerName = data.callerName || "Someone";
      const callType = data.callType || "audio";

      if (!isNativePlatform()) showNativeNotification({
        title: `📞 Incoming Call from ${callerName}`,
        body: `Incoming ${callType} call. Tap to answer now.`,
        link: "/community/messages",
        id: data.callId || Date.now(),
      });

      toast.success(`📞 Incoming ${callType} call from ${callerName}!`, {
        icon: "📞",
        duration: 8000,
        position: "top-center",
      });
    };

    // 5. Mentorship Contact Requests
    const handleContactRequest = (request) => {
      if (!request) return;
      if (!isNativePlatform()) showNativeNotification({
        title: "🤝 New Mentorship Request",
        body: "A student sent you a mentorship contact request.",
        link: "/community/messages",
        id: request._id,
      });
      toast.success("🤝 New mentorship contact request received!", { duration: 5000 });
    };

    // 6. Mentorship Contact Response
    const handleContactRequestResponse = (request) => {
      if (!request) return;
      const status = request.status === "approved" ? "Approved" : "Updated";
      if (!isNativePlatform()) showNativeNotification({
        title: `🤝 Contact Request ${status}`,
        body: `Your teacher has responded to your contact request.`,
        link: "/community/messages",
        id: request._id,
      });
      toast.success(`🤝 Contact Request ${status}!`, { duration: 5000 });
    };

    // 7. General Campus Notices
    const handleNewNotice = (data) => {
      if (!data || !data.notice) return;
      const notice = data.notice;
      if (!isNativePlatform()) showNativeNotification({
        title: `📌 Notice: ${notice.title}`,
        body: notice.content ? (notice.content.slice(0, 100) + "...") : "New campus notice published",
        link: "/notices",
        id: notice._id,
      });
    };

    socket.on("newNotification", handleNewNotification);
    socket.on("new_notification", handleNewNoticeNotif);
    socket.on("newPrivateMessage", handleNewPrivateMessage);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("newContactRequest", handleContactRequest);
    socket.on("contactRequestResponse", handleContactRequestResponse);
    socket.on("new_notice", handleNewNotice);

    return () => {
      socket.off("online_users");
      socket.off("force_logout");
      socket.off("newNotification", handleNewNotification);
      socket.off("new_notification", handleNewNoticeNotif);
      socket.off("newPrivateMessage", handleNewPrivateMessage);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("newContactRequest", handleContactRequest);
      socket.off("contactRequestResponse", handleContactRequestResponse);
      socket.off("new_notice", handleNewNotice);
    };
  }, [socket, logout, user]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading, socket, onlineUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
