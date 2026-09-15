import React from "react";
import { useNavigate } from "react-router-dom";
import { FiAward, FiClock, FiCheckCircle, FiArrowLeft, FiGrid } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import AdminSidebar from "../components/AdminSidebar";
import TeacherSidebar from "../components/TeacherSidebar";
import StudentSidebar from "../components/StudentSidebar";
import "../styles/dashboard.css";

export default function UnderDevelopmentPage({ moduleName = "Result Management & Grade Aggregation" }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBackToDashboard = () => {
    if (user?.role === "teacher") {
      navigate("/teacher/dashboard");
    } else if (user?.role === "student") {
      navigate("/student/dashboard");
    } else {
      navigate("/admin/dashboard");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#E8F4FD" }}>
      {/* Sidebar based on user role */}
      {user?.role === "admin" && <AdminSidebar />}
      {user?.role === "teacher" && <TeacherSidebar />}
      {user?.role === "student" && <StudentSidebar currentPage="results" />}

      <div style={{ flex: 1, padding: "40px 32px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "48px 40px",
            maxWidth: "680px",
            width: "100%",
            boxShadow: "0 12px 36px rgba(44, 75, 102, 0.08)",
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          {/* Module Icon */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px auto",
              color: "#0284c7",
              boxShadow: "0 8px 20px rgba(2, 132, 199, 0.15)",
            }}
          >
            <FiAward size={36} />
          </div>

          {/* Module Title */}
          <h2 style={{ color: "#0f172a", fontSize: "26px", fontWeight: 800, margin: "0 0 12px 0" }}>
            {moduleName}
          </h2>

          {/* Scheduled Release Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#e0f2fe",
              color: "#0369a1",
              padding: "6px 18px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "24px",
              border: "1px solid #bae6fd",
            }}
          >
            <FiClock size={15} /> Scheduled System Release
          </div>

          {/* Description */}
          <p style={{ color: "#64748b", fontSize: "15px", lineHeight: "1.65", margin: "0 0 32px 0" }}>
            This module is currently under scheduled integration. Grade point processing algorithms, SGPA/CGPA aggregation, and official transcript sync will be enabled in the upcoming release.
          </p>

          {/* Action Button */}
          <button
            onClick={handleBackToDashboard}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 28px",
              background: "#3B8DB3",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "14.5px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(59, 141, 179, 0.3)",
              transition: "all 0.2s",
            }}
          >
            <FiArrowLeft size={18} /> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
