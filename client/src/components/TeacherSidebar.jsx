import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import {
  FiBook,
  FiFileText,
  FiCalendar,
  FiUser,
  FiLogOut,
  FiArrowLeft,
  FiBookOpen,
  FiMessageSquare,
  FiActivity,
  FiCopy,
  FiChevronDown,
  FiChevronUp,
  FiMessageCircle,
  FiMail,
  FiClock,
  FiBell,
  FiSettings,
} from "react-icons/fi";
import toast from "react-hot-toast";

export default function TeacherSidebar({ currentPage, courseInfo, courseId }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const activeCourseId = courseId || courseInfo?._id;
  const cid = activeCourseId || sessionStorage.getItem("last_active_teacher_course_id");

  useEffect(() => {
    if (activeCourseId) {
      sessionStorage.setItem("last_active_teacher_course_id", activeCourseId);
    }
  }, [activeCourseId]);

  const [course, setCourse] = useState(courseInfo || null);
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
      <div className="sidebar">
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
          <button
            className={`nav-item ${currentPage === "my-courses" || currentPage === "courses" ? "active" : ""}`}
            onClick={() => navigate("/courses")}
          >
            <FiBookOpen size={18} />
            <span>My Courses</span>
          </button>
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
                  onClick={() => navigate(cid ? `/community/courses/${cid}` : "/community")}
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
                  onClick={() => navigate(cid ? `/messages?courseId=${cid}` : "/messages")}
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
                  onClick={() => navigate(cid ? `/messages?tab=requests&courseId=${cid}` : "/messages?tab=requests")}
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
            className={`nav-item ${currentPage === "assessment" ? "active" : ""}`}
            onClick={() => navigate("/teacher/assessment")}
          >
            <FiFileText size={18} />
            <span>Assessment Marksheet</span>
          </button>
        </div>
        <div className="sidebar-footer-fixed">
          <button
            className={`nav-item ${currentPage === "notifications" || window.location.pathname.includes("/notifications") ? "active" : ""}`}
            onClick={() => navigate("/notifications")}
          >
            <FiBell size={18} />
            <span>Notifications</span>
          </button>
          <div className="nav-divider" style={{ margin: "2px 0" }}></div>
          <button
            className={`nav-item ${currentPage === "settings" || window.location.pathname.includes("/settings") ? "active" : ""}`}
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
    );
  }

  return (
    <div className="sidebar">
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
        
        {course?.joinCode && (
          <div
            style={{
              padding: "10px 16px",
              fontSize: 11,
              color: "#6B89A0",
              background: "#E8F4FD",
              borderRadius: 8,
              margin: "4px 0",
              textAlign: "center"
            }}
          >
            <span>Join Code: </span>
            <strong style={{ letterSpacing: 2, fontSize: 14, color: "#3B8DB3" }}>
              {course.joinCode}
            </strong>
            <button
              onClick={() => {
                navigator.clipboard.writeText(course.joinCode);
                toast.success("Copied!");
              }}
              style={{
                marginLeft: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <FiCopy size={12} color="#3B8DB3" />
            </button>
          </div>
        )}
      </div>
      <div className="sidebar-footer-fixed">
        <button
          className={`nav-item ${currentPage === "notifications" || window.location.pathname.includes("/notifications") ? "active" : ""}`}
          onClick={() => navigate(cid ? `/notifications?courseId=${cid}` : "/notifications")}
        >
          <FiBell size={18} />
          <span>Notifications</span>
        </button>
        <div className="nav-divider" style={{ margin: "2px 0" }}></div>
        <button className="nav-item" onClick={() => navigate("/courses")}>
          <FiArrowLeft size={18} />
          <span>Back to Courses</span>
        </button>
        <div className="nav-divider" style={{ margin: "2px 0" }}></div>
        <button
          className={`nav-item ${currentPage === "settings" || window.location.pathname.includes("/settings") ? "active" : ""}`}
          onClick={() => navigate(cid ? `/settings?courseId=${cid}` : "/settings")}
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
  );
}
