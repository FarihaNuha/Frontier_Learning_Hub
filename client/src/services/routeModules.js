// Statically analyzable, shared module loaders for routes and navigation prefetch.
const loaders = {
  AdminDashboard: () => import("../pages/AdminDashboard"),
  AdminStudents: () => import("../pages/AdminStudents"),
  AdminTeachers: () => import("../pages/AdminTeachers"),
  AdminCourses: () => import("../pages/AdminCourses"),
  AdminAdvisers: () => import("../pages/AdminAdvisers"),
  AdminSettings: () => import("../pages/AdminSettings"),
  StudentAssignmentPage: () => import("../pages/StudentAssignmentPage"),
  TeacherAssignmentPage: () => import("../pages/TeacherAssignmentPage"),
  TeacherAttendancePage: () => import("../pages/TeacherAttendancePage"),
  StudentAttendancePage: () => import("../pages/StudentAttendancePage"),
  TeacherExamPage: () => import("../pages/TeacherExamPage"),
  StudentExamPage: () => import("../pages/StudentExamPage"),
  CourseDashboard: () => import("../pages/CourseDashboard"),
  CommunityHub: () => import("../pages/CommunityHub"),
  PublicPostDetailPage: () => import("../pages/PublicPostDetailPage"),
  MessagePage: () => import("../pages/MessagePage"),
  CourseCommunity: () => import("../pages/CourseCommunity"),
  CourseCommunityPostDetail: () => import("../pages/CourseCommunityPostDetail"),
  TeacherAssessmentPage: () => import("../pages/TeacherAssessmentPage"),
  StudentAssessmentPage: () => import("../pages/StudentAssessmentPage"),
  SettingsPage: () => import("../pages/SettingsPage"),
  CourseAnalyticsPage: () => import("../pages/CourseAnalyticsPage"),
  NotificationsPage: () => import("../pages/NotificationsPage"),
  StudentLevelTermPage: () => import("../pages/StudentLevelTermPage"),
  CourseRegistrationPage: () => import("../pages/CourseRegistrationPage"),
  AcademicRegistrationPage: () => import("../pages/AcademicRegistrationPage"),
  TeacherRegistrationApprovalPage: () => import("../pages/TeacherRegistrationApprovalPage"),
  TeacherEnrolledStudentsPage: () => import("../pages/TeacherEnrolledStudentsPage"),
  AdminRegistrationCalendar: () => import("../pages/AdminRegistrationCalendar"),
  AdminPaymentManagement: () => import("../pages/AdminPaymentManagement"),
  AdminRegistrationList: () => import("../pages/AdminRegistrationList"),
  TeacherResultManagementPage: () => import("../pages/TeacherResultManagementPage"),
  AdminResultManagementPage: () => import("../pages/AdminResultManagementPage"),
  StudentAcademicResultsPage: () => import("../pages/StudentAcademicResultsPage"),
  UnderDevelopmentPage: () => import("../pages/UnderDevelopmentPage"),
  StudentAcademicProfilePage: () => import("../pages/StudentAcademicProfilePage"),
  StudentTranscriptPage: () => import("../pages/StudentTranscriptPage"),
  StudentRetakeRegistrationPage: () => import("../pages/StudentRetakeRegistrationPage"),
  TeacherRetakeApprovalPage: () => import("../pages/TeacherRetakeApprovalPage"),
  AdminProgressionPage: () => import("../pages/AdminProgressionPage"),
  AdminNoticeManagementPage: () => import("../pages/AdminNoticeManagementPage"),
  TeacherNoticePage: () => import("../pages/TeacherNoticePage"),
  StudentNoticePage: () => import("../pages/StudentNoticePage"),
  AdminCalendarManagementPage: () => import("../pages/AdminCalendarManagementPage"),
  AcademicCalendarViewPage: () => import("../pages/AcademicCalendarViewPage"),
  StudentRegistrationPaymentPage: () => import("../pages/StudentRegistrationPaymentPage"),
  AdminRegistrationPaymentPage: () => import("../pages/AdminRegistrationPaymentPage"),
};
const pending = new Map();
export function loadRouteModule(name) {
  if (!pending.has(name)) pending.set(name, loaders[name]().catch(error => { pending.delete(name); throw error; }));
  return pending.get(name);
}
const student = ['StudentAcademicProfilePage','StudentTranscriptPage','StudentAcademicResultsPage','CommunityHub','MessagePage','AcademicCalendarViewPage','StudentNoticePage','StudentAssessmentPage','StudentAssignmentPage','StudentAttendancePage','StudentExamPage','CourseDashboard'];
const teacher = ['CommunityHub','MessagePage','AcademicCalendarViewPage','TeacherNoticePage','TeacherAssessmentPage','TeacherAssignmentPage','TeacherAttendancePage','TeacherExamPage','TeacherResultManagementPage','CourseDashboard'];
export function warmRoutes(role) {
  if (navigator.connection?.saveData || /(^|-)2g/.test(navigator.connection?.effectiveType || '')) return () => {};
  const queue = [...(role === 'teacher' ? teacher : role === 'student' ? student : [])];
  let cancelled = false, timer, idle;
  const next = () => {
    if (cancelled || !queue.length) return;
    const load = () => { if (!cancelled) loadRouteModule(queue.shift()).catch(() => {}).finally(() => { if (!cancelled) timer = setTimeout(next, 200); }); };
    if (window.requestIdleCallback) idle = window.requestIdleCallback(load, { timeout: 4000 }); else timer = setTimeout(load, 300);
  };
  timer = setTimeout(next, 1800);
  return () => { cancelled = true; clearTimeout(timer); if (window.cancelIdleCallback && idle) window.cancelIdleCallback(idle); };
}
export function prefetchRoute(path) {
  const rules = [
    [/transcript/, 'StudentTranscriptPage'], [/academic-profile/, 'StudentAcademicProfilePage'],
    [/student\/results/, 'StudentAcademicResultsPage'], [/teacher\/results/, 'TeacherResultManagementPage'],
    [/messages/, 'MessagePage'], [/academic-calendar/, 'AcademicCalendarViewPage'],
    [/^\/community/, 'CommunityHub'], [/^\/course\//, 'CourseDashboard'],
    [/student\/assessment/, 'StudentAssessmentPage'], [/teacher\/assessment/, 'TeacherAssessmentPage'],
    [/student\/assignments/, 'StudentAssignmentPage'], [/teacher\/assignments/, 'TeacherAssignmentPage'],
    [/student\/attendance/, 'StudentAttendancePage'], [/teacher\/attendance/, 'TeacherAttendancePage'],
    [/student\/exams/, 'StudentExamPage'], [/teacher\/exams/, 'TeacherExamPage'],
    [/student\/notices/, 'StudentNoticePage'], [/teacher\/notices/, 'TeacherNoticePage'],
  ];
  const match = rules.find(([pattern]) => pattern.test(path || ''));
  if (match) loadRouteModule(match[1]).catch(() => {});
}
