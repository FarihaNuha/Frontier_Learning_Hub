import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import { FiUsers, FiBookOpen, FiAward, FiFilePlus } from "react-icons/fi";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    courses: 0,
    advisers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/ums/admin/stats")
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        console.error("Error fetching stats:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const cardStyle = {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 4px 16px rgba(59, 141, 179, 0.08)",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flex: "1",
    minWidth: "220px"
  };

  const iconContainerStyle = {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "260px", flex: 1, padding: "40px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Welcome to UMS Admin Dashboard</h1>
          <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>Manage students, teachers, courses, and adviser assignments</p>
        </div>

        {loading ? (
          <div>Loading system statistics...</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", marginBottom: "40px" }}>
            <div style={cardStyle}>
              <div style={{ ...iconContainerStyle, background: "#E8F4FD", color: "#3B8DB3" }}>
                <FiUsers size={24} />
              </div>
              <div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>Total Students</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e293b", marginTop: "4px" }}>{stats.students}</div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ ...iconContainerStyle, background: "#ecfdf5", color: "#10b981" }}>
                <FiUsers size={24} />
              </div>
              <div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>Total Teachers</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e293b", marginTop: "4px" }}>{stats.teachers}</div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ ...iconContainerStyle, background: "#fff7ed", color: "#f97316" }}>
                <FiBookOpen size={24} />
              </div>
              <div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>Total Courses</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e293b", marginTop: "4px" }}>{stats.courses}</div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ ...iconContainerStyle, background: "#f5f3ff", color: "#8b5cf6" }}>
                <FiAward size={24} />
              </div>
              <div>
                <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>Active Advisers</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e293b", marginTop: "4px" }}>{stats.advisers}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 4px 16px rgba(59, 141, 179, 0.08)"
        }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#1e293b" }}>Quick System Setup Guide</h3>
          <p style={{ color: "#475569", lineHeight: "1.6", margin: 0 }}>
            To get started, follow these instructions to populate the university database:
          </p>
          <ol style={{ color: "#475569", lineHeight: "1.8", marginTop: "12px", paddingLeft: "20px" }}>
            <li>Navigate to **Students** tab and upload the student roster Excel sheet.</li>
            <li>Navigate to **Teachers** tab to import teacher list and course allocation records.</li>
            <li>Navigate to **Courses** tab to upload curriculum or schedule specifications.</li>
            <li>Navigate to **Adviser Assignment** to import adviser session mapping details.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
