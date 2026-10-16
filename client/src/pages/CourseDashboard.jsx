import { useCachedFetch } from "../services/apiCache";
import SkeletonLoader from "../components/SkeletonLoader";
import RouteSkeleton from "../components/RouteSkeleton";
import { useState, useEffect, lazy, Suspense } from "react";
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
const TeacherDashboard = lazy(() => import("./TeacherDashboard"));
const StudentDashboard = lazy(() => import("./StudentDashboard"));

export default function CourseDashboard() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useCachedFetch(`/courses/${id}`, { enabled: !!user });
  const course = data?.course;
  const [activeTab, setActiveTab] = useState("lectures");
  useEffect(() => { if (error) { toast.error("Course not found"); navigate("/courses"); } }, [error]);

  if (!user) return null;

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
    return <RouteSkeleton />;
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
        <Suspense fallback={<SkeletonLoader type="section" />}>
        {activeTab === "lectures" && (
          <div className="course-tab-content">
            {user?.role === "teacher" ? (
              <TeacherDashboard courseId={id} courseCode={course.displayCode} />
            ) : (
              <StudentDashboard courseId={id} courseCode={course.displayCode} />
            )}
          </div>
        )}
        </Suspense>
      </div>
    </div>
  );
}
