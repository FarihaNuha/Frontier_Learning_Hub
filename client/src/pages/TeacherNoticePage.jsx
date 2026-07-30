import React, { useState, useEffect } from "react";
import TeacherSidebar from "../components/TeacherSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiBell,
  FiClipboard,
  FiBookmark,
  FiSearch,
  FiCalendar,
  FiUser,
  FiFileText,
  FiDownload,
  FiImage,
  FiPaperclip,
  FiX,
  FiCheckCircle,
} from "react-icons/fi";
import "../styles/dashboard.css";

export default function TeacherNoticePage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedNoticeModal, setSelectedNoticeModal] = useState(null);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/service/notices");
      // Filter published notices only
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

    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (n.title || "").toLowerCase().includes(q) ||
      (n.content || "").toLowerCase().includes(q) ||
      (n.authorName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <TeacherSidebar currentPage="notices" />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #3B8DB3, #2C4B66)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(59,141,179,0.25)",
              }}
            >
              <FiClipboard size={22} />
            </div>
            <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px", fontWeight: 700 }}>
              Official Notice Board
            </h1>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Official announcements, administrative notices, and academic directives issued by University Administration.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            marginBottom: "28px",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", width: "100%", maxWidth: "500px" }}>
            <FiSearch
              size={17}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Search notices by title, keyword, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 38px 10px 40px",
                borderRadius: "10px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13.5px",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searchQuery && (
              <FiX
                size={16}
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              />
            )}
          </div>

          {/* Category Tabs */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: selectedCategory === cat ? "none" : "1px solid #cbd5e1",
                  background: selectedCategory === cat ? "#3b8db3" : "#ffffff",
                  color: selectedCategory === cat ? "#ffffff" : "#475569",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.2s",
                }}
              >
                {cat === "all" ? "All Notices" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Notices List */}
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
            <FiClipboard size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 6px 0", color: "#475569" }}>No notices found</h3>
            <p style={{ margin: 0, fontSize: "14px" }}>
              {searchQuery
                ? `No notices matched your search "${searchQuery}".`
                : "There are currently no official notices published for teachers."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {filteredNotices.map((n) => (
              <div
                key={n._id}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
                  border: n.isPinned ? "2px solid #3b8db3" : "1px solid #e2e8f0",
                  position: "relative",
                }}
              >
                {/* Pinned Badge */}
                {n.isPinned && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-12px",
                      right: "24px",
                      background: "linear-gradient(135deg, #3b8db3, #2C4B66)",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 12px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: "0 2px 8px rgba(59,141,179,0.3)",
                    }}
                  >
                    <FiBookmark size={12} /> PINNED NOTICE
                  </div>
                )}

                {/* Header Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background:
                        n.category === "Academic"
                          ? "#e0f2fe"
                          : n.category === "Exam"
                          ? "#fef3c7"
                          : n.category === "Event"
                          ? "#fce7f3"
                          : "#f1f5f9",
                      color:
                        n.category === "Academic"
                          ? "#0369a1"
                          : n.category === "Exam"
                          ? "#b45309"
                          : n.category === "Event"
                          ? "#be185d"
                          : "#475569",
                    }}
                  >
                    {n.category || "General"}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "12.5px" }}>
                    <FiUser size={14} />
                    <span>{n.authorName || "Admin Registrar"}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "12.5px", marginLeft: "auto" }}>
                    <FiCalendar size={14} />
                    <span>{new Date(n.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                  </div>
                </div>

                {/* Title */}
                <h2 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "19px", fontWeight: 700 }}>
                  {n.title}
                </h2>

                {/* Content Body */}
                <p
                  style={{
                    margin: "0 0 16px 0",
                    color: "#334155",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-line",
                  }}
                >
                  {n.content}
                </p>

                {/* Attachments / Files */}
                {(n.pdfUrl || (n.imageUrls && n.imageUrls.length > 0) || (n.attachments && n.attachments.length > 0)) && (
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginTop: "12px",
                    }}
                  >
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                      <FiPaperclip size={14} /> Attachments:
                    </span>

                    {n.pdfUrl && (
                      <a
                        href={n.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: "#e0f2fe",
                          color: "#0369a1",
                          borderRadius: "6px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        <FiFileText size={14} /> Download Official Document (PDF)
                      </a>
                    )}

                    {(n.imageUrls || []).map((img, idx) => (
                      <a
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: "#f1f5f9",
                          color: "#334155",
                          borderRadius: "6px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        <FiImage size={14} /> View Image {idx + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
