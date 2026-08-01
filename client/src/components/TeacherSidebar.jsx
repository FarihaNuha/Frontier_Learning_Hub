import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import "../styles/dashboard.css";
import {
  FiBook,
  FiFileText,
  FiCalendar,
  FiUser,
  FiUsers,
  FiLogOut,
  FiArrowLeft,
  FiBookOpen,
  FiMessageSquare,
  FiActivity,
  FiChevronDown,
  FiChevronUp,
  FiMessageCircle,
  FiMail,
  FiClock,
  FiClipboard,
  FiSettings,
  FiMenu,
  FiX,
  FiCheck,
  FiAward,
  FiRefreshCw,
  FiGrid,
} from "react-icons/fi";

export default function TeacherSidebar({ currentPage, courseInfo, courseId }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cid = courseId || courseInfo?._id;

  const [course, setCourse] = useState(courseInfo || null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isRegistrationPage =
    currentPage === "registration-approval" ||
    currentPage === "retake-approval" ||
    window.location.pathname.includes("/teacher/registration-approval") ||
    window.location.pathname.includes("/teacher/retake-approval");

  const [registrationOpen, setRegistrationOpen] = useState(isRegistrationPage);

  const [communityOpen, setCommunityOpen] = useState(
    currentPage === "community-hub" ||
      currentPage === "community" ||
      window.location.pathname.includes("/community") ||
      window.location.pathname.includes("/messages")
  );

  useEffect(() => {
    if (courseInfo) {
      setCourse(courseInfo);
      return;
    }
    if (!cid) return;

    // Check sessionStorage cache to prevent duplicate loads
    const cacheKey = `course_details_${cid}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setCourse(JSON.parse(cached));
        return;
      } catch (e) {}
    }

    api.get(`/courses/${cid}`)
      .then(res => {
        if (res.data?.course) {
          setCourse(res.data.course);
          sessionStorage.setItem(cacheKey, JSON.stringify(res.data.course));
        }
      })
      .catch(err => {
        console.error("TeacherSidebar course fetch error:", err);
      });
  }, [courseInfo, cid]);

  if (!cid) {
    return (
      <>
        {/* Mobile Header Bar */}
        <div className="mobile-sidebar-toggle-bar">
          <button 
            className="mobile-toggle-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
          <span className="mobile-brand-title">UFTB Moodle</span>
          <span className="badge teacher">Teacher</span>
        </div>

        {/* Backdrop overlay on mobile */}
        {mobileOpen && (
          <div 
            className="mobile-sidebar-overlay active"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <div className={`sidebar ${mobileOpen ? "mobile-open" : ""}`} onClick={() => setMobileOpen(false)}>
          <div className="sidebar-header">
            <h2>UFTB Moodle</h2>
            <span className="badge teacher">Teacher</span>
          </div>
        <div className="user-info">
          <div className="avatar">
            {user?.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt="Profile" 
                style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--pastel-blue-deep)", display: "block", margin: "0 auto 12px auto" }} 
              />
            ) : (
              <FiUser size={48} color="#2C4B66" />
            )}
          </div>
          <h3>{user?.name || "Teacher"}</h3>
          {user?.department && (
            <p style={{ fontWeight: 600, color: "#3B8DB3" }}>
              {user.department}
            </p>
          )}
          <p className="user-email" style={{ fontSize: 12, color: "#6B89A0", marginTop: 4 }}>
            {user?.email || ""}
          </p>
        </div>
        <div className="sidebar-nav-scrollable">
          {/* 1. Dashboard */}
          <button
            className={`nav-item ${currentPage === "dashboard" || window.location.pathname === "/teacher/dashboard" ? "active" : ""}`}
            onClick={() => navigate("/teacher/dashboard")}
          >
            <FiGrid size={18} />
            <span>Dashboard</span>
          </button>

          {/* 2. My Courses */}
          <button
            className={`nav-item ${currentPage === "my-courses" || currentPage === "courses" || (window.location.pathname === "/courses" && currentPage !== "dashboard") ? "active" : ""}`}
            onClick={() => navigate("/courses")}
          >
            <FiBookOpen size={18} />
            <span>My Courses</span>
          </button>

          {/* 3. Enrolled Students */}
          <button
            className={`nav-item ${currentPage === "enrolled-students" || window.location.pathname.includes("/enrolled-students") ? "active" : ""}`}
            onClick={() => navigate("/teacher/enrolled-students")}
          >
            <FiUsers size={18} />
            <span>Enrolled Students</span>
          </button>

          {/* 4. Registration Dropdown */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <button
              className={`nav-item ${isRegistrationPage ? "active" : ""}`}
              onClick={() => setRegistrationOpen(!registrationOpen)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FiCalendar size={18} />
                <span>Registration</span>
              </div>
              {registrationOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
            {registrationOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, margin: "2px 0 6px 0" }}>
                <button
                  className={`nav-item ${window.location.pathname.includes("/teacher/registration-approval") ? "active" : ""}`}
                  onClick={() => navigate("/teacher/registration-approval")}
                  style={{ paddingLeft: 32, fontSize: 13, fontWeight: 400 }}
                >
                  <FiCheck size={15} />
                  <span>Registration Approval</span>
                </button>
                <button
                  className={`nav-item ${currentPage === "retake-approval" || window.location.pathname.includes("/teacher/retake-approval") ? "active" : ""}`}
                  onClick={() => navigate("/teacher/retake-approval")}
                  style={{ paddingLeft: 32, fontSize: 13, fontWeight: 400 }}
                >
                  <FiRefreshCw size={15} />
                  <span>Retake Approval</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. Assessment Marksheet */}
          <button
            className={`nav-item ${currentPage === "assessment" || window.location.pathname.includes("/teacher/assessment") ? "active" : ""}`}
            onClick={() => navigate("/teacher/assessment")}
          >
            <FiFileText size={18} />
            <span>Assessment Marksheet</span>
          </button>

          {/* 6. Result Publication */}
          <button
            className={`nav-item ${currentPage === "results" || window.location.pathname.includes("/teacher/results") ? "active" : ""}`}
            onClick={() => navigate("/teacher/results")}
          >
            <FiAward size={18} />
            <span>Result Publication</span>
          </button>

          {/* 7. Academic Calendar */}
          <button
            className={`nav-item ${currentPage === "calendar" || window.location.pathname.includes("/academic-calendar") ? "active" : ""}`}
            onClick={() => navigate("/academic-calendar")}
          >
            <FiCalendar size={18} />
            <span>Academic Calendar</span>
          </button>

          {/* 8. Community Hub Dropdown */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <button
              className={`nav-item ${currentPage === "community-hub" || currentPage === "community" ? "active" : ""}`}
              onClick={() => setCommunityOpen(!communityOpen)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FiMessageSquare size={18} />
                <span>Community Hub</span>
              </div>
              {communityOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
            {communityOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, margin: "2px 0 6px 0" }}>
                <button
                  className={`nav-item ${window.location.pathname.includes("/community") ? "active" : ""}`}
                  onClick={() => navigate("/community")}
                  style={{ paddingLeft: 32, fontSize: 13, fontWeight: 400 }}
                >
                  <FiMessageCircle size={15} />
                  <span>Discussion Feed</span>
                </button>
                <button
                  className={`nav-item ${window.location.pathname.includes("/messages") && !window.location.search.includes("tab=requests") ? "active" : ""}`}
                  onClick={() => navigate("/messages")}
                  style={{ paddingLeft: 32, fontSize: 13, fontWeight: 400 }}
                >
                  <FiMail size={15} />
                  <span>Messages</span>
                </button>
                <button
                  className={`nav-item ${window.location.search.includes("tab=requests") ? "active" : ""}`}
                  onClick={() => navigate("/messages?tab=requests")}
                  style={{ paddingLeft: 32, fontSize: 13, fontWeight: 400 }}
                >
                  <FiClock size={15} />
                  <span>Contact Requests</span>
                </button>
              </div>
            )}
          </div>

          {/* 9. Notice Board (After Community Hub) */}
          <button
            className={`nav-item ${currentPage === "notices" || window.location.pathname.includes("/teacher/notices") ? "active" : ""}`}
            onClick={() => navigate("/teacher/notices")}
          >
            <FiClipboard size={18} />
            <span>Notice Board</span>
          </button>
        </div>
        <div className="sidebar-footer-fixed">
          <div id="sidebar-notification-portal" style={{ width: "100%" }}></div>
          <div className="nav-divider" style={{ margin: "2px 0" }}></div>
          <button
            className={`nav-item ${currentPage === "settings" ? "active" : ""}`}
            onClick={() => navigate("/settings")}
          >
            <FiSettings size={18} />
            <span>Settings</span>
          </button>
          <button className="nav-item logout-btn" onClick={logout}>
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
      </>
    );
  }

  // Active Course Context Sidebar
  return (
    <>
      {/* Mobile Header Bar */}
      <div className="mobile-sidebar-toggle-bar">
        <button 
          className="mobile-toggle-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Menu"
        >
          {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
        <span className="mobile-brand-title">UFTB Moodle</span>
        <span className="badge teacher">Teacher</span>
      </div>

      {/* Backdrop overlay on mobile */}
      {mobileOpen && (
        <div 
          className="mobile-sidebar-overlay active"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={`sidebar ${mobileOpen ? "mobile-open" : ""}`} onClick={() => setMobileOpen(false)}>
        <div className="sidebar-header">
          <h2>UFTB Moodle</h2>
          <span className="badge teacher">Teacher</span>
        </div>
      <div className="user-info">
        <div className="avatar">
          {user?.profilePicture ? (
            <img 
              src={user.profilePicture} 
              alt="Profile" 
              style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--pastel-blue-deep)", display: "block", margin: "0 auto 12px auto" }} 
            />
          ) : (
            <FiUser size={48} color="#2C4B66" />
          )}
        </div>
        <h3>{user?.name || "Teacher"}</h3>
        <p style={{ fontWeight: 600, color: "#3B8DB3" }}>
          {course?.displayCode || ""}
        </p>
        <p style={{ fontSize: 12, color: "#6B89A0" }}>
          {course?.name || ""}
        </p>
        {user?.department && (
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--pastel-blue-deep)", marginTop: 2 }}>
            {user.department}
          </p>
        )}
        <p
          className="user-email"
          style={{ fontSize: 12, color: "#6B89A0", marginTop: 4 }}
        >
          {user?.email || ""}
        </p>
      </div>
      <div className="sidebar-nav-scrollable">
        <button
          className={`nav-item ${currentPage === "dashboard" ? "active" : ""}`}
          onClick={() => navigate(`/course/${cid}`)}
        >
          <FiBook size={18} />
          <span>Course Materials</span>
        </button>
        <button
          className={`nav-item ${currentPage === "assignments" ? "active" : ""}`}
          onClick={() => navigate(`/teacher/assignments/${cid}`)}
        >
          <FiFileText size={18} />
          <span>Assignments</span>
        </button>
        <button
          className={`nav-item ${currentPage === "exams" ? "active" : ""}`}
          onClick={() => navigate(`/teacher/exams/${cid}`)}
        >
          <FiFileText size={18} />
          <span>Exams</span>
        </button>
        <button
          className={`nav-item ${currentPage === "attendance" ? "active" : ""}`}
          onClick={() => navigate(`/teacher/attendance/${cid}`)}
        >
          <FiCalendar size={18} />
          <span>Attendance</span>
        </button>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <button
            className={`nav-item ${currentPage === "community" ? "active" : ""}`}
            onClick={() => setCommunityOpen(!communityOpen)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FiMessageSquare size={18} />
              <span>Community</span>
            </div>
            {communityOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>
          {communityOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, margin: "2px 0 6px 0" }}>
              <button
                className={`nav-item ${window.location.pathname.includes("/community") ? "active" : ""}`}
                onClick={() => navigate(`/community/courses/${cid}`)}
                style={{
                  paddingLeft: 32,
                  fontSize: 13,
                  fontWeight: 400,
                }}
              >
                <FiMessageCircle size={15} />
                <span>Discussion Feed</span>
              </button>
              <button
                className={`nav-item ${window.location.pathname.includes("/messages") && !window.location.search.includes("tab=requests") ? "active" : ""}`}
                onClick={() => navigate(`/messages?courseId=${cid}`)}
                style={{
                  paddingLeft: 32,
                  fontSize: 13,
                  fontWeight: 400,
                }}
              >
                <FiMail size={15} />
                <span>Messages</span>
              </button>
              <button
                className={`nav-item ${window.location.search.includes("tab=requests") ? "active" : ""}`}
                onClick={() => navigate(`/messages?tab=requests&courseId=${cid}`)}
                style={{
                  paddingLeft: 32,
                  fontSize: 13,
                  fontWeight: 400,
                }}
              >
                <FiClock size={15} />
                <span>Contact Requests</span>
              </button>
            </div>
          )}
        </div>
        <button
          className={`nav-item ${currentPage === "analytics" ? "active" : ""}`}
          onClick={() => navigate(`/teacher/analytics/${cid}`)}
        >
          <FiActivity size={18} />
          <span>Activity Analytics</span>
        </button>
        <button
          className={`nav-item ${currentPage === "assessment" ? "active" : ""}`}
          onClick={() => navigate(`/teacher/assessment/${cid}`)}
        >
          <FiFileText size={18} />
          <span>Assessment Marksheet</span>
        </button>
        <button
          className={`nav-item ${currentPage === "notices" || window.location.pathname.includes("/notice") ? "active" : ""}`}
          onClick={() => navigate(`/teacher/course/${cid}/notice`)}
        >
          <FiClipboard size={18} />
          <span>Notice Board</span>
        </button>
      </div>
      <div className="sidebar-footer-fixed">
        <div id="sidebar-notification-portal" style={{ width: "100%" }}></div>
        <div className="nav-divider" style={{ margin: "2px 0" }}></div>
        <button className="nav-item" onClick={() => navigate("/courses")}>
          <FiArrowLeft size={18} />
          <span>Back to Courses</span>
        </button>
        <div className="nav-divider" style={{ margin: "2px 0" }}></div>
        <button
          className={`nav-item ${currentPage === "settings" ? "active" : ""}`}
          onClick={() => navigate("/settings")}
        >
          <FiSettings size={18} />
          <span>Settings</span>
        </button>
        <button className="nav-item logout-btn" onClick={logout}>
          <FiLogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
    </>
  );
}
