import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { fetchWithCache, invalidateCache } from "../services/apiCache";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiLogIn,
  FiBook,
  FiCopy,
  FiTrash2,
  FiUsers,
  FiKey,
  FiCalendar,
  FiSearch,
  FiX,
  FiBookOpen,
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
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    session: "2024-25",
    displayCode: "",
    department: user?.department || "Software",
  });
  const [joinCode, setJoinCode] = useState("");
  const [joinNoticeMessage, setJoinNoticeMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const [sessionFilter, setSessionFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const assignedGroups = useMemo(() => {
    const map = new Map();
    (courses || []).forEach((c) => {
      let lvlNum = "";
      let trmNum = "";
      if (c.level) {
        const m = c.level.match(/\d/);
        if (m) lvlNum = m[0];
      }
      if (!lvlNum && c.displayCode) {
        const m = c.displayCode.match(/(\d)\d{2}/);
        if (m) lvlNum = m[1];
      }

      if (c.term) {
        const m = c.term.match(/\d/);
        if (m) trmNum = m[0];
      }
      if (!trmNum && c.displayCode) {
        const m = c.displayCode.match(/\d(\d)\d/);
        if (m) trmNum = m[1];
      }

      if (lvlNum && trmNum) {
        const key = `L${lvlNum}T${trmNum}_${c.session || ""}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            levelNum: lvlNum,
            termNum: trmNum,
            session: c.session || "",
            label: `Level ${lvlNum} • Term ${trmNum}`,
            levelValue: `level-${lvlNum}`,
            termValue: `term-${trmNum}`,
            count: 1,
          });
        } else {
          map.get(key).count += 1;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => Number(a.levelNum) - Number(b.levelNum) || Number(a.termNum) - Number(b.termNum));
  }, [courses]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  if (!user) return null;

  const filterCourse = (course, q) => {
    if (sessionFilter !== "all" && course.session && course.session !== sessionFilter) {
      return false;
    }

    if (levelFilter !== "all") {
      const levelNum = levelFilter.replace(/[^0-9]/g, "");
      const courseLvlClean = (course.level || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const levelMatches =
        !levelNum ||
        courseLvlClean.includes(`level${levelNum}`) ||
        courseLvlClean.includes(`l${levelNum}`) ||
        courseLvlClean.includes(levelNum);

      if (!levelMatches) return false;
    }

    if (termFilter !== "all") {
      const termNum = termFilter.replace(/[^0-9]/g, "");
      const courseTermClean = (course.term || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const termMatches =
        !termNum ||
        courseTermClean.includes(`term${termNum}`) ||
        courseTermClean.includes(`t${termNum}`) ||
        courseTermClean.includes(termNum);

      if (!termMatches) return false;
    }
    if (!q.trim()) return true;
    const query = q.trim().toLowerCase();
    const queryNoSpace = query.replace(/\s+/g, "");

    const name = (course.name || "").toLowerCase();
    const nameNoSpace = name.replace(/\s+/g, "");

    const code = (course.displayCode || "").toLowerCase();
    const codeNoSpace = code.replace(/\s+/g, "");

    const session = (course.session || "").toLowerCase();
    const level = (course.level || "").toLowerCase();
    const term = (course.term || "").toLowerCase();

    return (
      name.includes(query) ||
      nameNoSpace.includes(queryNoSpace) ||
      code.includes(query) ||
      codeNoSpace.includes(queryNoSpace) ||
      session.includes(query) ||
      level.includes(query) ||
      term.includes(query)
    );
  };

  const filteredCourses = courses.filter((c) => filterCourse(c, searchQuery));

  const matchingSuggestions = searchQuery.trim()
    ? courses
        .filter((c) => filterCourse(c, searchQuery))
        .sort((a, b) => {
          const q = searchQuery.trim().toLowerCase();
          const aNameStart = (a.name || "").toLowerCase().startsWith(q);
          const bNameStart = (b.name || "").toLowerCase().startsWith(q);
          const aCodeStart = (a.displayCode || "").toLowerCase().startsWith(q);
          const bCodeStart = (b.displayCode || "").toLowerCase().startsWith(q);

          if ((aNameStart || aCodeStart) && !(bNameStart || bCodeStart)) return -1;
          if (!(aNameStart || aCodeStart) && (bNameStart || bCodeStart)) return 1;
          return 0;
        })
    : [];

  const fetchCourses = async (forceRefresh = false) => {
    try {
      const res = await api.get("/courses/my");
      const list = Array.isArray(res.data) ? res.data : (res.data?.courses || []);
      setCourses(list);
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
      if (res.data?.message) {
        setJoinNoticeMessage(res.data.message);
      }
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
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* Exact Shape Search Bar - SVG socket notch pill */}
            <div ref={searchRef} style={{ position: "relative", width: "300px" }}>
              <div style={{ position: "relative", width: "300px", height: "50px" }}>
                {(() => {
                  const isDark = document.body.classList.contains("dark-theme");
                  return (
                    <>
                      {/* SVG pill with built-in socket notch on top-left */}
                      <svg
                        width="300" height="50"
                        viewBox="0 0 300 50"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                          position: "absolute", top: 0, left: 0,
                          width: "100%", height: "100%",
                          pointerEvents: "none",
                          filter: "drop-shadow(0 3px 10px rgba(59,141,179,0.2))",
                        }}
                      >
                        {/* Pill body with socket scoop cut at top-left */}
                        <path
                          d="M 8 8
                             C 8 20, 16 32, 30 36
                             C 44 40, 54 30, 56 16
                             C 57 9, 64 6, 72 6
                             L 278 6
                             C 290 6, 297 14, 297 25
                             C 297 36, 290 44, 278 44
                             L 22 44
                             C 10 44, 3 36, 3 25
                             C 3 16, 5 10, 8 8 Z"
                          fill="#F3F4F6"
                          stroke="#3B8DB3"
                          strokeWidth="2"
                        />
                      </svg>

                      {/* Badge sitting in the socket notch */}
                      <div
                        style={{
                          position: "absolute",
                          top: "6px",
                          left: "8px",
                          width: "48px",
                          height: "36px",
                          borderRadius: "0 0 24px 24px",
                          background: "linear-gradient(160deg, #7EC8E3 0%, #3B8DB3 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff",
                          zIndex: 2,
                          boxShadow: "0 3px 8px rgba(59,141,179,0.3)",
                        }}
                      >
                        <FiSearch size={17} />
                      </div>

                      {/* Input field */}
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search course or code..."
                        className="search-pill-input"
                        style={{
                          position: "absolute",
                          top: 0, left: 0, right: 0, bottom: 0,
                          zIndex: 2,
                          border: "none", outline: "none",
                          background: "transparent",
                          paddingLeft: "68px",
                          paddingRight: searchQuery ? "36px" : "16px",
                          fontSize: "13.5px",
                          color: "#1A4F6E",
                          fontWeight: 500,
                          borderRadius: "24px",
                        }}
                      />

                      {searchQuery && (
                        <button
                          onClick={() => { setSearchQuery(""); setShowSuggestions(false); }}
                          style={{
                            position: "absolute", right: "12px",
                            top: "50%", transform: "translateY(-50%)",
                            zIndex: 3, border: "none", background: "none",
                            cursor: "pointer", 
                            color: "#3B8DB3",
                            display: "flex", alignItems: "center", padding: "4px",
                          }}
                          title="Clear search"
                        >
                          <FiX size={15} />
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && searchQuery.trim().length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "300px",
                    background: "#ffffff",
                    borderRadius: "16px",
                    boxShadow: "0 10px 28px rgba(44, 75, 102, 0.16)",
                    border: "1.5px solid #E8F4FD",
                    zIndex: 1000,
                    maxHeight: "280px",
                    overflowY: "auto",
                    padding: "6px",
                  }}
                >
                  {matchingSuggestions.length === 0 ? (
                    <div style={{ padding: "12px 14px", fontSize: "13px", color: "#6B89A0", textAlign: "center" }}>
                      No matching courses found
                    </div>
                  ) : (
                    matchingSuggestions.map((course) => (
                      <div
                        key={course._id}
                        onClick={() => {
                          setSearchQuery(course.name);
                          setShowSuggestions(false);
                          navigate(`/course/${course._id}`);
                        }}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#E8F4FD")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ overflow: "hidden" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#2C4B66", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {course.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#6B89A0", marginTop: "2px" }}>
                            {course.displayCode} {course.session ? `• ${course.session}` : ""}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#3B8DB3",
                            background: "rgba(59, 141, 179, 0.1)",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {course.displayCode}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

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
                  <select
                    value={formData.session}
                    onChange={(e) =>
                      setFormData({ ...formData, session: e.target.value })
                    }
                  >
                    <option value="2020-21">2020-21</option>
                    <option value="2021-22">2021-22</option>
                    <option value="2022-23">2022-23</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                  </select>
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

        {/* Course List & Filters */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ margin: 0 }}>
            {searchQuery.trim()
              ? `Search Results (${filteredCourses.length})`
              : `All Courses (${filteredCourses.length})`}
          </h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Session Filter */}
            {user?.role !== "student" && (
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #3B8DB3",
                  background: "#ffffff",
                  color: "#2C4B66",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="all">All Sessions</option>
                <option value="2022-23">Session 2022-23</option>
                <option value="2023-24">Session 2023-24</option>
                <option value="2024-25">Session 2024-25</option>
              </select>
            )}

            {/* Level Filter */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1.5px solid #3B8DB3",
                background: "#ffffff",
                color: "#2C4B66",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="all">All Levels</option>
              {user?.role === "teacher" &&
              Array.from(
                new Set(
                  courses
                    .map((c) => {
                      if (c.level) return c.level.toLowerCase();
                      if (c.displayCode) {
                        const m = c.displayCode.match(/(\d)\d{2}/);
                        if (m) return `level-${m[1]}`;
                      }
                      return null;
                    })
                    .filter(Boolean)
                )
              ).length > 0
                ? Array.from(
                    new Set(
                      courses
                        .map((c) => {
                          if (c.level) return c.level.toLowerCase();
                          if (c.displayCode) {
                            const m = c.displayCode.match(/(\d)\d{2}/);
                            if (m) return `level-${m[1]}`;
                          }
                          return null;
                        })
                        .filter(Boolean)
                    )
                  )
                    .sort()
                    .map((lvl) => {
                      const num = lvl.replace("level-", "").replace("level", "");
                      return (
                        <option key={lvl} value={`level-${num}`}>
                          Level-{num}
                        </option>
                      );
                    })
                : [1, 2, 3, 4].map((num) => (
                    <option key={num} value={`level-${num}`}>
                      Level-{num}
                    </option>
                  ))}
            </select>

            {/* Term Filter */}
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1.5px solid #3B8DB3",
                background: "#ffffff",
                color: "#2C4B66",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="all">All Terms</option>
              {user?.role === "teacher" &&
              Array.from(
                new Set(
                  courses
                    .map((c) => {
                      if (c.term) return c.term.toLowerCase();
                      if (c.displayCode) {
                        const m = c.displayCode.match(/\d(\d)\d/);
                        if (m) return `term-${m[1]}`;
                      }
                      return null;
                    })
                    .filter(Boolean)
                )
              ).length > 0
                ? Array.from(
                    new Set(
                      courses
                        .map((c) => {
                          if (c.term) return c.term.toLowerCase();
                          if (c.displayCode) {
                            const m = c.displayCode.match(/\d(\d)\d/);
                            if (m) return `term-${m[1]}`;
                          }
                          return null;
                        })
                        .filter(Boolean)
                    )
                  )
                    .sort()
                    .map((trm) => {
                      const num = trm.replace("term-", "").replace("term", "");
                      return (
                        <option key={trm} value={`term-${num}`}>
                          Term-{num}
                        </option>
                      );
                    })
                : [1, 2].map((num) => (
                    <option key={num} value={`term-${num}`}>
                      Term-{num}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {/* Assigned Level & Term Quick Filter Bar */}
        {user?.role === "teacher" && assignedGroups.length > 0 && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 18px", borderRadius: "12px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
              <FiBookOpen size={16} color="#0284c7" /> Assigned Level & Term Classes:
            </span>

            <button
              onClick={() => {
                setLevelFilter("all");
                setTermFilter("all");
                setSessionFilter("all");
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                border: levelFilter === "all" && termFilter === "all" ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
                background: levelFilter === "all" && termFilter === "all" ? "#e0f2fe" : "#ffffff",
                color: levelFilter === "all" && termFilter === "all" ? "#0369a1" : "#475569",
                boxShadow: levelFilter === "all" && termFilter === "all" ? "0 2px 6px rgba(2,132,199,0.2)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              ✨ All Courses ({courses.length})
            </button>

            {assignedGroups.map((g) => {
              const isActive =
                levelFilter === g.levelValue &&
                termFilter === g.termValue &&
                (sessionFilter === "all" || sessionFilter === g.session);

              return (
                <button
                  key={g.key}
                  onClick={() => {
                    setLevelFilter(g.levelValue);
                    setTermFilter(g.termValue);
                    if (g.session) setSessionFilter(g.session);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: isActive ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                    background: isActive ? "#dcfce7" : "#ffffff",
                    color: isActive ? "#15803d" : "#334155",
                    boxShadow: isActive ? "0 2px 6px rgba(22,163,74,0.15)" : "none",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>🎓 Level {g.levelNum} • Term {g.termNum}</span>
                  {g.session && <span style={{ opacity: 0.75, fontSize: "11px" }}>({g.session})</span>}
                  <span
                    style={{
                      background: isActive ? "#16a34a" : "#e2e8f0",
                      color: isActive ? "#ffffff" : "#475569",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      fontSize: "11px",
                      fontWeight: 800,
                    }}
                  >
                    {g.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="empty-state" style={{ padding: "50px 20px" }}>
            <FiBook size={48} color="#6B89A0" />
            <h3 style={{ marginTop: 12 }}>No Approved Courses Found</h3>
            <p style={{ maxWidth: 480, margin: "8px auto 0 auto", color: "#64748b", lineHeight: "1.5" }}>
              {user?.role === "teacher"
                ? "Create your first course!"
                : "Your course registration is currently pending Adviser approval. As soon as your Adviser approves your registration, your approved courses will automatically appear here!"}
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <FiSearch size={40} color="#6B89A0" />
            <h3 style={{ marginTop: 12 }}>No matching courses found</h3>
            <p>No course matches "{searchQuery}"</p>
            <button
              className="btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="lectures-grid">
            {filteredCourses.map((course) => {
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
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                        {course.session && (
                          <span style={{ background: "rgba(255,255,255,0.25)", color: "#ffffff", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" }}>
                            {course.session}
                          </span>
                        )}
                        {course.level && course.term && (
                          <span style={{ background: "rgba(255,255,255,0.25)", color: "#ffffff", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" }}>
                            {course.level.replace("Level-", "L")} • {course.term.replace("Term-", "T")}
                          </span>
                        )}
                      </div>
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
                          course.teacher?.name ? course.teacher.name.charAt(0).toUpperCase() : "?"
                        )}
                      </div>
                    </div>

                    <div className="classroom-meta-info">
                      <span className="classroom-student-count">
                        <FiUsers size={12} style={{ marginRight: 6 }} />
                        {course.students?.length || 0} students
                      </span>
                      {course.teacher?.name ? (
                        <span
                          className="classroom-teacher-name"
                          title={course.teacher.name}
                          style={{ fontSize: 13, color: "var(--text-gray)" }}
                        >
                          {course.teacher.name}
                        </span>
                      ) : (
                        <span
                          className="classroom-teacher-name"
                          title="Teacher Not Assigned Yet"
                          style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", fontWeight: 500 }}
                        >
                          Teacher Not Assigned Yet
                        </span>
                      )}
                    </div>


                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Request Popup Modal */}
      {joinNoticeMessage && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px",
          backdropFilter: "blur(3px)"
        }}>
          <div style={{
            background: "var(--bg-card, #ffffff)",
            color: "var(--text-primary, #1e293b)",
            borderRadius: "16px",
            padding: "28px 24px 24px",
            maxWidth: "460px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            textAlign: "center",
            border: "1px solid var(--border-color, #e2e8f0)"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(59, 141, 179, 0.12)",
              color: "var(--pastel-blue-deep, #3B8DB3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "26px"
            }}>
              📋
            </div>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              Notice
            </h3>
            <p style={{ margin: "0 0 24px 0", fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary, #475569)" }}>
              {joinNoticeMessage}
            </p>
            <button
              type="button"
              onClick={() => setJoinNoticeMessage("")}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                background: "linear-gradient(135deg, #7EC8E3 0%, #3B8DB3 100%)",
                color: "#ffffff",
                border: "none"
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
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
