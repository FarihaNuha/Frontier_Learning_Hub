import React from "react";
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
  FiCalendar
} from "react-icons/fi";

export default function AdminSidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: <FiGrid size={18} /> },
    { path: "/admin/students", label: "Students", icon: <FiUsers size={18} /> },
    { path: "/admin/teachers", label: "Teachers", icon: <FiUsers size={18} /> },
    { path: "/admin/courses", label: "Courses", icon: <FiBookOpen size={18} /> },
    { path: "/admin/advisers", label: "Adviser Assignment", icon: <FiBookmark size={18} /> },
    { path: "/admin/notices", label: "Notice Management", icon: <FiClipboard size={18} /> },
    { path: "/admin/academic-calendar", label: "Academic Calendar", icon: <FiCalendar size={18} /> },
    { path: "/admin/calendar", label: "Registration Calendar", icon: <FiBookmark size={18} /> },
    { path: "/admin/registration-payments", label: "Registration Payments", icon: <FiGrid size={18} /> },
    { path: "/admin/registrations", label: "Registration Records", icon: <FiBookOpen size={18} /> },
    { path: "/admin/results", label: "Result Publication", icon: <FiAward size={18} /> },
    { path: "/admin/progression", label: "Academic Progression", icon: <FiTrendingUp size={18} /> },
    { path: "/admin/audit-logs", label: "System Audit Logs", icon: <FiShield size={18} /> },
    { path: "/admin/settings", label: "Settings", icon: <FiSettings size={18} /> },
  ];

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
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`sidebar-menu-item ${isActive ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                color: isActive ? "var(--white, #ffffff)" : "var(--text-main, #2C4B66)",
                background: isActive ? "var(--pastel-blue-deep, #3B8DB3)" : "transparent",
                textDecoration: "none",
                marginBottom: "8px",
                fontWeight: isActive ? "600" : "500",
                transition: "all 0.2s"
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
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
