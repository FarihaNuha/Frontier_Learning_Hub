import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiUser,
  FiLogOut,
  FiBook,
  FiBookOpen,
  FiFileText,
  FiCalendar,
  FiArrowLeft,
  FiCopy,
  FiMessageSquare,
  FiActivity,
} from "react-icons/fi";
import "../styles/dashboard.css";
import StudentSidebar from "../components/StudentSidebar";
import TeacherSidebar from "../components/TeacherSidebar";

// Import existing pages
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import StudentAssignmentPage from "./StudentAssignmentPage";
import TeacherAssignmentPage from "./TeacherAssignmentPage";
import StudentExamPage from "./StudentExamPage";
import TeacherExamPage from "./TeacherExamPage";
import StudentAttendancePage from "./StudentAttendancePage";
import TeacherAttendancePage from "./TeacherAttendancePage";

export default function CourseDashboard() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  if (!user) return null;
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lectures");

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data.course);
      console.log("Course loaded:", res.data.course.displayCode, "ID:", id);
    } catch (error) {
      toast.error("Course not found");
      navigate("/courses");
    } finally {
      setLoading(false);
    }
  };

  const handleLecturesClick = () => {
    setActiveTab("lectures");
  };

  const handleAssignmentsClick = () => {
    const targetPath =
      user?.role === "teacher"
        ? `/teacher/assignments/${id}`
        : `/student/assignments/${id}`;
    navigate(targetPath);
  };

  const handleExamsClick = () => {
    const targetPath =
      user?.role === "teacher"
        ? `/teacher/exams/${id}`
        : `/student/exams/${id}`;
    navigate(targetPath);
  };

  const handleAttendanceClick = () => {
    const targetPath =
      user?.role === "teacher"
        ? `/teacher/attendance/${id}`
        : `/student/attendance/${id}`;
    navigate(targetPath);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading course...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="dashboard-container">
      {user?.role === "teacher" ? (
        <TeacherSidebar currentPage="dashboard" courseInfo={course} />
      ) : (
        <StudentSidebar currentPage="dashboard" courseInfo={course} />
      )}

      <div className="main-content" style={{ padding: "0" }}>
        {activeTab === "lectures" && (
          <div className="course-tab-content">
            {user?.role === "teacher" ? (
              <TeacherDashboard courseId={id} courseCode={course.displayCode} />
            ) : (
              <StudentDashboard courseId={id} courseCode={course.displayCode} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
