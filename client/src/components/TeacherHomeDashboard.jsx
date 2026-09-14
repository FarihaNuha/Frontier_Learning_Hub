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
                  background: "radial-gradient(ellipse at center, #ffffff 25%, #bce5f7 65%, #3B8DB3 100%)",
                  padding: "24px",
                  borderRadius: "16px",
                  boxShadow: "0 4px 16px rgba(59, 141, 179, 0.15)",
                  border: "1.5px solid #7EC8E3",
                  cursor: "pointer",
                  transition: "all 0.25s ease-in-out",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 141, 179, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(59, 141, 179, 0.15)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <span style={{ fontSize: "13.5px", color: "#1e293b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Assigned Courses
                    </span>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                      {summary.totalAssignedCourses}
                    </div>
                  </div>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.9)", border: "1px solid #7EC8E3", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <FiBookOpen size={24} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#0d9488", fontWeight: 700 }}>
                  View All Assigned Courses <FiArrowRight size={14} />
                </div>
              </div>

              {/* Card 2: Total Students */}
              <div
                onClick={() => navigate("/teacher/enrolled-students")}
                style={{
                  background: "radial-gradient(ellipse at center, #ffffff 25%, #bce5f7 65%, #3B8DB3 100%)",
                  padding: "24px",
                  borderRadius: "16px",
                  boxShadow: "0 4px 16px rgba(59, 141, 179, 0.15)",
                  border: "1.5px solid #7EC8E3",
                  cursor: "pointer",
                  transition: "all 0.25s ease-in-out",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 141, 179, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(59, 141, 179, 0.15)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <span style={{ fontSize: "13.5px", color: "#1e293b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Total Enrolled Students
                    </span>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
                      {summary.totalStudents}
                    </div>
                  </div>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.9)", border: "1px solid #7EC8E3", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <FiUsers size={24} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#0d9488", fontWeight: 700 }}>
                  View Student Directory <FiArrowRight size={14} />
                </div>
              </div>

              {/* Card 3: Pending Registrations (Adviser) */}
              <div
                onClick={() => navigate("/teacher/registration-approval")}
                style={{
                  background: "radial-gradient(ellipse at center, #ffffff 25%, #bce5f7 65%, #3B8DB3 100%)",
                  padding: "24px",
                  borderRadius: "16px",
                  boxShadow: summary.pendingRegistrationRequests > 0 ? "0 4px 20px rgba(225,29,72,0.15)" : "0 4px 16px rgba(59, 141, 179, 0.15)",
                  border: summary.pendingRegistrationRequests > 0 ? "1.5px solid #fca5a5" : "1.5px solid #7EC8E3",
                  cursor: "pointer",
                  transition: "all 0.25s ease-in-out",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 141, 179, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = summary.pendingRegistrationRequests > 0 ? "0 4px 20px rgba(225,29,72,0.15)" : "0 4px 16px rgba(59, 141, 179, 0.15)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <span style={{ fontSize: "13.5px", color: summary.pendingRegistrationRequests > 0 ? "#be123c" : "#1e293b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Pending Registrations
                    </span>
                    <div style={{ fontSize: "32px", fontWeight: 800, color: summary.pendingRegistrationRequests > 0 ? "#e11d48" : "#0f172a", marginTop: "4px" }}>
                      {summary.pendingRegistrationRequests}
                    </div>
                  </div>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.9)", border: summary.pendingRegistrationRequests > 0 ? "1px solid #fca5a5" : "1px solid #7EC8E3", color: summary.pendingRegistrationRequests > 0 ? "#be123c" : "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <FiCheckCircle size={24} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: summary.pendingRegistrationRequests > 0 ? "#be123c" : "#0d9488", fontWeight: 700 }}>
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
                    background: "radial-gradient(ellipse at center, #ffffff 25%, #bce5f7 65%, #3B8DB3 100%)",
                    borderRadius: "16px",
                    padding: "22px",
                    border: "1.5px solid #7EC8E3",
                    boxShadow: "0 4px 14px rgba(59, 141, 179, 0.12)",
                    cursor: "pointer",
                    transition: "all 0.25s ease-in-out",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "120px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 141, 179, 0.25)";
                    e.currentTarget.style.borderColor = "#3B8DB3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(59, 141, 179, 0.12)";
                    e.currentTarget.style.borderColor = "#7EC8E3";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.95)", border: "1px solid #7EC8E3", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", flexShrink: 0 }}>
                      <FiCheckCircle size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 2px 0", fontSize: "18px", color: "#0f172a", fontWeight: 800, letterSpacing: "-0.2px" }}>Registration Approval</h3>
                      <span style={{ fontSize: "12.5px", color: "#334155", fontWeight: 600 }}>Batch Adviser Panel</span>
                    </div>
                  </div>
                  <div style={{ marginTop: "16px", fontSize: "13.5px", fontWeight: 700, color: "#0d9488", display: "flex", alignItems: "center", gap: "5px" }}>
                    Open Approval Portal <FiArrowRight size={14} />
                  </div>
                </div>

                {/* Hub Item 2: Result Publication */}
                <div
                  onClick={() => navigate("/teacher/results")}
                  style={{
                    background: "radial-gradient(ellipse at center, #ffffff 25%, #bce5f7 65%, #3B8DB3 100%)",
                    borderRadius: "16px",
                    padding: "22px",
                    border: "1.5px solid #7EC8E3",
                    boxShadow: "0 4px 14px rgba(59, 141, 179, 0.12)",
                    cursor: "pointer",
                    transition: "all 0.25s ease-in-out",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "120px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 141, 179, 0.25)";
                    e.currentTarget.style.borderColor = "#3B8DB3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(59, 141, 179, 0.12)";
                    e.currentTarget.style.borderColor = "#7EC8E3";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.95)", border: "1px solid #7EC8E3", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", flexShrink: 0 }}>
                      <FiAward size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 2px 0", fontSize: "18px", color: "#0f172a", fontWeight: 800, letterSpacing: "-0.2px" }}>Result</h3>
                      <span style={{ fontSize: "12.5px", color: "#334155", fontWeight: 600 }}>Marks & Grade Processing</span>
                    </div>
                  </div>
                  <div style={{ marginTop: "16px", fontSize: "13.5px", fontWeight: 700, color: "#0d9488", display: "flex", alignItems: "center", gap: "5px" }}>
                    Manage Results <FiArrowRight size={14} />
                  </div>
                </div>

                {/* Hub Item 3: Retake Approval */}
                <div
                  onClick={() => navigate("/teacher/retake-approval")}
                  style={{
                    background: "radial-gradient(ellipse at center, #ffffff 25%, #bce5f7 65%, #3B8DB3 100%)",
                    borderRadius: "16px",
                    padding: "22px",
                    border: "1.5px solid #7EC8E3",
                    boxShadow: "0 4px 14px rgba(59, 141, 179, 0.12)",
                    cursor: "pointer",
                    transition: "all 0.25s ease-in-out",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "120px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 141, 179, 0.25)";
                    e.currentTarget.style.borderColor = "#3B8DB3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(59, 141, 179, 0.12)";
                    e.currentTarget.style.borderColor = "#7EC8E3";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.95)", border: "1px solid #7EC8E3", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", flexShrink: 0 }}>
                      <FiRefreshCw size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 2px 0", fontSize: "18px", color: "#0f172a", fontWeight: 800, letterSpacing: "-0.2px" }}>Retake Approval</h3>
                      <span style={{ fontSize: "12.5px", color: "#334155", fontWeight: 600 }}>Improvement & Retake Panel</span>
                    </div>
                  </div>
                  <div style={{ marginTop: "16px", fontSize: "13.5px", fontWeight: 700, color: "#0d9488", display: "flex", alignItems: "center", gap: "5px" }}>
                    View Retake Requests <FiArrowRight size={14} />
                  </div>
                </div>

                {/* Hub Item 4: Enrolled Students */}
                <div
                  onClick={() => navigate("/teacher/enrolled-students")}
                  style={{
                    background: "radial-gradient(ellipse at center, #ffffff 25%, #bce5f7 65%, #3B8DB3 100%)",
                    borderRadius: "16px",
                    padding: "22px",
                    border: "1.5px solid #7EC8E3",
                    boxShadow: "0 4px 14px rgba(59, 141, 179, 0.12)",
                    cursor: "pointer",
                    transition: "all 0.25s ease-in-out",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "120px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 141, 179, 0.25)";
                    e.currentTarget.style.borderColor = "#3B8DB3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(59, 141, 179, 0.12)";
                    e.currentTarget.style.borderColor = "#7EC8E3";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.95)", border: "1px solid #7EC8E3", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", flexShrink: 0 }}>
                      <FiUsers size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 2px 0", fontSize: "18px", color: "#0f172a", fontWeight: 800, letterSpacing: "-0.2px" }}>Enrolled Students</h3>
                      <span style={{ fontSize: "12.5px", color: "#334155", fontWeight: 600 }}>Student Roster Directory</span>
                    </div>
                  </div>
                  <div style={{ marginTop: "16px", fontSize: "13.5px", fontWeight: 700, color: "#0d9488", display: "flex", alignItems: "center", gap: "5px" }}>
                    Browse Roster <FiArrowRight size={14} />
                  </div>
                </div>

                {/* Hub Item 5: Notice Board */}
                <div
                  onClick={() => navigate("/teacher/notices")}
                  style={{
                    background: "radial-gradient(ellipse at center, #ffffff 25%, #bce5f7 65%, #3B8DB3 100%)",
                    borderRadius: "16px",
                    padding: "22px",
                    border: "1.5px solid #7EC8E3",
                    boxShadow: "0 4px 14px rgba(59, 141, 179, 0.12)",
                    cursor: "pointer",
                    transition: "all 0.25s ease-in-out",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "120px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 141, 179, 0.25)";
                    e.currentTarget.style.borderColor = "#3B8DB3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(59, 141, 179, 0.12)";
                    e.currentTarget.style.borderColor = "#7EC8E3";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.95)", border: "1px solid #7EC8E3", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", flexShrink: 0 }}>
                      <FiClipboard size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 2px 0", fontSize: "18px", color: "#0f172a", fontWeight: 800, letterSpacing: "-0.2px" }}>Notice Board</h3>
                      <span style={{ fontSize: "12.5px", color: "#334155", fontWeight: 600 }}>Announcements & Emails</span>
                    </div>
                  </div>
                  <div style={{ marginTop: "16px", fontSize: "13.5px", fontWeight: 700, color: "#0d9488", display: "flex", alignItems: "center", gap: "5px" }}>
                    Publish Notices <FiArrowRight size={14} />
                  </div>
                </div>

                {/* Hub Item 6: Academic Calendar */}
                <div
                  onClick={() => navigate("/academic-calendar")}
                  style={{
                    background: "radial-gradient(ellipse at center, #ffffff 25%, #bce5f7 65%, #3B8DB3 100%)",
                    borderRadius: "16px",
                    padding: "22px",
                    border: "1.5px solid #7EC8E3",
                    boxShadow: "0 4px 14px rgba(59, 141, 179, 0.12)",
                    cursor: "pointer",
                    transition: "all 0.25s ease-in-out",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "120px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 141, 179, 0.25)";
                    e.currentTarget.style.borderColor = "#3B8DB3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(59, 141, 179, 0.12)";
                    e.currentTarget.style.borderColor = "#7EC8E3";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.95)", border: "1px solid #7EC8E3", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", flexShrink: 0 }}>
                      <FiCalendar size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 2px 0", fontSize: "18px", color: "#0f172a", fontWeight: 800, letterSpacing: "-0.2px" }}>Academic Calendar</h3>
                      <span style={{ fontSize: "12.5px", color: "#334155", fontWeight: 600 }}>Semester Schedule</span>
                    </div>
                  </div>
                  <div style={{ marginTop: "16px", fontSize: "13.5px", fontWeight: 700, color: "#0d9488", display: "flex", alignItems: "center", gap: "5px" }}>
                    View Calendar <FiArrowRight size={14} />
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
                  Need to access and manage your assigned courses?
                </h3>
                <p style={{ margin: 0, fontSize: "14px", color: "#e0f2fe" }}>
                  All your assigned courses, lecture contents, and syllabus materials are organized under <strong>My Courses</strong>.
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
