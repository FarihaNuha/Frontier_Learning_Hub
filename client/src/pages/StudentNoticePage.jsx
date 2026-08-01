import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
  FiPaperclip,
} from "react-icons/fi";
import "../styles/dashboard.css";

export default function StudentNoticePage() {
  const { id: courseIdParam } = useParams();

  // Admin / Global Notices state
  const [adminNotices, setAdminNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedNoticeModal, setSelectedNoticeModal] = useState(null);

  // Course-specific state
  const [courseInfo, setCourseInfo] = useState(null);
  const [courseNotices, setCourseNotices] = useState([]);

  // Fetch Global Admin Notices (for overall /student/notices)
  const fetchAdminNotices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/service/notices");
      const allNotices = res.data.notices || [];
      const published = allNotices.filter((n) => n.status === "Published" || !n.status);
      setAdminNotices(published);
    } catch (err) {
      toast.error("Failed to load official notices.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Course Notices & Course Details (for /student/course/:id/notice)
  const fetchCourseNotices = async (cid) => {
    setLoading(true);
    try {
      const [cRes, nRes] = await Promise.all([
        api.get(`/courses/${cid}`).catch(() => null),
        api.get(`/service/notices/course/${cid}`).catch(() => null),
      ]);

      if (cRes?.data?.course) {
        setCourseInfo(cRes.data.course);
      }
      if (nRes?.data?.notices) {
        setCourseNotices(nRes.data.notices);
      }
    } catch (err) {
      toast.error("Failed to load course notices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseIdParam) {
      fetchCourseNotices(courseIdParam);
    } else {
      fetchAdminNotices();
    }
  }, [courseIdParam]);

  const categories = ["all", "Academic", "Exam", "Event", "General", "Registration"];

  const filteredAdminNotices = adminNotices.filter((n) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (n.category || "").toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      (n.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.content || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const activeNotices = courseIdParam ? courseNotices : filteredAdminNotices;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <StudentSidebar currentPage="notices" courseId={courseIdParam} courseInfo={courseInfo} />
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
                {courseIdParam
                  ? `Course Notice Board ${courseInfo ? `— ${courseInfo.displayCode}` : ""}`
                  : "Official Notice Board"}
              </h1>
              <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                {courseIdParam
                  ? `Course notices published by your course instructor for ${courseInfo?.displayCode || "this course"}.`
                  : "Official announcements, exam schedules, and university updates from Registrar & Administration."}
              </p>
            </div>
          </div>
        </div>

        {/* Global Admin Notice Filter Bar (ONLY visible on Global Notice Board) */}
        {!courseIdParam && (
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
        )}

        {/* Notices Grid */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
            Loading notices...
          </div>
        ) : activeNotices.length === 0 ? (
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
            <h3 style={{ margin: 0, color: "#475569" }}>No notices published</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "13.5px" }}>
              {courseIdParam
                ? "No course notices published yet by your course instructor."
                : "Check back later for official university updates and result announcements."}
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
            {activeNotices.map((notice) => {
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

                      {notice.courseCode && (
                        <span style={{ padding: "3px 8px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 700, background: "#dcfce7", color: "#15803d" }}>
                          📚 {notice.courseCode}
                        </span>
                      )}

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
                borderRadius: "20px",
                padding: "32px",
                maxWidth: "680px",
                width: "100%",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                maxHeight: "85vh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: "#e0f2fe",
                      color: "#0369a1",
                      marginBottom: "8px",
                      display: "inline-block",
                    }}
                  >
                    {selectedNoticeModal.category || "General"}
                  </span>
                  <h2 style={{ margin: "6px 0 0 0", fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>
                    {selectedNoticeModal.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedNoticeModal(null)}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  <FiX size={20} />
                </button>
              </div>

              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", display: "flex", gap: "16px", flexWrap: "wrap", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <span>Issued by: <strong>{selectedNoticeModal.authorName || "Registrar"}</strong></span>
                <span>Date: <strong>{new Date(selectedNoticeModal.createdAt).toLocaleDateString()}</strong></span>
              </div>

              <div style={{ fontSize: "15px", lineHeight: "1.7", color: "#334155", whiteSpace: "pre-line", marginBottom: "24px" }}>
                {selectedNoticeModal.content}
              </div>

              {selectedNoticeModal.pdfUrl && (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <a
                    href={selectedNoticeModal.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#0284c7", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <FiPaperclip size={16} /> Open Attached Document (PDF)
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
