import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiBookOpen,
  FiUsers,
  FiClock,
  FiFileText,
  FiCalendar,
  FiArrowRight,
  FiCheckCircle,
  FiFilter,
  FiCopy,
} from "react-icons/fi";
import TeacherSidebar from "./TeacherSidebar";
import "../styles/dashboard.css";

// 3D Gradient Banner Helper matching Student Dashboard
const getCourseBanner = (course) => {
  const name = (course.name || course.courseTitle || "").toLowerCase();
  
  if (name.includes("math") || name.includes("calculus") || name.includes("algebra") || name.includes("linear") || name.includes("geometry") || name.includes("statistic")) {
    return {
      gradient: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1d4ed8 100%)", // Royal Sapphire
      accent: "#3b82f6"
    };
  }
  if (name.includes("program") || name.includes("code") || name.includes("computer") || name.includes("software") || name.includes("java") || name.includes("python") || name.includes("c++") || name.includes("web") || name.includes("android") || name.includes("data") || name.includes("algorithm")) {
    return {
      gradient: "linear-gradient(135deg, #065f46 0%, #10b981 50%, #047857 100%)", // Emerald Code
      accent: "#10b981"
    };
  }
  if (name.includes("physics") || name.includes("chemistry") || name.includes("biology") || name.includes("science") || name.includes("circuit") || name.includes("electronics") || name.includes("electrical")) {
    return {
      gradient: "linear-gradient(135deg, #be185d 0%, #db2777 50%, #831843 100%)", // Hot Pink
      accent: "#ec4899"
    };
  }
  if (name.includes("art") || name.includes("design") || name.includes("drawing") || name.includes("paint") || name.includes("creative")) {
    return {
      gradient: "linear-gradient(135deg, #b45309 0%, #d97706 50%, #78350f 100%)", // Amber Glow
      accent: "#f59e0b"
    };
  }
  if (name.includes("business") || name.includes("finance") || name.includes("accounting") || name.includes("management") || name.includes("economy") || name.includes("marketing")) {
    return {
      gradient: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #075985 100%)", // Sky Blue
      accent: "#0ea5e9"
    };
  }
  if (name.includes("game") || name.includes("graphics") || name.includes("media") || name.includes("animation")) {
    return {
      gradient: "linear-gradient(135deg, #db2777 0%, #f43f5e 50%, #9d174d 100%)", // Rose Red
      accent: "#f43f5e"
    };
  }
  if (name.includes("network") || name.includes("security") || name.includes("cloud") || name.includes("database") || name.includes("dbms")) {
    return {
      gradient: "linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e3a8a 100%)", // Neon Sapphire
      accent: "#3b82f6"
    };
  }
  if (name.includes("project") || name.includes("thesis") || name.includes("seminar") || name.includes("presentation")) {
    return {
      gradient: "linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #7c2d12 100%)", // Sunset Orange
      accent: "#f97316"
    };
  }

  const fallbackBanners = [
    { gradient: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c084fc 100%)", accent: "#7c3aed" },
    { gradient: "linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fda4af 100%)", accent: "#fb7185" },
    { gradient: "linear-gradient(135deg, #059669 0%, #10b981 50%, #6ee7b7 100%)", accent: "#10b981" },
    { gradient: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #1d4ed8 100%)", accent: "#2563eb" },
    { gradient: "linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fde047 100%)", accent: "#f97316" },
    { gradient: "linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #67e8f9 100%)", accent: "#06b6d4" },
    { gradient: "linear-gradient(135deg, #6d28d9 0%, #db2777 50%, #9d174d 100%)", accent: "#db2777" },
    { gradient: "linear-gradient(135deg, #15803d 0%, #84cc16 50%, #a3e635 100%)", accent: "#84cc16" }
  ];
  
  const index = course._id ? parseInt(course._id.slice(-4), 16) % fallbackBanners.length : 0;
  return fallbackBanners[index];
};

