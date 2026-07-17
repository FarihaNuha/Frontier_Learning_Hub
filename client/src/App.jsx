import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import SkeletonLoader from "./components/SkeletonLoader";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const StudentAssignmentPage = lazy(() => import("./pages/StudentAssignmentPage"));
const TeacherAssignmentPage = lazy(() => import("./pages/TeacherAssignmentPage"));
const TeacherAttendancePage = lazy(() => import("./pages/TeacherAttendancePage"));
const StudentAttendancePage = lazy(() => import("./pages/StudentAttendancePage"));
const TeacherExamPage = lazy(() => import("./pages/TeacherExamPage"));
const StudentExamPage = lazy(() => import("./pages/StudentExamPage"));
const CourseListPage = lazy(() => import("./pages/CourseListPage"));
const CourseDashboard = lazy(() => import("./pages/CourseDashboard"));
const CommunityHub = lazy(() => import("./pages/CommunityHub"));
const PublicPostDetailPage = lazy(() => import("./pages/PublicPostDetailPage"));
const MessagePage = lazy(() => import("./pages/MessagePage"));
const CourseCommunity = lazy(() => import("./pages/CourseCommunity"));
const CourseCommunityPostDetail = lazy(() => import("./pages/CourseCommunityPostDetail"));
const TeacherAssessmentPage = lazy(() => import("./pages/TeacherAssessmentPage"));
const StudentAssessmentPage = lazy(() => import("./pages/StudentAssessmentPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CourseAnalyticsPage = lazy(() => import("./pages/CourseAnalyticsPage"));

// Fixed ProtectedRoute - checks token and user state
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const token = localStorage.getItem("token");

  console.log("=== PROTECTED ROUTE ===");
  console.log("Path:", window.location.pathname);
  console.log("Loading:", loading);
  console.log("User exists:", !!user);
  console.log("Token exists:", !!token);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#E8F4FD",
          color: "#2C4B66",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    );
  }

  // Allow access if token and user state are both present
  if (token && user) {
    console.log("✅ Token and user found, access granted");
    return children;
  }

  console.log("❌ Authentication failed, redirecting to auth");
  return <Navigate to="/auth" replace />;
}

function RoleRouter() {
  const { user, loading } = useAuth();
  const token = localStorage.getItem("token");

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (user?.role === "teacher") {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  if (user?.role === "student") {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <Navigate to="/auth" replace />;
}

import GlobalNotificationBell from "./components/GlobalNotificationBell";
import GlobalSettingsPortal from "./components/GlobalSettingsPortal";

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, []);

  // Close the mobile sidebar checkbox when route changes
  useEffect(() => {
    const checkbox = document.getElementById("mobile-sidebar-checkbox");
    if (checkbox) {
      checkbox.checked = false;
    }
  }, [location]);

  return (
    <>
      {user && (
        <>
          <input type="checkbox" id="mobile-sidebar-checkbox" style={{ display: "none" }} />
          <label htmlFor="mobile-sidebar-checkbox" className="mobile-hamburger-btn">
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </label>
          <label htmlFor="mobile-sidebar-checkbox" className="mobile-sidebar-overlay"></label>
          <GlobalNotificationBell />
          <GlobalSettingsPortal />
        </>
      )}
      <Suspense fallback={<SkeletonLoader />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          {/* Teacher Routes */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assignments"
            element={
              <ProtectedRoute>
                <TeacherAssignmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assignments/:id"
            element={
              <ProtectedRoute>
                <TeacherAssignmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <ProtectedRoute>
                <TeacherAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/attendance/:id"
            element={
              <ProtectedRoute>
                <TeacherAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/exams"
            element={
              <ProtectedRoute>
                <TeacherExamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/exams/:id"
            element={
              <ProtectedRoute>
                <TeacherExamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assessment/:id"
            element={
              <ProtectedRoute>
                <TeacherAssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assessment"
            element={
              <ProtectedRoute>
                <TeacherAssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/analytics/:id"
            element={
              <ProtectedRoute>
                <CourseAnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assignments"
            element={
              <ProtectedRoute>
                <StudentAssignmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assignments/:id"
            element={
              <ProtectedRoute>
                <StudentAssignmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance"
            element={
              <ProtectedRoute>
                <StudentAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance/:id"
            element={
              <ProtectedRoute>
                <StudentAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams"
            element={
              <ProtectedRoute>
                <StudentExamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams/:id"
            element={
              <ProtectedRoute>
                <StudentExamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assessment/:id"
            element={
              <ProtectedRoute>
                <StudentAssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assessment"
            element={
              <ProtectedRoute>
                <StudentAssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/analytics/:id"
            element={
              <ProtectedRoute>
                <CourseAnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Common Routes */}
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <CourseListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/course/:id"
            element={
              <ProtectedRoute>
                <CourseDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleRouter />
              </ProtectedRoute>
            }
          />

          {/* Community Hub Routes */}
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <CommunityHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/public/posts/:postId"
            element={
              <ProtectedRoute>
                <PublicPostDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/messages"
            element={
              <ProtectedRoute>
                <MessagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/messages/:userId"
            element={
              <ProtectedRoute>
                <MessagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/courses/:courseId"
            element={
              <ProtectedRoute>
                <CourseCommunity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/courses/:courseId/posts/:postId"
            element={
              <ProtectedRoute>
                <CourseCommunityPostDetail />
              </ProtectedRoute>
            }
          />

          {/* Settings Route */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Default Routes */}
          <Route path="/" element={<Navigate to="/courses" replace />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "12px",
              background: "#FFFFFF",
              color: "#2C4B66",
              boxShadow: "0 4px 16px rgba(59, 141, 179, 0.12)",
            },
          }}
        />
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
