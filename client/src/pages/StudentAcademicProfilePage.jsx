import React, { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiUser,
  FiAward,
  FiBookOpen,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiLayers,
  FiMail,
  FiPhone,
  FiHome,
  FiFileText,
} from "react-icons/fi";
import StudentSidebar from "../components/StudentSidebar";
import "../styles/dashboard.css";

export default function StudentAcademicProfilePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/academic/student/profile")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        toast.error("Failed to load academic profile.", { id: "academic-profile-error" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const profile = data?.profile || {};
  const completedCourses = data?.completedCourses || [];
  const incompleteCourses = data?.incompleteCourses || [];
  const retakes = data?.retakes || [];

  // Group incomplete courses by Semester (Level & Term)
  const groupedIncompleteCourses = useMemo(() => {
    const groups = {};
    incompleteCourses.forEach((course) => {
      let lvl = course.level ? course.level.replace("-", " ").trim() : "Level 1";
      let trm = course.term ? course.term.replace("-", " ").trim() : "Term 1";
      const semKey = `${lvl} • ${trm}`;
      if (!groups[semKey]) {
        groups[semKey] = {
          level: lvl,
          term: trm,
          courses: [],
          totalCredits: 0,
        };
      }
      groups[semKey].courses.push(course);
      groups[semKey].totalCredits += Number(course.creditHours) || 0;
    });

    return Object.entries(groups).sort(([keyA, a], [keyB, b]) => {
      const getNum = (str) => {
        const m = str.match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      };
      const lvlA = getNum(a.level);
      const lvlB = getNum(b.level);
      if (lvlA !== lvlB) return lvlA - lvlB;
      const trmA = getNum(a.term);
      const trmB = getNum(b.term);
      return trmA - trmB;
    });
  }, [incompleteCourses]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#E8F4FD" }}>
      <StudentSidebar currentPage="academic-profile" />

      <div style={{ flex: 1, padding: "36px 32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #7EC8E3, #3B8DB3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(59,141,179,0.25)" }}>
              <FiUser size={22} />
            </div>
            <h1 style={{ color: "#1e293b", margin: 0, fontSize: "28px", fontWeight: 800 }}>
              Student Academic Profile
            </h1>
          </div>
          <p style={{ color: "#3B8DB3", fontWeight: 600, margin: 0, fontSize: "14.5px" }}>
            Official academic standing, cumulative CGPA, earned credits, completed courses, and department curriculum roster.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b", fontSize: "15px" }}>Loading academic profile...</div>
        ) : (
          <>
            {/* Student Identity Banner Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                borderRadius: "20px",
                padding: "28px 32px",
                color: "#ffffff",
                boxShadow: "0 10px 25px -5px rgba(15,23,42,0.3)",
                marginBottom: "32px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #38bdf8, #0284c7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "28px",
                    fontWeight: 800,
                    boxShadow: "0 4px 14px rgba(2,132,199,0.4)",
                    border: "3px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {(profile.studentName || "S").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#ffffff" }}>
                      {profile.studentName || "Student"}
                    </h2>
                    <span style={{ background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", padding: "3px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(56, 189, 248, 0.4)" }}>
                      ID: {profile.studentId || "N/A"}
                    </span>
                  </div>
                  <div style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px" }}>
                    Department of <strong>{profile.department || "EDTE"}</strong> {profile.program ? `• ${profile.program}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: "18px", marginTop: "12px", fontSize: "13.5px", color: "#cbd5e1", flexWrap: "wrap" }}>
                    <span>Session: <strong style={{ color: "#ffffff" }}>{profile.session || "2024-25"}</strong></span>
                    <span>Batch: <strong style={{ color: "#ffffff" }}>{profile.batch || (profile.session ? profile.session.split("-")[0] : "2024")}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                <span
                  style={{
                    padding: "8px 20px",
                    borderRadius: "20px",
                    fontWeight: 800,
                    fontSize: "14px",
                    background: profile.academicStatus === "Graduated" ? "#dcfce7" : profile.academicStatus === "Probation" ? "#fee2e2" : profile.academicStatus === "Retake" ? "#fef3c7" : "#e0f2fe",
                    color: profile.academicStatus === "Graduated" ? "#166534" : profile.academicStatus === "Probation" ? "#991b1b" : profile.academicStatus === "Retake" ? "#b45309" : "#0369a1",
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                >
                  Status: {profile.academicStatus || "Regular / Good Standing"}
                </span>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                  Current Level: <strong style={{ color: "#38bdf8" }}>{profile.currentLevel || "Level-1"}</strong> • <strong style={{ color: "#38bdf8" }}>{profile.currentTerm || "Term-1"}</strong>
                </div>
              </div>
            </div>

            {/* Top Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "18px", marginBottom: "32px" }}>
              {/* Overall CGPA */}
              <div style={{ background: "#ffffff", padding: "22px 24px", borderRadius: "16px", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", border: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Overall CGPA</div>
                <div style={{ fontSize: "30px", fontWeight: 900, color: "#0284c7" }}>
                  {Number(profile.currentCGPA || profile.cgpaSummary?.overallCGPA || 0).toFixed(2)} <span style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>/ 4.00</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>Average across completed semesters</div>
              </div>

              {/* Previous Semester GPA */}
              <div style={{ background: "#ffffff", padding: "22px 24px", borderRadius: "16px", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", border: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Previous Semester GPA</div>
                <div style={{ fontSize: "30px", fontWeight: 900, color: "#8b5cf6" }}>
                  {Number(profile.lastSemesterGPA || profile.cgpaSummary?.lastSemGPA || 0).toFixed(2)} <span style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>/ 4.00</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>GPA of last completed semester</div>
              </div>

              {/* Credits Earned */}
              <div style={{ background: "#ffffff", padding: "22px 24px", borderRadius: "16px", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", border: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Credits Earned</div>
                <div style={{ fontSize: "30px", fontWeight: 900, color: "#16a34a" }}>
                  {profile.totalCreditsEarned || profile.cgpaSummary?.totalCreditsEarned || 0} <span style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>/ {profile.totalCreditsRequired || 140}</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>Completed course credits out of 140</div>
              </div>

              {/* Credits Remaining */}
              <div style={{ background: "#ffffff", padding: "22px 24px", borderRadius: "16px", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", border: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Credits Remaining</div>
                <div style={{ fontSize: "30px", fontWeight: 900, color: "#ea580c" }}>
                  {profile.creditsRemaining !== undefined ? profile.creditsRemaining : (profile.cgpaSummary?.creditsRemaining !== undefined ? profile.cgpaSummary.creditsRemaining : 140)} <span style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>Credits</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>Remaining degree credits</div>
              </div>

              {/* Current Level & Term */}
              <div style={{ background: "#ffffff", padding: "22px 24px", borderRadius: "16px", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", border: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Current Level & Term</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
                  {profile.currentLevel || "Level-1"} {profile.currentTerm ? (String(profile.currentTerm).startsWith("Term") ? `• ${profile.currentTerm}` : `• Term-${profile.currentTerm}`) : "• Term-1"}
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>Currently registered level & term</div>
              </div>
            </div>

            {/* Completed Courses Table */}
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", marginBottom: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiCheckCircle style={{ color: "#16a34a" }} /> Completed Academic Courses ({completedCourses.length})
                </h3>
              </div>

              {completedCourses.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", background: "#E8F4FD", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  No published course results recorded yet. Completed course grades will appear here as soon as teachers publish results.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#e2e8f0", color: "#0f172a", fontWeight: 700, borderBottom: "1.5px solid #cbd5e1" }}>
                        <th style={{ padding: "12px 16px" }}>Course Code</th>
                        <th style={{ padding: "12px 16px" }}>Course Title</th>
                        <th style={{ padding: "12px 16px" }}>Credits</th>
                        <th style={{ padding: "12px 16px" }}>Letter Grade</th>
                        <th style={{ padding: "12px 16px" }}>Grade Point</th>
                        <th style={{ padding: "12px 16px" }}>Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedCourses.map((c, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0284c7" }}>{c.courseCode}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>{c.courseTitle}</td>
                          <td style={{ padding: "12px 16px" }}>{c.creditHours}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "3px 10px", borderRadius: "6px", fontWeight: 800, fontSize: "12px", background: "#dcfce7", color: "#15803d" }}>
                              {c.letterGrade}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 800, color: "#0f172a" }}>
                            {c.gradePoint !== undefined && c.gradePoint !== null && !isNaN(Number(c.gradePoint))
                              ? Number(c.gradePoint).toFixed(2)
                              : c.gradePoint}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#64748b" }}>{c.completedSession}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Department Curriculum Roster (Remaining Courses for Student's Department - Semester-wise) */}
            <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", marginBottom: "32px" }}>
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 4px 0", color: "#0f172a", fontSize: "18px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiBookOpen style={{ color: "#0284c7" }} /> Remaining Department Curriculum Courses ({incompleteCourses.length})
                </h3>
                <p style={{ margin: 0, color: "#64748b", fontSize: "13.5px" }}>
                  Official curriculum syllabus for Department of <strong>{profile.department}</strong> organized semester-wise.
                </p>
              </div>

              {incompleteCourses.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#166534", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0", fontWeight: 700 }}>
                  🎉 Congratulations! You have completed all required curriculum courses for your degree.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                  {groupedIncompleteCourses.map(([semKey, group]) => (
                    <div
                      key={semKey}
                      style={{
                        background: "#E8F4FD",
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        padding: "18px 20px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                      }}
                    >
                      {/* Semester Header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "14px",
                          paddingBottom: "10px",
                          borderBottom: "1.5px solid #e2e8f0",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              background: "linear-gradient(135deg, #0284c7, #0369a1)",
                              color: "#ffffff",
                              fontSize: "13px",
                              fontWeight: 800,
                              padding: "4px 12px",
                              borderRadius: "8px",
                              letterSpacing: "0.3px",
                            }}
                          >
                            {group.level} — {group.term}
                          </span>
                          <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#334155" }}>
                            {group.courses.length} {group.courses.length === 1 ? "Course" : "Courses"}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "6px",
                            background: "#e0f2fe",
                            color: "#0369a1",
                          }}
                        >
                          Total: {group.totalCredits} Credits
                        </span>
                      </div>

                      {/* Course Cards Grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {group.courses.map((ci) => (
                          <div
                            key={ci._id || ci.courseCode}
                            style={{
                              background: "#ffffff",
                              padding: "14px 16px",
                              borderRadius: "10px",
                              border: "1px solid #cbd5e1",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "6px",
                                }}
                              >
                                <span style={{ fontWeight: 800, color: "#0284c7", fontSize: "13.5px" }}>
                                  {ci.courseCode}
                                </span>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    padding: "2px 7px",
                                    borderRadius: "5px",
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  {ci.creditHours} Cr
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "13.5px",
                                  color: "#0f172a",
                                  fontWeight: 600,
                                  lineHeight: "1.35",
                                }}
                              >
                                {ci.courseTitle}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: "11.5px",
                                color: "#64748b",
                                marginTop: "10px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background:
                                    ci.courseType?.toLowerCase().includes("sessional") ||
                                    ci.courseType?.toLowerCase().includes("lab")
                                      ? "#fef3c7"
                                      : "#e0e7ff",
                                  color:
                                    ci.courseType?.toLowerCase().includes("sessional") ||
                                    ci.courseType?.toLowerCase().includes("lab")
                                      ? "#92400e"
                                      : "#3730a3",
                                  fontWeight: 600,
                                  fontSize: "11px",
                                }}
                              >
                                {ci.courseType || "Theory"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Retake / Improvement Requests Log */}
            {retakes.length > 0 && (
              <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "18px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FiAlertCircle style={{ color: "#ea580c" }} /> Retake & Grade Improvement Log ({retakes.length})
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#e2e8f0", color: "#0f172a", fontWeight: 700 }}>
                        <th style={{ padding: "10px 14px" }}>Course Code</th>
                        <th style={{ padding: "10px 14px" }}>Course Title</th>
                        <th style={{ padding: "10px 14px" }}>Request Type</th>
                        <th style={{ padding: "10px 14px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retakes.map((r, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{r.courseCode}</td>
                          <td style={{ padding: "10px 14px" }}>{r.courseTitle}</td>
                          <td style={{ padding: "10px 14px" }}>{r.type || "Retake"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ padding: "3px 10px", borderRadius: "8px", fontWeight: 700, fontSize: "12px", background: r.status === "Approved" ? "#dcfce7" : r.status === "Rejected" ? "#fee2e2" : "#fff7ed", color: r.status === "Approved" ? "#15803d" : r.status === "Rejected" ? "#991b1b" : "#c2410c" }}>
                              {r.status || "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
