import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TeacherSidebar from "../components/TeacherSidebar";
import StudentSidebar from "../components/StudentSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiBell,
  FiCheckCircle,
  FiBook,
  FiFileText,
  FiClock,
  FiTrendingUp,
  FiMessageSquare,
  FiPhoneCall,
  FiCheck,
  FiTrash2
} from "react-icons/fi";
import "../styles/dashboard.css";

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "unread"

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error("Fetch notifications error:", err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read!");
    } catch (err) {
      console.error("Mark all read error:", err);
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) markAsRead(n._id);
    if (n.link) navigate(n.link);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "assignment":
        return <FiFileText size={20} color="#3B8DB3" />;
      case "exam":
        return <FiClock size={20} color="#E11D48" />;
      case "community":
        return <FiMessageSquare size={20} color="#10B981" />;
      case "contact_request":
        return <FiPhoneCall size={20} color="#8B5CF6" />;
      case "course":
        return <FiBook size={20} color="#F59E0B" />;
      default:
        return <FiBell size={20} color="#3B8DB3" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="dashboard-container">
      {user?.role === "teacher" ? (
        <TeacherSidebar currentPage="notifications" />
      ) : (
        <StudentSidebar currentPage="notifications" />
      )}

      <div className="main-content" style={{ padding: "40px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(59,141,179,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3B8DB3" }}>
              <FiBell size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: "26px", color: "var(--text-dark)", margin: 0, fontWeight: 700 }}>Notifications</h1>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                Stay updated with course announcements, assignments, messages and events.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "#3B8DB3",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                }}
              >
                <FiCheckCircle size={16} /> Mark All as Read
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: filter === "all" ? "none" : "1px solid var(--border-color)",
              background: filter === "all" ? "#3B8DB3" : "var(--bg-card)",
              color: filter === "all" ? "#ffffff" : "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: filter === "unread" ? "none" : "1px solid var(--border-color)",
              background: filter === "unread" ? "#3B8DB3" : "var(--bg-card)",
              color: filter === "unread" ? "#ffffff" : "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-secondary)" }}>
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
            <FiBell size={48} color="#94a3b8" style={{ marginBottom: 12, opacity: 0.4 }} />
            <h4 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>No notifications found</h4>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
              {filter === "unread" ? "You have read all your notifications!" : "You don't have any notifications right now."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "900px" }}>
            {filteredNotifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  background: n.isRead ? "var(--bg-card)" : "rgba(59,141,179,0.06)",
                  border: `1px solid ${n.isRead ? "var(--border-color)" : "rgba(59,141,179,0.25)"}`,
                  borderLeft: n.isRead ? "1px solid var(--border-color)" : "4px solid #3B8DB3",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: "10px", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {getNotificationIcon(n.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: n.isRead ? 600 : 700, color: "var(--text-primary)" }}>
                      {n.title}
                    </h4>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {n.message}
                  </p>
                </div>

                {!n.isRead && (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B8DB3", marginTop: 6, flexShrink: 0 }} title="Unread" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
