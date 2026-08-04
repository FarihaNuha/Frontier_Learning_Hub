import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  FiGrid, 
  FiUsers, 
  FiBookOpen, 
  FiSettings, 
  FiLogOut, 
  FiBookmark, 
  FiMapPin,
  FiAward,
  FiTrendingUp,
  FiShield,
  FiBell,
  FiClipboard,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

export default function AdminSidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();

  const isStudentsActive =
    location.pathname === "/admin/students" || location.pathname === "/admin/progression";

  const isTeachersActive =
    location.pathname === "/admin/teachers" || location.pathname === "/admin/advisers";

  const isRegistrationActive =
    location.pathname === "/admin/calendar" ||
    location.pathname === "/admin/registration-payments" ||
    location.pathname === "/admin/registrations";

  const isResultActive =
    location.pathname === "/admin/results" || location.pathname.startsWith("/admin/results");

  const [studentsOpen, setStudentsOpen] = useState(isStudentsActive);
  const [teachersOpen, setTeachersOpen] = useState(isTeachersActive);
  const [registrationOpen, setRegistrationOpen] = useState(isRegistrationActive);
  const [resultsOpen, setResultsOpen] = useState(isResultActive);

  return (
    <div className="sidebar admin-sidebar" style={{
      width: "260px",
      background: "var(--bg-card, #ffffff)",
      borderRight: "1px solid var(--border-color, #e0e0e0)",
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      display: "flex",
      flexDirection: "column",
      zIndex: 100,
      padding: "20px 0"
    }}>
      <div className="sidebar-header" style={{
        padding: "0 24px 20px 24px",
        borderBottom: "1px solid var(--border-color, #e0e0e0)"
      }}>
        <h3 style={{ margin: 0, color: "var(--pastel-blue-deep, #2C4B66)" }}>UMS Admin</h3>
        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>University Management</p>
      </div>

      <div className="sidebar-menu" style={{ flex: 1, padding: "20px 16px", overflowY: "auto" }}>
        {/* Dashboard */}
        <Link 
          to="/admin/dashboard" 
          className={`sidebar-menu-item ${location.pathname === "/admin/dashboard" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "8px",
            color: location.pathname === "/admin/dashboard" ? "#ffffff" : "#2C4B66",
            background: location.pathname === "/admin/dashboard" ? "#3B8DB3" : "transparent",
            textDecoration: "none",
            marginBottom: "8px",
            fontWeight: location.pathname === "/admin/dashboard" ? "600" : "500",
          }}
        >
          <FiGrid size={18} />
          <span>Dashboard</span>
        </Link>

        {/* Expandable Students Section (Merged Student Directory & Academic Progression) */}
        <div style={{ marginBottom: "8px" }}>
          <button
            onClick={() => setStudentsOpen(!studentsOpen)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "8px",
              color: isStudentsActive ? "#3B8DB3" : "#2C4B66",
              background: isStudentsActive ? "#E8F4FD" : "transparent",
              border: "none",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <FiUsers size={18} />
              <span>Students</span>
            </div>
            {studentsOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>

          {studentsOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", paddingLeft: "16px" }}>
              <Link
                to="/admin/students"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: location.pathname === "/admin/students" ? "#ffffff" : "#475569",
                  background: location.pathname === "/admin/students" ? "#3B8DB3" : "transparent",
                  textDecoration: "none",
                  fontWeight: location.pathname === "/admin/students" ? "600" : "500",
                }}
              >
                <FiUsers size={16} />
                <span>Student Directory</span>
              </Link>
              <Link
                to="/admin/progression"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: location.pathname === "/admin/progression" ? "#ffffff" : "#475569",
                  background: location.pathname === "/admin/progression" ? "#3B8DB3" : "transparent",
                  textDecoration: "none",
                  fontWeight: location.pathname === "/admin/progression" ? "600" : "500",
                }}
              >
                <FiTrendingUp size={16} />
                <span>Academic Progression</span>
              </Link>
            </div>
          )}
        </div>

        {/* Expandable Teachers Section (Merged Teacher Directory & Adviser Alignment) */}
        <div style={{ marginBottom: "8px" }}>
          <button
            onClick={() => setTeachersOpen(!teachersOpen)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "8px",
              color: isTeachersActive ? "#3B8DB3" : "#2C4B66",
              background: isTeachersActive ? "#E8F4FD" : "transparent",
              border: "none",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <FiUsers size={18} />
              <span>Teachers</span>
            </div>
            {teachersOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>

          {teachersOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", paddingLeft: "16px" }}>
              <Link
                to="/admin/teachers"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: location.pathname === "/admin/teachers" ? "#ffffff" : "#475569",
                  background: location.pathname === "/admin/teachers" ? "#3B8DB3" : "transparent",
                  textDecoration: "none",
                  fontWeight: location.pathname === "/admin/teachers" ? "600" : "500",
                }}
              >
                <FiUsers size={16} />
                <span>Teacher Directory</span>
              </Link>
              <Link
                to="/admin/advisers"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: location.pathname === "/admin/advisers" ? "#ffffff" : "#475569",
                  background: location.pathname === "/admin/advisers" ? "#3B8DB3" : "transparent",
                  textDecoration: "none",
                  fontWeight: location.pathname === "/admin/advisers" ? "600" : "500",
                }}
              >
                <FiBookmark size={16} />
                <span>Adviser Alignment</span>
              </Link>
            </div>
          )}
        </div>

        {/* Courses */}
        <Link 
          to="/admin/courses" 
          className={`sidebar-menu-item ${location.pathname === "/admin/courses" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "8px",
            color: location.pathname === "/admin/courses" ? "#ffffff" : "#2C4B66",
            background: location.pathname === "/admin/courses" ? "#3B8DB3" : "transparent",
            textDecoration: "none",
            marginBottom: "8px",
            fontWeight: location.pathname === "/admin/courses" ? "600" : "500",
          }}
        >
          <FiBookOpen size={18} />
          <span>Courses</span>
        </Link>

        {/* Notice Management */}
        <Link 
          to="/admin/notices" 
          className={`sidebar-menu-item ${location.pathname === "/admin/notices" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "8px",
            color: location.pathname === "/admin/notices" ? "#ffffff" : "#2C4B66",
            background: location.pathname === "/admin/notices" ? "#3B8DB3" : "transparent",
            textDecoration: "none",
            marginBottom: "8px",
            fontWeight: location.pathname === "/admin/notices" ? "600" : "500",
          }}
        >
          <FiClipboard size={18} />
          <span>Notice Management</span>
        </Link>

        {/* Academic Calendar */}
        <Link 
          to="/admin/academic-calendar" 
          className={`sidebar-menu-item ${location.pathname === "/admin/academic-calendar" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "8px",
            color: location.pathname === "/admin/academic-calendar" ? "#ffffff" : "#2C4B66",
            background: location.pathname === "/admin/academic-calendar" ? "#3B8DB3" : "transparent",
            textDecoration: "none",
            marginBottom: "8px",
            fontWeight: location.pathname === "/admin/academic-calendar" ? "600" : "500",
          }}
        >
          <FiCalendar size={18} />
          <span>Academic Calendar</span>
        </Link>

        {/* Expandable Registration Section (Merged Calendar, Payments, Records) */}
        <div style={{ marginBottom: "8px" }}>
          <button
            onClick={() => setRegistrationOpen(!registrationOpen)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "8px",
              color: isRegistrationActive ? "#3B8DB3" : "#2C4B66",
              background: isRegistrationActive ? "#E8F4FD" : "transparent",
              border: "none",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <FiBookmark size={18} />
              <span>Registration</span>
            </div>
            {registrationOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>

          {registrationOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", paddingLeft: "16px" }}>
              <Link
                to="/admin/calendar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: location.pathname === "/admin/calendar" ? "#ffffff" : "#475569",
                  background: location.pathname === "/admin/calendar" ? "#3B8DB3" : "transparent",
                  textDecoration: "none",
                  fontWeight: location.pathname === "/admin/calendar" ? "600" : "500",
                }}
              >
                <FiCalendar size={16} />
                <span>Registration Calendar</span>
              </Link>
              <Link
                to="/admin/registration-payments"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: location.pathname === "/admin/registration-payments" ? "#ffffff" : "#475569",
                  background: location.pathname === "/admin/registration-payments" ? "#3B8DB3" : "transparent",
                  textDecoration: "none",
                  fontWeight: location.pathname === "/admin/registration-payments" ? "600" : "500",
                }}
              >
                <FiGrid size={16} />
                <span>Registration Payments</span>
              </Link>
              <Link
                to="/admin/registrations"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: location.pathname === "/admin/registrations" ? "#ffffff" : "#475569",
                  background: location.pathname === "/admin/registrations" ? "#3B8DB3" : "transparent",
                  textDecoration: "none",
                  fontWeight: location.pathname === "/admin/registrations" ? "600" : "500",
                }}
              >
                <FiBookOpen size={16} />
                <span>Registration Records</span>
              </Link>
            </div>
          )}
        </div>

        {/* Expandable Result Publication Section (Mid Term & Final Term) */}
        <div style={{ marginBottom: "8px" }}>
          <button
            onClick={() => setResultsOpen(!resultsOpen)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "8px",
              color: isResultActive ? "#3B8DB3" : "#2C4B66",
              background: isResultActive ? "#E8F4FD" : "transparent",
              border: "none",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <FiAward size={18} />
              <span>Result Publication</span>
            </div>
            {resultsOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>

          {resultsOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", paddingLeft: "16px" }}>
              <Link
                to="/admin/results?type=midterm"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: location.pathname === "/admin/results" && (!location.search || location.search.includes("midterm")) ? "#ffffff" : "#475569",
                  background: location.pathname === "/admin/results" && (!location.search || location.search.includes("midterm")) ? "#3B8DB3" : "transparent",
                  textDecoration: "none",
                  fontWeight: location.pathname === "/admin/results" && (!location.search || location.search.includes("midterm")) ? "600" : "500",
                }}
              >
                <FiAward size={16} />
                <span>Mid Term</span>
              </Link>
              <Link
                to="/admin/results?type=final"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: location.pathname === "/admin/results" && location.search.includes("final") ? "#ffffff" : "#475569",
                  background: location.pathname === "/admin/results" && location.search.includes("final") ? "#3B8DB3" : "transparent",
                  textDecoration: "none",
                  fontWeight: location.pathname === "/admin/results" && location.search.includes("final") ? "600" : "500",
                }}
              >
                <FiAward size={16} />
                <span>Final Term</span>
              </Link>
            </div>
          )}
        </div>

        {/* Settings */}
        <Link 
          to="/admin/settings" 
          className={`sidebar-menu-item ${location.pathname === "/admin/settings" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "8px",
            color: location.pathname === "/admin/settings" ? "#ffffff" : "#2C4B66",
            background: location.pathname === "/admin/settings" ? "#3B8DB3" : "transparent",
            textDecoration: "none",
            marginBottom: "8px",
            fontWeight: location.pathname === "/admin/settings" ? "600" : "500",
          }}
        >
          <FiSettings size={18} />
          <span>Settings</span>
        </Link>
      </div>

      <div className="sidebar-footer" style={{
        padding: "16px",
        borderTop: "1px solid var(--border-color, #e0e0e0)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", padding: "0 8px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "var(--pastel-blue-light, #E8F4FD)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            color: "var(--pastel-blue-deep, #3B8DB3)"
          }}>
            {user?.name?.charAt(0) || "A"}
          </div>
          <div>
            <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-main, #2C4B66)" }}>{user?.name || "Admin"}</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>System Administrator</div>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="logout-btn"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ef4444",
            background: "transparent",
            color: "#ef4444",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <FiLogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
