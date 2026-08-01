import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import TeacherSidebar from "../components/TeacherSidebar";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiClipboard,
  FiBookmark,
  FiSearch,
  FiCalendar,
  FiUser,
  FiFileText,
  FiImage,
  FiPaperclip,
  FiX,
  FiPlus,
} from "react-icons/fi";
import "../styles/dashboard.css";

export default function TeacherNoticePage() {
  const { id: courseIdParam } = useParams();

  // Admin / Global Notices state
  const [adminNotices, setAdminNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Course-specific state
  const [courseInfo, setCourseInfo] = useState(null);
  const [courseNotices, setCourseNotices] = useState([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseNoticeTitle, setCourseNoticeTitle] = useState("");
  const [courseNoticeContent, setCourseNoticeContent] = useState("");
  const [submittingCourseNotice, setSubmittingCourseNotice] = useState(false);

  // Fetch Global Admin Notices (for overall /teacher/notices)
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

  // Fetch Course Notices & Course Details (for /teacher/course/:id/notice)
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

  const handlePostCourseNotice = async (e) => {
    e.preventDefault();
    if (!courseIdParam) return;
    if (!courseNoticeTitle.trim() || !courseNoticeContent.trim()) {
      toast.error("Title and Content are required.");
      return;
    }

    setSubmittingCourseNotice(true);
    try {
      await api.post(`/service/notices/course/${courseIdParam}`, {
        title: courseNoticeTitle,
        content: courseNoticeContent,
      });
      toast.success("Course notice published directly to enrolled students!");
      setCourseNoticeTitle("");
      setCourseNoticeContent("");
      setShowCourseModal(false);
      fetchCourseNotices(courseIdParam);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to publish course notice.");
    } finally {
      setSubmittingCourseNotice(false);
    }
  };

  const categories = ["all", "Academic", "Exam", "Event", "General", "Registration"];

  const filteredAdminNotices = adminNotices.filter((n) => {
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

  const activeNotices = courseIdParam ? courseNotices : filteredAdminNotices;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <TeacherSidebar currentPage="notices" courseId={courseIdParam} courseInfo={courseInfo} />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
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
                {courseIdParam
                  ? `Course Notice Board ${courseInfo ? `— ${courseInfo.displayCode}` : ""}`
                  : "Official Notice Board"}
              </h1>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              {courseIdParam
                ? `Announcements & notice updates sent directly to students enrolled in ${courseInfo?.displayCode || "this course"}.`
                : "Official announcements, administrative notices, and academic directives issued by University Administration."}
            </p>
          </div>

          {/* Post Course Notice Button (ONLY visible inside Course Section) */}
          {courseIdParam && (
            <button
              onClick={() => setShowCourseModal(true)}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                border: "none",
                padding: "12px 22px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
              }}
            >
              <FiPlus size={18} />
              <span>Post Course Notice</span>
            </button>
          )}
        </div>

        {/* Global Admin Notice Filter Bar (ONLY visible on Global Notice Board) */}
        {!courseIdParam && (
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
        )}

        {/* Notices List */}
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
            <FiClipboard size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 6px 0", color: "#475569" }}>No notices found</h3>
            <p style={{ margin: 0, fontSize: "14px" }}>
              {courseIdParam
                ? "No course notices published yet for this course."
                : searchQuery
                ? `No notices matched your search "${searchQuery}".`
                : "There are currently no official notices published for teachers."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {activeNotices.map((n) => (
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

                  {n.courseCode && (
                    <span style={{ padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, background: "#dcfce7", color: "#15803d" }}>
                      📚 {n.courseCode}
                    </span>
                  )}

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
                        <FiFileText size={14} /> Download Document (PDF)
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Post Course Notice Modal */}
        {showCourseModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "550px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: 700 }}>
                  Post Notice for {courseInfo?.displayCode || "Course"}
                </h3>
                <FiX size={20} color="#64748b" cursor="pointer" onClick={() => setShowCourseModal(false)} />
              </div>

              <form onSubmit={handlePostCourseNotice} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Notice Title *</label>
                  <input
                    type="text"
                    value={courseNoticeTitle}
                    onChange={(e) => setCourseNoticeTitle(e.target.value)}
                    required
                    placeholder="e.g. Class Rescheduled / Assignment Submission Reminder"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Notice Content *</label>
                  <textarea
                    rows={5}
                    value={courseNoticeContent}
                    onChange={(e) => setCourseNoticeContent(e.target.value)}
                    required
                    placeholder="Write detailed notice announcement for enrolled students of this course..."
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", outline: "none" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button type="button" onClick={() => setShowCourseModal(false)} style={{ padding: "10px 18px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>Cancel</button>
                  <button type="submit" disabled={submittingCourseNotice} style={{ padding: "10px 20px", background: "#10b981", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "13.5px", cursor: submittingCourseNotice ? "not-allowed" : "pointer" }}>{submittingCourseNotice ? "Publishing..." : "Publish Course Notice"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
