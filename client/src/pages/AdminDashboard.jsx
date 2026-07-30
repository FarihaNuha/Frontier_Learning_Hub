import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import api from "../services/api";
import {
  FiUsers,
  FiBookOpen,
  FiAward,
  FiCheckCircle,
  FiXCircle,
  FiPieChart,
  FiLayers,
  FiArrowRight,
  FiTrendingUp,
} from "react-icons/fi";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    students: { total: 0, active: 0, inactive: 0 },
    teachers: { total: 0, active: 0, inactive: 0 },
    advisers: { total: 0, active: 0, inactive: 0 },
    courses: 0,
    deptStudentCounts: {},
    deptTeacherCounts: {},
    sessionStudentCounts: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/ums/admin/stats")
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
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 4px 16px rgba(59, 141, 179, 0.08)",
    border: "1px solid #e2e8f0",
    flex: "1 1 240px",
    minWidth: "240px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  };

  const iconContainerStyle = {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const activeBadgeStyle = {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 10px",
    borderRadius: "20px",
    background: "#dcfce7",
    color: "#15803d",
    fontSize: "12.5px",
    fontWeight: "700",
  };

  const inactiveBadgeStyle = {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 10px",
    borderRadius: "20px",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: "12.5px",
    fontWeight: "700",
  };

  const sectionCardStyle = {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid #cbd5e1",
    flex: 1,
    minWidth: "300px",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "260px", flex: 1, padding: "40px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: "28px" }}>Welcome to UMS Admin Dashboard</h1>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading system statistics...</div>
        ) : (
          <>
            {/* Top 4 Primary Counters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "32px" }}>
              {/* 1. Students Card */}
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "600" }}>Students</div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#1e293b", marginTop: "2px" }}>
                      {stats.students?.total || 0}
                    </div>
                  </div>
                  <div style={{ ...iconContainerStyle, background: "#E8F4FD", color: "#3B8DB3" }}>
                    <FiUsers size={22} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                  <span style={activeBadgeStyle}>
                    <FiCheckCircle size={14} /> Active: {stats.students?.active || 0}
                  </span>
                  <span style={inactiveBadgeStyle}>
                    <FiXCircle size={14} /> Inactive: {stats.students?.inactive || 0}
                  </span>
                </div>
              </div>

              {/* 2. Teachers Card */}
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "600" }}>Teachers</div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#1e293b", marginTop: "2px" }}>
                      {stats.teachers?.total || 0}
                    </div>
                  </div>
                  <div style={{ ...iconContainerStyle, background: "#ecfdf5", color: "#10b981" }}>
                    <FiUsers size={22} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                  <span style={activeBadgeStyle}>
                    <FiCheckCircle size={14} /> Active: {stats.teachers?.active || 0}
                  </span>
                  <span style={inactiveBadgeStyle}>
                    <FiXCircle size={14} /> Inactive: {stats.teachers?.inactive || 0}
                  </span>
                </div>
              </div>

              {/* 3. Advisers Card */}
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "600" }}>Advisers</div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#1e293b", marginTop: "2px" }}>
                      {stats.advisers?.total || 0}
                    </div>
                  </div>
                  <div style={{ ...iconContainerStyle, background: "#f5f3ff", color: "#8b5cf6" }}>
                    <FiAward size={22} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                  <span style={activeBadgeStyle}>
                    <FiCheckCircle size={14} /> Active: {stats.advisers?.active || 0}
                  </span>
                  <span style={inactiveBadgeStyle}>
                    <FiXCircle size={14} /> Inactive: {stats.advisers?.inactive || 0}
                  </span>
                </div>
              </div>

              {/* 4. Total Courses Card */}
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "600" }}>Total Courses</div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#1e293b", marginTop: "2px" }}>
                      {stats.courses || 0}
                    </div>
                  </div>
                  <div style={{ ...iconContainerStyle, background: "#fff7ed", color: "#f97316" }}>
                    <FiBookOpen size={22} />
                  </div>
                </div>
                <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: "500", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                  Curriculum course registry
                </div>
              </div>
            </div>

            {/* Middle Section: Department & Session Analytics */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", marginBottom: "32px" }}>
              {/* Department Breakdown Card */}
              <div style={sectionCardStyle}>
                <h3 style={{ margin: "0 0 16px 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px", fontSize: "17px" }}>
                  <FiPieChart color="#3B8DB3" /> Academic Department Roster
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {Object.keys(stats.deptStudentCounts || {}).length === 0 ? (
                    <div style={{ color: "#94a3b8", fontSize: "13px" }}>No department data available</div>
                  ) : (
                    Object.keys(stats.deptStudentCounts || {}).map((dept) => (
                      <div
                        key={dept}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          background: "#f8fafc",
                          borderRadius: "8px",
                          border: "1px solid #f1f5f9",
                        }}
                      >
                        <span style={{ fontWeight: "700", color: "#334155", fontSize: "13.5px" }}>{dept}</span>
                        <div style={{ display: "flex", gap: "12px", fontSize: "12.5px" }}>
                          <span style={{ color: "#0369a1", fontWeight: "600" }}>
                            {stats.deptStudentCounts[dept] || 0} Students
                          </span>
                          <span style={{ color: "#64748b" }}>|</span>
                          <span style={{ color: "#15803d", fontWeight: "600" }}>
                            {stats.deptTeacherCounts?.[dept] || 0} Teachers
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Session Roster Breakdown Card */}
              <div style={sectionCardStyle}>
                <h3 style={{ margin: "0 0 16px 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px", fontSize: "17px" }}>
                  <FiLayers color="#8b5cf6" /> Student Enrolled Sessions
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {Object.keys(stats.sessionStudentCounts || {}).length === 0 ? (
                    <div style={{ color: "#94a3b8", fontSize: "13px" }}>No session data available</div>
                  ) : (
                    Object.keys(stats.sessionStudentCounts || {}).map((sess) => (
                      <div
                        key={sess}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          background: "#f8fafc",
                          borderRadius: "8px",
                          border: "1px solid #f1f5f9",
                        }}
                      >
                        <span style={{ fontWeight: "700", color: "#334155", fontSize: "13.5px" }}>Session {sess}</span>
                        <span style={{ background: "#f3e8ff", color: "#6b21a8", padding: "3px 10px", borderRadius: "12px", fontWeight: "700", fontSize: "12px" }}>
                          {stats.sessionStudentCounts[sess]} Enrolled
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              <Link
                to="/admin/students"
                style={{
                  textDecoration: "none",
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#1e293b",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  transition: "all 0.2s",
                }}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#3B8DB3" }}>Student Directory</div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>Manage & filter roster</div>
                </div>
                <FiArrowRight size={18} color="#3B8DB3" />
              </Link>

              <Link
                to="/admin/teachers"
                style={{
                  textDecoration: "none",
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#1e293b",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  transition: "all 0.2s",
                }}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#10b981" }}>Teacher Allocation</div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>Course & adviser mapping</div>
                </div>
                <FiArrowRight size={18} color="#10b981" />
              </Link>

              <Link
                to="/admin/courses"
                style={{
                  textDecoration: "none",
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#1e293b",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  transition: "all 0.2s",
                }}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#f97316" }}>Course Catalog</div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>Curriculum specifications</div>
                </div>
                <FiArrowRight size={18} color="#f97316" />
              </Link>

              <Link
                to="/admin/progression"
                style={{
                  textDecoration: "none",
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#1e293b",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  transition: "all 0.2s",
                }}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#8b5cf6" }}>Academic Progression</div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>Session promotion engine</div>
                </div>
                <FiTrendingUp size={18} color="#8b5cf6" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
