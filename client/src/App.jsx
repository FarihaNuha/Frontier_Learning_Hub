import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import SkeletonLoader from "./components/SkeletonLoader";
import GlobalNotificationBell from "./components/GlobalNotificationBell";
import GlobalSettingsPortal from "./components/GlobalSettingsPortal";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminStudents = lazy(() => import("./pages/AdminStudents"));
const AdminTeachers = lazy(() => import("./pages/AdminTeachers"));
const AdminCourses = lazy(() => import("./pages/AdminCourses"));
const AdminAdvisers = lazy(() => import("./pages/AdminAdvisers"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
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
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

// Phase 2 & 3 Pages
const StudentLevelTermPage = lazy(() => import("./pages/StudentLevelTermPage"));
const CourseRegistrationPage = lazy(() => import("./pages/CourseRegistrationPage"));
const AcademicRegistrationPage = lazy(() => import("./pages/AcademicRegistrationPage"));
const TeacherRegistrationApprovalPage = lazy(() => import("./pages/TeacherRegistrationApprovalPage"));
const TeacherEnrolledStudentsPage = lazy(() => import("./pages/TeacherEnrolledStudentsPage"));
const AdminRegistrationCalendar = lazy(() => import("./pages/AdminRegistrationCalendar"));
const AdminPaymentManagement = lazy(() => import("./pages/AdminPaymentManagement"));
const AdminRegistrationList = lazy(() => import("./pages/AdminRegistrationList"));

// Phase 4 Pages
const TeacherResultManagementPage = lazy(() => import("./pages/TeacherResultManagementPage"));
const AdminResultManagementPage = lazy(() => import("./pages/AdminResultManagementPage"));
const StudentAcademicResultsPage = lazy(() => import("./pages/StudentAcademicResultsPage"));

// Phase 5 Pages
const StudentAcademicProfilePage = lazy(() => import("./pages/StudentAcademicProfilePage"));
const StudentTranscriptPage = lazy(() => import("./pages/StudentTranscriptPage"));
const StudentRetakeRegistrationPage = lazy(() => import("./pages/StudentRetakeRegistrationPage"));
const TeacherRetakeApprovalPage = lazy(() => import("./pages/TeacherRetakeApprovalPage"));
const AdminProgressionPage = lazy(() => import("./pages/AdminProgressionPage"));
const AdminAuditLogsPage = lazy(() => import("./pages/AdminAuditLogsPage"));

// Service Modules Pages
const AdminNoticeManagementPage = lazy(() => import("./pages/AdminNoticeManagementPage"));
const TeacherNoticePage = lazy(() => import("./pages/TeacherNoticePage"));
const StudentNoticePage = lazy(() => import("./pages/StudentNoticePage"));
const AdminCalendarManagementPage = lazy(() => import("./pages/AdminCalendarManagementPage"));
const AcademicCalendarViewPage = lazy(() => import("./pages/AcademicCalendarViewPage"));

// Registration Payment Pages
const StudentRegistrationPaymentPage = lazy(() => import("./pages/StudentRegistrationPaymentPage"));
const AdminRegistrationPaymentPage = lazy(() => import("./pages/AdminRegistrationPaymentPage"));

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

  if (user?.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/auth" replace />;
}
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

          {/* Admin UMS Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute>
                <AdminStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute>
                <AdminTeachers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute>
                <AdminCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/advisers"
            element={
              <ProtectedRoute>
                <AdminAdvisers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/calendar"
            element={
              <ProtectedRoute>
                <AdminRegistrationCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute>
                <AdminPaymentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/registrations"
            element={
              <ProtectedRoute>
                <AdminRegistrationList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/registration-approval"
            element={
              <ProtectedRoute>
                <TeacherRegistrationApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/level-term/:level/:term"
            element={
              <ProtectedRoute>
                <StudentLevelTermPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/registration/:level/:term"
            element={
              <ProtectedRoute>
                <CourseRegistrationPage />
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
            path="/teacher/enrolled-students"
            element={
              <ProtectedRoute>
                <TeacherEnrolledStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/courses/:id/students"
            element={
              <ProtectedRoute>
                <TeacherEnrolledStudentsPage />
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
                <CourseListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/course-registration"
            element={
              <ProtectedRoute>
                <AcademicRegistrationPage />
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

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
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
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:userId"
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

          {/* Phase 4 Result Management Routes */}
          <Route
            path="/teacher/results"
            element={
              <ProtectedRoute>
                <TeacherResultManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/results"
            element={
              <ProtectedRoute>
                <AdminResultManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/results"
            element={
              <ProtectedRoute>
                <StudentAcademicResultsPage />
              </ProtectedRoute>
            }
          />

          {/* Phase 5 Routes */}
          <Route
            path="/student/academic-profile"
            element={
              <ProtectedRoute>
                <StudentAcademicProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/transcript"
            element={
              <ProtectedRoute>
                <StudentTranscriptPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/retake-registration"
            element={
              <ProtectedRoute>
                <StudentRetakeRegistrationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/retake-approval"
            element={
              <ProtectedRoute>
                <TeacherRetakeApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/progression"
            element={
              <ProtectedRoute>
                <AdminProgressionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute>
                <AdminAuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Service Module Routes */}
          <Route
            path="/admin/notices"
            element={
              <ProtectedRoute>
                <AdminNoticeManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/notices"
            element={
              <ProtectedRoute>
                <TeacherNoticePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/course/:id/notice"
            element={
              <ProtectedRoute>
                <TeacherNoticePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/notices"
            element={
              <ProtectedRoute>
                <StudentNoticePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/course/:id/notice"
            element={
              <ProtectedRoute>
                <StudentNoticePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academic-calendar"
            element={
              <ProtectedRoute>
                <AdminCalendarManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-calendar"
            element={
              <ProtectedRoute>
                <AcademicCalendarViewPage />
              </ProtectedRoute>
            }
          />

          {/* Registration Payment Routes */}
          <Route
            path="/student/registration-payments"
            element={
              <ProtectedRoute>
                <StudentRegistrationPaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/registration-payments"
            element={
              <ProtectedRoute>
                <AdminRegistrationPaymentPage />
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

          {/* Default Routes - RoleRouter handles role-based redirect */}
          <Route path="/dashboard" element={<RoleRouter />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
