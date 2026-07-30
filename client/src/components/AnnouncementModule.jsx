import React, { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiBell,
  FiPlus,
  FiBookmark,
  FiPaperclip,
  FiTrash2,
  FiCalendar,
  FiSend,
  FiUser,
  FiX,
} from "react-icons/fi";

export default function AnnouncementModule({ courseId, isTeacher }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    isPinned: false,
    scheduledAt: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get(`/announcements/course/${courseId}`);
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchAnnouncements();
    }
  }, [courseId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error("Title and content are required.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/announcements", {
        courseId,
        ...formData,
      });
      toast.success("Announcement posted! Enrolled students notified.");
      setShowForm(false);
      setFormData({ title: "", content: "", isPinned: false, scheduledAt: "" });
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to post announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success("Announcement deleted.");
      fetchAnnouncements();
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  return (
    <div style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FiBell size={20} color="#3b8db3" />
          <h2 style={{ margin: 0, fontSize: "18px", color: "#1e293b" }}>Course Announcements</h2>
        </div>

        {isTeacher && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              background: "#3b8db3",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {showForm ? <FiX size={15} /> : <FiPlus size={15} />}
            {showForm ? "Cancel" : "New Announcement"}
          </button>
        )}
      </div>

      {/* New Announcement Form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: "#f8fafc", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 14px 0", fontSize: "15px", color: "#0f172a" }}>Post New Announcement</h3>
          <div style={{ marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="Announcement Title..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <textarea
              placeholder="Write announcement message here..."
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "16px", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#475569", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
              />
              <FiBookmark size={14} color="#3b8db3" /> Pin to top
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "14px",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            <FiSend size={15} /> {submitting ? "Posting..." : "Post & Notify Students"}
          </button>
        </form>
      )}

      {/* Announcements List */}
      {loading ? (
        <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
          <FiBell size={40} style={{ opacity: 0.3, marginBottom: "8px" }} />
          <p style={{ margin: 0, fontSize: "14px" }}>No course announcements posted yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {announcements.map((item) => (
            <div
              key={item._id}
              style={{
                background: item.isPinned ? "#f0f9ff" : "#ffffff",
                border: item.isPinned ? "1.5px solid #7EC8E3" : "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "18px 20px",
                position: "relative",
              }}
            >
              {item.isPinned && (
                <div style={{ position: "absolute", top: "14px", right: "14px", display: "flex", alignItems: "center", gap: "4px", color: "#0369a1", fontSize: "11px", fontWeight: 700, background: "#bae6fd", padding: "2px 8px", borderRadius: "10px" }}>
                  <FiBookmark size={12} /> Pinned
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#3b8db3", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                  {item.author?.name ? item.author.name.charAt(0).toUpperCase() : "T"}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "#0f172a" }}>{item.title}</h4>
                  <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                    {item.author?.name || "Teacher"} • {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <p style={{ margin: "10px 0 0 0", fontSize: "14px", color: "#334155", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                {item.content}
              </p>

              {isTeacher && (
                <button
                  onClick={() => handleDelete(item._id)}
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    right: "14px",
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                  title="Delete announcement"
                >
                  <FiTrash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