export default function TeacherHomeDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Independent Level and Term filter state
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedTerm, setSelectedTerm] = useState("all");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get("/courses/teacher-summary");
        setData(res.data);
      } catch (err) {
        toast.error("Failed to load teacher dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const summary = data?.summary || {
    totalAssignedCourses: 0,
    totalStudents: 0,
    pendingRegistrationRequests: 0,
    upcomingClasses: 0,
    pendingAssignments: 0,
    pendingAttendance: 0,
    isAdviser: false,
  };

  const activeLevels = data?.activeLevels || [];
  const activeTerms = data?.activeTerms || [];
  const allCourses = data?.courses || [];

  // Filter courses based on independently selected Level and Term
  const displayedCourses = allCourses.filter((c) => {
    if (selectedLevel !== "all") {
      const matchL = (c.level || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetL = selectedLevel.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!matchL.includes(targetL)) return false;
    }
    if (selectedTerm !== "all") {
      const matchT = (c.term || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetT = selectedTerm.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!matchT.includes(targetT)) return false;
    }
    return true;
  });

  const copyJoinCode = (code, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success("Join code copied!");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#E8F4FD" }}>
      <TeacherSidebar currentPage="dashboard" />

      <div
        style={{
          flex: 1,
          padding: "32px 28px",
          marginLeft: 0,
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
            Teacher Overview Dashboard
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Welcome back! Here are your assigned courses, level/term filters, and academic metrics.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
            Loading dashboard data...
          </div>
        ) : (
          <>
            {/* 1. Summary Cards Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "32px",
              }}
            >
              {/* Total Assigned Courses */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "20px",
                  borderRadius: "14px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Assigned Courses</span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FiBookOpen size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>{summary.totalAssignedCourses}</div>
              </div>

              {/* Total Students */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "20px",
                  borderRadius: "14px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Total Students</span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FiUsers size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>{summary.totalStudents}</div>
              </div>

              {/* Pending Registrations (Adviser) */}
              {summary.isAdviser && (
                <div
                  onClick={() => navigate("/teacher/registration-approval")}
                  style={{
                    background: summary.pendingRegistrationRequests > 0 ? "#fef2f2" : "#ffffff",
                    padding: "20px",
                    borderRadius: "14px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                    border: summary.pendingRegistrationRequests > 0 ? "1.5px solid #fca5a5" : "1px solid #e2e8f0",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "13px", color: summary.pendingRegistrationRequests > 0 ? "#991b1b" : "#64748b", fontWeight: 600 }}>
                      Pending Registrations
                    </span>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: summary.pendingRegistrationRequests > 0 ? "#fee2e2" : "#f1f5f9", color: summary.pendingRegistrationRequests > 0 ? "#dc2626" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FiCheckCircle size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: "26px", fontWeight: 800, color: summary.pendingRegistrationRequests > 0 ? "#dc2626" : "#0f172a" }}>
                    {summary.pendingRegistrationRequests}
                  </div>
                </div>
              )}

              {/* Upcoming Classes */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "20px",
                  borderRadius: "14px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Active Classes</span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FiClock size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>{summary.upcomingClasses}</div>
              </div>

              {/* Pending Assignments */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "20px",
                  borderRadius: "14px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Pending Grading</span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f3e8ff", color: "#6b21a8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FiFileText size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>{summary.pendingAssignments}</div>
              </div>

              {/* Pending Attendance */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "20px",
                  borderRadius: "14px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Pending Attendance</span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#ccfbf1", color: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FiCalendar size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a" }}>{summary.pendingAttendance}</div>
              </div>
            </div>

            {/* 2. Independent Level and Term Selection Filters */}
            <div style={{ background: "#ffffff", padding: "24px", borderRadius: "14px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", marginBottom: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <FiFilter size={20} color="#3b8db3" />
                <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>Filter Assigned Courses by Level & Term</h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {/* Level Selection Section */}
                <div>
                  <label style={{ fontSize: "13.5px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "10px" }}>
                    Select Level:
                  </label>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setSelectedLevel("all")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: selectedLevel === "all" ? "none" : "1px solid #cbd5e1",
                        background: selectedLevel === "all" ? "#3b8db3" : "#f8fafc",
                        color: selectedLevel === "all" ? "#ffffff" : "#334155",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      All Levels
                    </button>
                    {(activeLevels.length > 0 ? activeLevels : ["Level 1", "Level 2", "Level 3", "Level 4"]).map((lvl) => {
                      const isSel = selectedLevel.toLowerCase().replace(/[^a-z0-9]/g, "") === lvl.toLowerCase().replace(/[^a-z0-9]/g, "");
                      return (
                        <button
                          key={lvl}
                          onClick={() => setSelectedLevel(lvl)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            border: isSel ? "none" : "1px solid #cbd5e1",
                            background: isSel ? "#3b8db3" : "#ffffff",
                            color: isSel ? "#ffffff" : "#1e293b",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                            boxShadow: isSel ? "0 4px 12px rgba(59,141,179,0.25)" : "none",
                          }}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Term Selection Section */}
                <div>
                  <label style={{ fontSize: "13.5px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "10px" }}>
                    Select Term:
                  </label>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setSelectedTerm("all")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: selectedTerm === "all" ? "none" : "1px solid #cbd5e1",
                        background: selectedTerm === "all" ? "#3b8db3" : "#f8fafc",
                        color: selectedTerm === "all" ? "#ffffff" : "#334155",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      All Terms
                    </button>
                    {(activeTerms.length > 0 ? activeTerms : ["Term 1", "Term 2"]).map((trm) => {
                      const isSel = selectedTerm.toLowerCase().replace(/[^a-z0-9]/g, "") === trm.toLowerCase().replace(/[^a-z0-9]/g, "");
                      return (
                        <button
                          key={trm}
                          onClick={() => setSelectedTerm(trm)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            border: isSel ? "none" : "1px solid #cbd5e1",
                            background: isSel ? "#3b8db3" : "#ffffff",
                            color: isSel ? "#ffffff" : "#1e293b",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                            boxShadow: isSel ? "0 4px 12px rgba(59,141,179,0.25)" : "none",
                          }}
                        >
                          {trm}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Assigned Course List Grid using 3D Animated Classroom Cards */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>
                  Assigned Courses ({displayedCourses.length})
                </h2>
                <div style={{ fontSize: "13px", color: "#64748b" }}>
                  Active Filter: <strong>{selectedLevel === "all" ? "All Levels" : selectedLevel}</strong> • <strong>{selectedTerm === "all" ? "All Terms" : selectedTerm}</strong>
                </div>
              </div>

              {displayedCourses.length === 0 ? (
                <div style={{ padding: "40px", background: "#ffffff", borderRadius: "12px", textAlign: "center", color: "#94a3b8" }}>
                  No courses found matching selected Level ({selectedLevel}) and Term ({selectedTerm}).
                </div>
              ) : (
                <div className="lectures-grid">
                  {displayedCourses.map((c) => {
                    const banner = getCourseBanner(c);

                    return (
                      <div
                        key={c._id}
                        className="classroom-course-card"
                        onClick={() => navigate(`/course/${c._id}`)}
                      >
                        {/* 3D Gradient Banner Top Portion */}
                        <div
                          className="classroom-banner"
                          style={{ background: banner.gradient }}
                        >
                          {/* Decorative shapes */}
                          <div className="classroom-banner-shapes">
                            <div className="classroom-banner-shape-1"></div>
                            <div className="classroom-banner-shape-2"></div>
                            <div className="classroom-banner-shape-3"></div>
                            <div className="classroom-banner-shape-4"></div>
                            <div className="classroom-banner-shape-5"></div>
                            <div className="classroom-banner-shape-6"></div>
                          </div>

                          <div className="classroom-banner-content">
                            <h3 className="classroom-course-name" title={c.name || c.courseTitle}>
                              {c.name || c.courseTitle}
                            </h3>
                            <p className="classroom-course-code">
                              {c.displayCode || c.courseCode}
                            </p>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                              {c.session && (
                                <span style={{ background: "rgba(255,255,255,0.25)", color: "#ffffff", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" }}>
                                  {c.session}
                                </span>
                              )}
                              {c.level && (
                                <span style={{ background: "rgba(255,255,255,0.25)", color: "#ffffff", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" }}>
                                  {c.level}
                                </span>
                              )}
                              {c.term && (
                                <span style={{ background: "rgba(255,255,255,0.25)", color: "#ffffff", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" }}>
                                  {c.term}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="classroom-card-body">
                          {/* Floating Avatar of Instructor */}
                          <div className="classroom-avatar-wrapper">
                            <div
                              className="classroom-avatar"
                              style={{ background: banner.accent }}
                            >
                              {c.teacher?.profilePicture ? (
                                <img
                                  src={c.teacher.profilePicture}
                                  alt={c.teacher.name || "Teacher"}
                                  className="classroom-avatar-img"
                                />
                              ) : (
                                c.teacher?.name ? c.teacher.name.charAt(0).toUpperCase() : "T"
                              )}
                            </div>
                          </div>

                          <div className="classroom-meta-info">
                            <span className="classroom-student-count">
                              <FiUsers size={12} style={{ marginRight: 6 }} />
                              {c.totalEnrolled || c.students?.length || 0} students
                            </span>
                            {c.teacher?.name && (
                              <span
                                className="classroom-teacher-name"
                                title={c.teacher.name}
                                style={{ fontSize: 13, color: "var(--text-gray)" }}
                              >
                                {c.teacher.name}
                              </span>
                            )}
                          </div>

                          {/* Actions Area */}
                          <div className="classroom-actions" style={{ gap: 8, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
                            {c.joinCode && (
                              <div
                                className="join-code-container"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "rgba(59, 141, 179, 0.08)",
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  marginRight: "auto"
                                }}
                              >
                                <span style={{ fontSize: 10, color: "var(--text-gray)", fontWeight: 600 }}>
                                  Code:
                                </span>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    letterSpacing: 1,
                                    fontSize: 12,
                                    color: "var(--primary)",
                                  }}
                                >
                                  {c.joinCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => copyJoinCode(c.joinCode, e)}
                                  title="Copy join code"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 2,
                                    color: "var(--primary)",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <FiCopy size={11} />
                                </button>
                              </div>
                            )}

                            <button
                              className="btn-primary btn-sm"
                              onClick={() => navigate(`/course/${c._id}`)}
                              style={{ marginLeft: c.joinCode ? "0" : "auto", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              Open Course <FiArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
