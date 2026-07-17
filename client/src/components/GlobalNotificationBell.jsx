import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiBell,
  FiX,
  FiBook,
  FiFileText,
  FiClock,
  FiTrendingUp,
  FiMessageSquare,
  FiCheck,
  FiPhone,
  FiPhoneCall
} from "react-icons/fi";

export default function GlobalNotificationBell() {
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarNavEl, setSidebarNavEl] = useState(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Monitor DOM for .sidebar-nav and inject Portal container
  useEffect(() => {
    const findNav = () => {
      const el = document.getElementById("sidebar-notification-portal");
      setSidebarNavEl(el);
    };

    findNav();

    const observer = new MutationObserver(findNav);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        toast.success(`Notification: ${notification.title}`, {
          icon: '🔔',
          duration: 5000,
          position: "top-right"
        });
      };

      socket.on("newNotification", handleNewNotification);

      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await handleMarkAsRead(n._id);
    }
    setIsOpen(false);

    if (n.link) {
      navigate(n.link);
      return;
    }

    // Dynamic redirection based on type (fallback when no link is set)
    const role = user?.role || "student";
    if (n.type === "community_post") {
      navigate("/community");
    } else if (n.type === "marksheet_upload") {
      navigate(role === "teacher" ? "/teacher/assessment" : "/student/assessment");
    } else {
      navigate(role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "lecture_upload":
        return <FiBook size={16} color="#3B8DB3" />;
      case "assignment_due":
        return <FiFileText size={16} color="#D97706" />;
      case "exam_reminder":
        return <FiClock size={16} color="#DC2626" />;
      case "marksheet_upload":
        return <FiTrendingUp size={16} color="#059669" />;
      case "community_post":
        return <FiMessageSquare size={16} color="#7C3AED" />;
      case "contact_request":
        return <FiPhone size={16} color="#0EA5E9" />;
      case "contact_request_response":
        return <FiPhoneCall size={16} color="#10b981" />;
      default:
        return <FiBell size={16} color="#6B7280" />;
    }
  };

  const getIconBackground = (type) => {
    switch (type) {
      case "lecture_upload":
        return "#E8F4FD";
      case "assignment_due":
        return "#FEF3C7";
      case "exam_reminder":
        return "#FEE2E2";
      case "marksheet_upload":
        return "#ECFDF5";
      case "community_post":
        return "#F5F3FF";
      case "contact_request":
        return "#E0F2FE";
      case "contact_request_response":
        return "#ECFDF5";
      default:
        return "#F3F4F6";
    }
  };

  return (
    <>
      <style>{`
        .global-notification-bell-btn {
          position: fixed;
          top: 15px;
          right: 20px;
          z-index: 999;
          background: #FFFFFF;
          border: 1px solid rgba(59, 141, 179, 0.15);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(59, 141, 179, 0.12);
          transition: all 0.25s ease;
          color: #2C4B66;
        }
        .global-notification-bell-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(59, 141, 179, 0.2);
          background: #E8F4FD;
          color: #3B8DB3;
        }
        .global-notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #EF4444;
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 700;
          height: 18px;
          min-width: 18px;
          border-radius: 9px;
          padding: 0 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4);
          animation: pulse-badge 2s infinite;
        }
        @keyframes pulse-badge {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .notification-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(2px);
          z-index: 1000;
          transition: opacity 0.3s ease;
        }
        .notification-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: 380px;
          height: 100vh;
          background: #FFFFFF;
          z-index: 1001;
          box-shadow: -4px 0 24px rgba(44, 75, 102, 0.15);
          display: flex;
          flex-direction: column;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          transform: translateX(100%);
        }
        .notification-drawer.open {
          transform: translateX(0);
        }
        .notification-drawer-header {
          padding: 20px;
          border-bottom: 1px solid #E2EEF6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .notification-drawer-header h3 {
          margin: 0;
          color: #2C4B66;
          font-size: 18px;
          font-weight: 700;
        }
        .notification-drawer-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .mark-all-read-btn {
          background: none;
          border: none;
          color: #3B8DB3;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        .mark-all-read-btn:hover {
          background: #E8F4FD;
        }
        .close-drawer-btn {
          background: none;
          border: none;
          color: #6B89A0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 50%;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .close-drawer-btn:hover {
          background: #F3F4F6;
          color: #2C4B66;
        }
        .notification-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px 0;
        }
        .notification-item {
          padding: 16px 20px;
          display: flex;
          gap: 12px;
          cursor: pointer;
          border-bottom: 1px solid #F3F4F6;
          transition: all 0.2s ease;
          position: relative;
        }
        .notification-item:hover {
          background: #F8FAFC;
        }
        .notification-item.unread {
          background: #F0F9FF;
        }
        .notification-item.unread::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3B8DB3;
        }
        .notification-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .notification-content {
          flex: 1;
        }
        .notification-title {
          font-size: 13px;
          font-weight: 600;
          color: #2C4B66;
          margin: 0 0 4px 0;
        }
        .notification-message {
          font-size: 12px;
          color: #6B89A0;
          margin: 0 0 6px 0;
          line-height: 1.4;
        }
        .notification-time {
          font-size: 10px;
          color: #94A3B8;
        }
        .empty-notifications {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #6B89A0;
          text-align: center;
        }
        .empty-notifications p {
          margin-top: 12px;
          font-size: 14px;
        }
      `}</style>

      {/* DRAWER OVERLAY */}
      {isOpen && (
        <div 
          className="notification-drawer-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* DRAWER CONTAINER */}
      <div className={`notification-drawer ${isOpen ? "open" : ""}`}>
        <div className="notification-drawer-header">
          <h3>Notifications</h3>
          <div className="notification-drawer-header-actions">
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={handleMarkAllAsRead}
              >
                <FiCheck size={14} /> Mark all as read
              </button>
            )}
            <button 
              className="close-drawer-btn"
              onClick={() => setIsOpen(false)}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="empty-notifications">
              <FiBell size={40} color="#CBD5E1" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n._id}
                className={`notification-item ${!n.isRead ? "unread" : ""}`}
                onClick={() => handleNotificationClick(n)}
              >
                <div 
                  className="notification-icon-wrapper"
                  style={{ background: getIconBackground(n.type) }}
                >
                  {getNotificationIcon(n.type)}
                </div>
                <div className="notification-content">
                  <h4 className="notification-title">{n.title}</h4>
                  <p className="notification-message">{n.message}</p>
                  <span className="notification-time">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PORTAL FOR SIDEBAR INJECTION */}
      {sidebarNavEl && createPortal(
        <button
          className="nav-item"
          onClick={() => setIsOpen(true)}
          style={{ 
            position: "relative", 
            width: "100%", 
            display: "flex", 
            alignItems: "center", 
            background: "none", 
            border: "none", 
            textAlign: "left", 
            cursor: "pointer" 
          }}
        >
          <FiBell size={18} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span 
              style={{ 
                background: "#EF4444", 
                color: "#FFFFFF", 
                marginLeft: "auto", 
                borderRadius: "50%", 
                minWidth: "18px", 
                height: "18px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                fontSize: "11px", 
                fontWeight: "700",
                padding: "0 4px"
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>,
        sidebarNavEl
      )}
    </>
  );
}
