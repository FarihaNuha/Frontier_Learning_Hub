import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiBookOpen,
  FiUsers,
  FiCheckCircle,
  FiAward,
  FiRefreshCw,
  FiCalendar,
  FiClipboard,
  FiArrowRight,
  FiUserCheck,
  FiLayers,
} from "react-icons/fi";
import TeacherSidebar from "./TeacherSidebar";
import "../styles/dashboard.css";

export default function TeacherHomeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
    isAdviser: false,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <TeacherSidebar currentPage="dashboard" />

      <div
        style={{
          flex: 1,
          padding: "36px 32px",
          marginLeft: 0,
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ color: "#1e293b", margin: 0, fontSize: "28px", fontWeight: 800 }}>
              Teacher Overview Dashboard
            </h1>
            <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14.5px" }}>
              Welcome back, <strong>{user?.name || "Faculty Member"}</strong>! Here is your academic overview, adviser portal, and quick management hub.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "700",
                background: summary.isAdviser ? "#dcfce7" : "#e2e8f0",
                color: summary.isAdviser ? "#15803d" : "#475569",
                border: `1px solid ${summary.isAdviser ? "#86efac" : "#cbd5e1"}`,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FiUserCheck size={16} /> {summary.isAdviser ? `Assigned Adviser (${user?.department || "EDTE"})` : `Faculty Member (${user?.department || "EDTE"})`}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b", fontSize: "15px" }}>
            Loading dashboard metrics...
          </div>
        ) : (
          <>
            {/* 1. Interactive 3 Primary Counter Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
                marginBottom: "36px",
              }}
            >
              {/* Card 1: Assigned Courses */}
              <div
                onClick={() => navigate("/courses")}
                style={{
                  background: "#ffffff",
                  padding: "24px",
                  borderRadius: "16px",
                  boxShadow: "0 4px 16px rgba(59, 141, 179, 0.08)",
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <span style={{ fontSize: "13.5px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Assigned Courses
                    </span>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                      {summary.totalAssignedCourses}
                    </div>
                  </div>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, #e0f2fe, #bae6fd)", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FiBookOpen size={24} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#0284c7", fontWeight: 600 }}>
                  View All Assigned Courses <FiArrowRight size={14} />
                </div>
              </div>

              {/* Card 2: Total Students */}
              <div
                onClick={() => navigate("/teacher/enrolled-students")}
                style={{
                  background: "#ffffff",
                  padding: "24px",
                  borderRadius: "16px",
                  boxShadow: "0 4px 16px rgba(59, 141, 179, 0.08)",
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <span style={{ fontSize: "13.5px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Total Enrolled Students
                    </span>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                      {summary.totalStudents}
                    </div>
                  </div>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, #dcfce7, #bbf7d0)", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FiUsers size={24} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#15803d", fontWeight: 600 }}>
                  View Student Directory <FiArrowRight size={14} />
                </div>
              </div>

              {/* Card 3: Pending Registrations (Adviser) */}
              <div
                onClick={() => navigate("/teacher/registration-approval")}
                style={{
                  background: summary.pendingRegistrationRequests > 0 ? "#fff1f2" : "#ffffff",
                  padding: "24px",
                  borderRadius: "16px",
                  boxShadow: summary.pendingRegistrationRequests > 0 ? "0 4px 20px rgba(225,29,72,0.1)" : "0 4px 16px rgba(59, 141, 179, 0.08)",
                  border: summary.pendingRegistrationRequests > 0 ? "1.5px solid #fecdd3" : "1px solid #cbd5e1",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <span style={{ fontSize: "13.5px", color: summary.pendingRegistrationRequests > 0 ? "#be123c" : "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Pending Registrations
                    </span>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: summary.pendingRegistrationRequests > 0 ? "#e11d48" : "#0f172a", marginTop: "4px" }}>
                      {summary.pendingRegistrationRequests}
                    </div>
                  </div>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: summary.pendingRegistrationRequests > 0 ? "linear-gradient(135deg, #fee2e2, #fca5a5)" : "linear-gradient(135deg, #f1f5f9, #e2e8f0)", color: summary.pendingRegistrationRequests > 0 ? "#be123c" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FiCheckCircle size={24} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: summary.pendingRegistrationRequests > 0 ? "#be123c" : "#475569", fontWeight: 600 }}>
                  {summary.isAdviser ? (summary.pendingRegistrationRequests > 0 ? "Action Required: Review Applications" : "All Registrations Approved") : "Adviser Alignment Portal"} <FiArrowRight size={14} />
                </div>
              </div>
            </div>

            {/* 2. Interactive Academic Management Hub Grid */}
            <div style={{ marginBottom: "36px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <FiLayers size={22} color="#0284c7" />
                <h2 style={{ margin: 0, fontSize: "20px", color: "#0f172a", fontWeight: 700 }}>
                  Academic Management Hub & Shortcuts
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                {/* Hub Item 1: Registration Approval */}
                <div
                  onClick={() => navigate("/teacher/registration-approval")}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    padding: "22px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0284c7")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#fff7ed", color: "#c2410c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FiCheckCircle size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a", fontWeight: 700 }}>Registration Approval</h3>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Batch Adviser Panel</span>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 14px 0", color: "#475569", fontSize: "13px", lineHeight: "1.5" }}>
                    Review, approve, or reject student level-term course registration applications for your assigned batch.
                  </p>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#c2410c", display: "flex", alignItems: "center", gap: "4px" }}>
                    Open Approval Portal <FiArrowRight size={13} />
                  </div>
                </div>

                {/* Hub Item 2: Result Publication */}
                <div
                  onClick={() => navigate("/teacher/results")}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    padding: "22px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0284c7")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#f0fdf4", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FiAward size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a", fontWeight: 700 }}>Result Publication</h3>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Marks & Grade Processing</span>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 14px 0", color: "#475569", fontSize: "13px", lineHeight: "1.5" }}>
                    Upload assessment Excel sheets, calculate semester GPA/CGPA, and publish official student result sheets.
                  </p>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#166534", display: "flex", alignItems: "center", gap: "4px" }}>
                    Manage Results <FiArrowRight size={13} />
                  </div>
                </div>

                {/* Hub Item 3: Retake Approval */}
                <div
                  onClick={() => navigate("/teacher/retake-approval")}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    padding: "22px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0284c7")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#eff6ff", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FiRefreshCw size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a", fontWeight: 700 }}>Retake Approval</h3>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Improvement & Retake Panel</span>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 14px 0", color: "#475569", fontSize: "13px", lineHeight: "1.5" }}>
                    Manage student course retake applications, verify eligibility criteria, and process retake approvals.
                  </p>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1d4ed8", display: "flex", alignItems: "center", gap: "4px" }}>
                    View Retake Requests <FiArrowRight size={13} />
                  </div>
                </div>

                {/* Hub Item 4: Enrolled Students */}
                <div
                  onClick={() => navigate("/teacher/enrolled-students")}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    padding: "22px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0284c7")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#fbfbfe", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FiUsers size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a", fontWeight: 700 }}>Enrolled Students</h3>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Student Roster Directory</span>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 14px 0", color: "#475569", fontSize: "13px", lineHeight: "1.5" }}>
                    Inspect full student roster, filter by academic session or level-term, and review academic profiles.
                  </p>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#7c3aed", display: "flex", alignItems: "center", gap: "4px" }}>
                    Browse Roster <FiArrowRight size={13} />
                  </div>
                </div>

                {/* Hub Item 5: Notice Board */}
                <div
                  onClick={() => navigate("/teacher/notices")}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    padding: "22px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0284c7")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#f0fdfa", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FiClipboard size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a", fontWeight: 700 }}>Notice Board</h3>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Announcements & Emails</span>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 14px 0", color: "#475569", fontSize: "13px", lineHeight: "1.5" }}>
                    Publish class announcements, exam notifications, and dispatch instant email alerts to enrolled students.
                  </p>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0d9488", display: "flex", alignItems: "center", gap: "4px" }}>
                    Publish Notices <FiArrowRight size={13} />
                  </div>
                </div>

                {/* Hub Item 6: Academic Calendar */}
                <div
                  onClick={() => navigate("/academic-calendar")}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    padding: "22px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0284c7")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FiCalendar size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a", fontWeight: 700 }}>Academic Calendar</h3>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Semester Schedule</span>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 14px 0", color: "#475569", fontSize: "13px", lineHeight: "1.5" }}>
                    Check university registration schedules, examination windows, and official academic term dates.
                  </p>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#b45309", display: "flex", alignItems: "center", gap: "4px" }}>
                    View Calendar <FiArrowRight size={13} />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Bottom Direct Banner to My Courses */}
            <div
              style={{
                background: "linear-gradient(135deg, #0284c7, #0369a1)",
                borderRadius: "16px",
                padding: "24px 28px",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
                boxShadow: "0 8px 24px rgba(2,132,199,0.2)",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: 700 }}>
                  Need to manage your assigned course study materials & LMS classrooms?
                </h3>
                <p style={{ margin: 0, fontSize: "14px", color: "#e0f2fe" }}>
                  All your assigned courses, lecture materials, and LMS classroom access are available under <strong>My Courses</strong>.
                </p>
              </div>

              <button
                onClick={() => navigate("/courses")}
                style={{
                  padding: "12px 24px",
                  background: "#ffffff",
                  color: "#0284c7",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                Go to My Courses <FiArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
