import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { fetchWithCache, invalidateCache } from "../services/apiCache";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiLogIn,
  FiUser,
  FiLogOut,
  FiBook,
  FiBookOpen,
  FiCopy,
  FiTrash2,
  FiUsers,
  FiKey,
  FiCalendar,
  FiMessageSquare,
} from "react-icons/fi";
import "../styles/dashboard.css";
import TeacherSidebar from "../components/TeacherSidebar";
import StudentSidebar from "../components/StudentSidebar";

const getCourseBanner = (course) => {
  const name = (course.name || "").toLowerCase();
  const code = (course.displayCode || "").toLowerCase();
  
  // 1. Keyword-based matching for colors and accents
  if (name.includes("code") || name.includes("programming") || name.includes("computer") || name.includes("cse") || name.includes("software") || name.includes("web") || name.includes("compiler") || name.includes("system") || code.includes("cse")) {
    return {
      gradient: "linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #115e59 100%)", // Teal-Green
      accent: "#14b8a6"
    };
  }
  if (name.includes("lab") || name.includes("practical")) {
    return {
      gradient: "linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #4c1d95 100%)", // Rich Violet
      accent: "#8b5cf6"
    };
  }
  if (name.includes("math") || name.includes("stat") || name.includes("algorithm") || name.includes("numerical") || name.includes("calculus") || name.includes("algebra")) {
    return {
      gradient: "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #312e81 100%)", // Indigo
      accent: "#6366f1"
    };
  }
  if (name.includes("english") || name.includes("bangla") || name.includes("literature") || name.includes("writing") || name.includes("history") || name.includes("society") || name.includes("humanities")) {
    return {
      gradient: "linear-gradient(135deg, #047857 0%, #10b981 50%, #064e3b 100%)", // Forest Green
      accent: "#10b981"
    };
  }
  if (name.includes("physics") || name.includes("chemistry") || name.includes("biology") || name.includes("science") || name.includes("circuit") || name.includes("electronics") || name.includes("electrical")) {
    return {
      gradient: "linear-gradient(135deg, #be185d 0%, #db2777 50%, #831843 100%)", // Hot Pink
      accent: "#ec4899"
    };
  }
  if (name.includes("art") || name.includes("design") || name.includes("drawing") || name.includes("paint") || name.includes("creative")) {
    return {
      gradient: "linear-gradient(135deg, #b45309 0%, #d97706 50%, #78350f 100%)", // Amber Glow
      accent: "#f59e0b"
    };
  }
  if (name.includes("business") || name.includes("finance") || name.includes("accounting") || name.includes("management") || name.includes("economy") || name.includes("marketing")) {
    return {
      gradient: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #075985 100%)", // Sky Blue
      accent: "#0ea5e9"
    };
  }
  if (name.includes("game") || name.includes("graphics") || name.includes("media") || name.includes("animation")) {
    return {
      gradient: "linear-gradient(135deg, #db2777 0%, #f43f5e 50%, #9d174d 100%)", // Rose Red
      accent: "#f43f5e"
    };
  }
  if (name.includes("network") || name.includes("security") || name.includes("cloud") || name.includes("database") || name.includes("dbms")) {
    return {
      gradient: "linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e3a8a 100%)", // Neon Sapphire
      accent: "#3b82f6"
    };
  }
  if (name.includes("project") || name.includes("thesis") || name.includes("seminar") || name.includes("presentation")) {
    return {
      gradient: "linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #7c2d12 100%)", // Sunset Orange
      accent: "#f97316"
    };
  }

  // 2. Fallback: Multi-stop 3-color premium gradients
  const fallbackBanners = [
    { gradient: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c084fc 100%)", accent: "#7c3aed" }, // Electric Violet
    { gradient: "linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fda4af 100%)", accent: "#fb7185" }, // Neon Coral
    { gradient: "linear-gradient(135deg, #059669 0%, #10b981 50%, #6ee7b7 100%)", accent: "#10b981" }, // Aurora Green
    { gradient: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #1d4ed8 100%)", accent: "#2563eb" }, // Oceanic Breeze
    { gradient: "linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fde047 100%)", accent: "#f97316" }, // Sunset Glow
    { gradient: "linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #67e8f9 100%)", accent: "#06b6d4" }, // Magic Cyan
    { gradient: "linear-gradient(135deg, #6d28d9 0%, #db2777 50%, #9d174d 100%)", accent: "#db2777" }, // Deep Nebula
    { gradient: "linear-gradient(135deg, #15803d 0%, #84cc16 50%, #a3e635 100%)", accent: "#84cc16" }  // Forest Gold
  ];
  
  const index = course._id ? parseInt(course._id.slice(-4), 16) % fallbackBanners.length : 0;
  return fallbackBanners[index];
};

export default function CourseListPage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    session: "",
    displayCode: "",
    department: user?.department || "Software",
  });
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async (forceRefresh = false) => {
    try {
      const data = await fetchWithCache("/courses/my", { forceRefresh });
      setCourses(data.courses || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.displayCode) {
      toast.error("Course name and code are required");
      return;
    }
    try {
      const res = await api.post("/courses/create", formData);
      toast.success("Course created!");
      setShowCreate(false);
      setFormData({
        name: "",
        session: "",
        displayCode: "",
        department: user?.department || "Software",
      });
      invalidateCache("/courses");
      fetchCourses(true);
      toast(`Join Code: ${res.data.course.joinCode}`, {
        icon: "🔑",
        duration: 6000,
      });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed");
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Please enter join code");
      return;
    }
    try {
      const res = await api.post("/courses/join", { code: joinCode });
      toast.success(res.data.message);
      setShowJoin(false);
      setJoinCode("");
      invalidateCache("/courses");
      fetchCourses(true);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed");
    }
  };

  const copyJoinCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Join code copied!");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this course?")) return;
    try {
      await api.delete(`/courses/${id}`);
      toast.success("Course deleted");
      fetchCourses();
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleTakeAttendance = (courseId, e) => {
    e.stopPropagation();
    console.log("Taking attendance for course ID:", courseId);
    navigate(`/teacher/attendance/${courseId}`);
  };

  const handleViewAttendance = (courseId, e) => {
    e.stopPropagation();
    console.log("Viewing attendance for course ID:", courseId);
    navigate(`/student/attendance/${courseId}`);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar user={user} logout={logout} />
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar user={user} logout={logout} />
      <div className="main-content" style={{ padding: "30px" }}>
        <div className="top-bar">
          <div>
            <h1>My Courses</h1>
            <p className="subtitle">{user?.department} Department</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {user?.role === "teacher" && (
              <button
                className="btn-primary"
                onClick={() => {
                  setShowCreate(!showCreate);
                  setShowJoin(false);
                }}
              >
                <FiPlus size={16} /> Create Course
              </button>
            )}
            {user?.role === "student" && (
              <button
                className="btn-primary"
                onClick={() => {
                  setShowJoin(!showJoin);
                  setShowCreate(false);
                }}
              >
                <FiLogIn size={16} /> Join Course
              </button>
            )}
          </div>
        </div>

        {/* Create Course Form */}
        {showCreate && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 20 }}>Create New Course</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label>Course Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Data Structures"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Course Code *</label>
                  <input
                    type="text"
                    value={formData.displayCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayCode: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g., CSE 301"
                    required
                    style={{ textTransform: "uppercase", letterSpacing: 1 }}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Session</label>
                  <input
                    type="text"
                    value={formData.session}
                    onChange={(e) =>
                      setFormData({ ...formData, session: e.target.value })
                    }
                    placeholder="e.g., 2025-26, Spring 2026"
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  >
                    <option value="Software">Software Engineering</option>
                    <option value="EDTE">EDTE</option>
                    <option value="IRE">IRE</option>
                    <option value="Cyber">Cyber Security</option>
                    <option value="DataScience">Data Science</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#6B89A0", marginTop: 8 }}>
                <FiKey size={12} /> A random 6-digit join code will be generated
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button type="submit" className="btn-success">
                  Create Course
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: "#6B89A0" }}
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Course Form */}
        {showJoin && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 20 }}>Join Course</h2>
            <p style={{ color: "#6B89A0", marginBottom: 16 }}>
              Enter the 6-digit join code shared by your teacher.
            </p>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label>Join Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g., 583921"
                  required
                  maxLength={6}
                  style={{
                    letterSpacing: 4,
                    textAlign: "center",
                    fontSize: 24,
                    padding: "14px",
                    fontWeight: 700,
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn-success">
                  Join Course
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: "#6B89A0" }}
                  onClick={() => setShowJoin(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Course List */}
        <h2 style={{ marginBottom: 20 }}>All Courses ({courses.length})</h2>
        {courses.length === 0 ? (
          <div className="empty-state">
            <FiBook size={48} color="#6B89A0" />
            <h3>No courses yet</h3>
            <p>
              {user?.role === "teacher"
                ? "Create your first course!"
                : "Join a course with join code from your teacher"}
            </p>
          </div>
        ) : (
          <div className="lectures-grid">
            {courses.map((course) => {
              const banner = getCourseBanner(course);

              return (
                <div
                  key={course._id}
                  className="classroom-course-card"
                  onClick={() => navigate(`/course/${course._id}`)}
                >
                  <div
                    className="classroom-banner"
                    style={{ background: banner.gradient }}
                  >
                    {/* Abstract shapes decoration */}
                    <div className="classroom-banner-shapes">
                      <div className="classroom-banner-shape-1"></div>
                      <div className="classroom-banner-shape-2"></div>
                      <div className="classroom-banner-shape-3"></div>
                      <div className="classroom-banner-shape-4"></div>
                      <div className="classroom-banner-shape-5"></div>
                      <div className="classroom-banner-shape-6"></div>
                    </div>
                    {user?.role === "teacher" && (
                      <button
                        className="classroom-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(course._id);
                        }}
                        title="Delete course"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    )}

                    <div className="classroom-banner-content">
                      <h3 className="classroom-course-name" title={course.name}>
                        {course.name}
                      </h3>
                      <p className="classroom-course-code">
                        {course.displayCode}
                      </p>
                      {course.session && (
                        <p className="classroom-course-session">
                          {course.session}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom portion - Card Body */}
                  <div className="classroom-card-body">
                    {/* Floating Avatar of Instructor */}
                    <div className="classroom-avatar-wrapper">
                      <div
                        className="classroom-avatar"
                        style={{ background: banner.accent }}
                      >
                        {course.teacher?.profilePicture ? (
                          <img
                            src={course.teacher.profilePicture}
                            alt={course.teacher.name}
                            className="classroom-avatar-img"
                          />
                        ) : (
                          course.teacher?.name ? course.teacher.name.charAt(0).toUpperCase() : "T"
                        )}
                      </div>
                    </div>

                    <div className="classroom-meta-info">
                      <span className="classroom-student-count">
                        <FiUsers size={12} style={{ marginRight: 6 }} />
                        {course.students?.length || 0} students
                      </span>
                      {course.teacher?.name && (
                        <span
                          className="classroom-teacher-name"
                          title={course.teacher.name}
                          style={{ fontSize: 13, color: "var(--text-gray)" }}
                        >
                          {course.teacher.name}
                        </span>
                      )}
                    </div>

                    {/* Actions Area */}
                    <div className="classroom-actions" style={{ gap: 8, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
                      {/* Teacher Actions */}
                      {user?.role === "teacher" && (
                        <>
                          <div
                            className="join-code-container"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background: "rgba(59, 141, 179, 0.08)",
                              padding: "4px 8px",
                              borderRadius: 6,
                              marginRight: "auto"
                            }}
                          >
                            <span style={{ fontSize: 10, color: "var(--text-gray)", fontWeight: 600 }}>
                              Code:
                            </span>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 11,
                                color: "var(--pastel-blue-deep)",
                              }}
                            >
                              {course.joinCode}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyJoinCode(course.joinCode);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                color: "var(--text-gray)"
                              }}
                            >
                              <FiCopy size={11} />
                            </button>
                          </div>

                          <button
                            onClick={(e) => handleTakeAttendance(course._id, e)}
                            style={{
                              background: "var(--pastel-blue-deep)",
                              color: "white",
                              border: "none",
                              padding: "4px 10px",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 11,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <FiCalendar size={11} /> Attendance
                          </button>
                        </>
                      )}

                      {/* Student Actions */}
                      {user?.role === "student" && (
                        <button
                          onClick={(e) => handleViewAttendance(course._id, e)}
                          style={{
                            background: "rgba(59, 141, 179, 0.08)",
                            color: "var(--pastel-blue-deep)",
                            border: "none",
                            padding: "4px 10px",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            marginLeft: "auto"
                          }}
                        >
                          <FiCalendar size={11} /> View Attendance
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Sidebar Component
function Sidebar({ user, logout }) {
  if (user?.role === "teacher") {
    return <TeacherSidebar currentPage="courses" />;
  }
  return <StudentSidebar currentPage="courses" />;
}
