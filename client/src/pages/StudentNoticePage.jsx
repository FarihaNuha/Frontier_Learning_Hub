import React, { useState, useEffect } from "react";
import StudentSidebar from "../components/StudentSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiBell,
  FiSearch,
  FiCalendar,
  FiUser,
  FiFileText,
  FiBookmark,
  FiX,
  FiInfo,
} from "react-icons/fi";
import "../styles/dashboard.css";

export default function StudentNoticePage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedNoticeModal, setSelectedNoticeModal] = useState(null);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/service/notices");
      const allNotices = res.data.notices || [];
      const published = allNotices.filter((n) => n.status === "Published" || !n.status);
      setNotices(published);
    } catch (err) {
      toast.error("Failed to load official notices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const categories = ["all", "Academic", "Exam", "Event", "General", "Registration"];

  const filteredNotices = notices.filter((n) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (n.category || "").toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      (n.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.content || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <StudentSidebar currentPage="notices" />
      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0284c7, #0369a1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <FiBell size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "#0f172a" }}>
                Official Notice Board
              </h1>
              <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                Official announcements, exam schedules, result publication dates, and university updates from Registrar & Administration.
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "14px",
            marginBottom: "24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "7px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background:
                    selectedCategory === cat ? "#0284c7" : "#f1f5f9",
                  color: selectedCategory === cat ? "#ffffff" : "#475569",
                  transition: "all 0.2s ease",
                }}
              >
                {cat === "all" ? "All Notices" : cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "260px" }}>
            <FiSearch
              size={16}
              color="#94a3b8"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search notices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Notices Grid */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
            Loading official notices...
          </div>
        ) : filteredNotices.length === 0 ? (
          <div
            style={{
              padding: "60px",
              background: "#ffffff",
              borderRadius: "16px",
              textAlign: "center",
              color: "#94a3b8",
              border: "1px solid #e2e8f0",
            }}
          >
            <FiFileText size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <h3 style={{ margin: 0, color: "#475569" }}>No official notices published</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "13.5px" }}>
              Check back later for university updates and result announcements.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredNotices.map((notice) => {
              const isPinned = notice.isPinned;
              return (
                <div
                  key={notice._id}
                  onClick={() => setSelectedNoticeModal(notice)}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    padding: "20px",
                    border: isPinned ? "1.5px solid #0284c7" : "1px solid #e2e8f0",
                    boxShadow: isPinned
                      ? "0 4px 16px rgba(2,132,199,0.12)"
                      : "0 2px 8px rgba(0,0,0,0.03)",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "transform 0.15s ease, boxShadow 0.15s ease",
                  }}
                >
                  <div>
                    {/* Header Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          background: "#e0f2fe",
                          color: "#0369a1",
                        }}
                      >
                        {notice.category || "General"}
                      </span>

                      {isPinned && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            color: "#0284c7",
                          }}
                        >
                          <FiBookmark size={13} /> Pinned Notice
                        </span>
                      )}
                    </div>

                    {/* Notice Title */}
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>
                      {notice.title}
                    </h3>

                    {/* Notice Excerpt */}
                    <p
                      style={{
                        margin: 0,
                        fontSize: "13.5px",
                        color: "#475569",
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {notice.content}
                    </p>
                  </div>

                  {/* Notice Footer */}
                  <div
                    style={{
                      marginTop: "16px",
                      paddingTop: "12px",
                      borderTop: "1px solid #f1f5f9",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <FiCalendar size={13} color="#94a3b8" />
                      <span>{new Date(notice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 600, color: "#0284c7" }}>
                      <span>View Details →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Notice View Modal */}
        {selectedNoticeModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15,23,42,0.6)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "28px",
                maxWidth: "640px",
                width: "100%",
                maxHeight: "85vh",
                overflowY: "auto",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: "#e0f2fe",
                      color: "#0369a1",
                      display: "inline-block",
                      marginBottom: "8px",
                    }}
                  >
                    {selectedNoticeModal.category || "General"}
                  </span>
                  <h2 style={{ margin: 0, fontSize: "20px", color: "#0f172a", lineHeight: 1.3 }}>
                    {selectedNoticeModal.title}
                  </h2>
                </div>
                <FiX size={22} color="#64748b" cursor="pointer" onClick={() => setSelectedNoticeModal(null)} />
              </div>

              <div style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "20px", display: "flex", gap: "16px" }}>
                <span>📅 Published: {new Date(selectedNoticeModal.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                <span>👤 By: {selectedNoticeModal.authorName || "Registrar / Administration"}</span>
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", color: "#334155", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {selectedNoticeModal.content}
              </div>

              <div style={{ marginTop: "24px", textAlign: "right" }}>
                <button
                  onClick={() => setSelectedNoticeModal(null)}
                  style={{
                    padding: "9px 20px",
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Close Notice
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
