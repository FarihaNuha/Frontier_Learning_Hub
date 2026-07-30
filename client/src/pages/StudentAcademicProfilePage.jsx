import React, { useState, useEffect } from "react";
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
        toast.error("Failed to load academic profile.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const profile = data?.profile || {};
  const completedCourses = data?.completedCourses || [];
  const incompleteCourses = data?.incompleteCourses || [];
  const retakes = data?.retakes || [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <StudentSidebar currentPage="academic-profile" />

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #7EC8E3, #3B8DB3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(59,141,179,0.25)" }}>
              <FiUser size={22} />
            </div>
            <h1 style={{ color: "#1e293b", margin: 0, fontSize: "26px", fontWeight: 700 }}>
              Student Academic Profile
            </h1>
          </div>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
            Comprehensive view of academic status, CGPA, credits earned, completed courses, and retakes.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading academic profile...</div>
        ) : (
          <>
            {/* Top Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
              {/* CGPA */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "8px" }}>Overall CGPA</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#3b8db3" }}>{(profile.currentCGPA || 0).toFixed(2)}</div>
              </div>

              {/* Credits Earned */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "8px" }}>Credits Earned</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#16a34a" }}>{profile.totalCreditsEarned || 0} / {profile.totalCreditsRequired || 140}</div>
              </div>

              {/* Credits Remaining */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "8px" }}>Credits Remaining</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#d97706" }}>{profile.creditsRemaining || 0}</div>
              </div>

              {/* Current Level & Term */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "8px" }}>Current Level / Term</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
                  {profile.currentLevel || "Level-1"} {profile.currentTerm ? (profile.currentTerm.startsWith("Term") ? `• ${profile.currentTerm}` : `• Term-${profile.currentTerm}`) : "• Term-1"}
                </div>
              </div>

              {/* Academic Status */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "8px" }}>Academic Status</div>
                <span style={{ padding: "6px 14px", borderRadius: "12px", fontWeight: 700, fontSize: "13px", background: profile.academicStatus === "Graduated" ? "#dcfce7" : profile.academicStatus === "Probation" ? "#fee2e2" : profile.academicStatus === "Retake" ? "#fef3c7" : "#e0f2fe", color: profile.academicStatus === "Graduated" ? "#166534" : profile.academicStatus === "Probation" ? "#991b1b" : profile.academicStatus === "Retake" ? "#b45309" : "#0369a1" }}>
                  {profile.academicStatus || "Regular"}
                </span>
              </div>
            </div>

            {/* Completed Courses Table */}
            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", marginBottom: "32px" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "18px" }}>
                Completed Courses ({completedCourses.length})
              </h3>
              {completedCourses.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No completed courses recorded yet.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", color: "#475569", fontWeight: 700 }}>
                        <th style={{ padding: "10px 14px" }}>Course Code</th>
                        <th style={{ padding: "10px 14px" }}>Course Title</th>
                        <th style={{ padding: "10px 14px" }}>Credits</th>
                        <th style={{ padding: "10px 14px" }}>Letter Grade</th>
                        <th style={{ padding: "10px 14px" }}>Grade Point</th>
                        <th style={{ padding: "10px 14px" }}>Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedCourses.map((c, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#3b8db3" }}>{c.courseCode}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{c.courseTitle}</td>
                          <td style={{ padding: "10px 14px" }}>{c.creditHours}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#16a34a" }}>{c.letterGrade}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700 }}>{c.gradePoint}</td>
                          <td style={{ padding: "10px 14px" }}>{c.completedSession}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Incomplete Courses List */}
            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#0f172a", fontSize: "18px" }}>
                Curriculum Courses Remaining ({incompleteCourses.length})
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                {incompleteCourses.slice(0, 15).map((ci) => (
                  <div key={ci._id} style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 700, color: "#3b8db3", fontSize: "13px" }}>{ci.courseCode}</div>
                    <div style={{ fontSize: "13.5px", color: "#1e293b", fontWeight: 600, marginTop: "2px" }}>{ci.courseTitle}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Credits: {ci.creditHours} • {ci.level} {ci.term}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
