# Graph Report - UFTB_Moodle  (2026-07-30)

## Corpus Check
- 191 files · ~187,952 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1159 nodes · 1952 edges · 94 communities (66 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3421e176`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- authMiddleware.js
- dependencies
- communityController.js
- User.js
- assignmentController.js
- test_exam_controller.js
- attendanceController.js
- lectureController.js
- examController.js
- authRoutes.js
- package.json
- dependencies
- assessmentController.js
- previewService.js
- deadlineReminder.js
- package.json
- development
- emailService.js
- package.json
- manifest.json
- upload.js
- authMiddleware.js
- scripts
- seedAdmin.js
- previewService.js
- inspect_submissions.js
- delete_user.js
- Department.js
- JoinRequest.js
- cleanup_teachers_from_students.js
- inspect_db.js
- test_query_requests.js
- vercel.json
- notificationRoutes.js
- react
- verifyToken
- Exam.js
- assessmentRoutes.js
- assignmentRoutes.js
- lectureRoutes.js
- examRoutes.js
- ShareModal.jsx
- deadlineReminder.js
- emailService.js
- registrationController.js
- Assessment.js
- useAuth
- apiCache.js
- test_phase2_flow.js
- announcementController.js
- test_assignment_controller.js
- AuthContext.jsx
- CommunityHub.jsx
- recalculate_all_plagiarism.js
- verifyToken
- registrationRoutes.js
- User.js
- react-scripts
- umsAdminRoutes.js
- Adviser.js
- AuthContext.jsx
- Payment.js
- StudentRegistrationPaymentPage.jsx
- StudentExamPage.jsx
- Result.js
- adminRoutes.js
- attendanceRoutes.js
- registrationPaymentRoutes.js
- axios
- react
- react-hot-toast
- run_recalculate.js
- examRoutes.js
- @testing-library/jest-dom
- @testing-library/react
- @testing-library/user-event
- xlsx
- GlobalSettingsPortal.jsx
- SkeletonLoader.jsx
- TeacherHomeDashboard.jsx
- serviceRoutes.js
- StudentExamPage.jsx
- Department.js
- CommunityPost.js
- docx-preview
- RetakeRequest.js
- Transcript.js
- courseRoutes.js
- StudentExamPage.jsx

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 63 edges
2. `api` - 63 edges
3. `getIO()` - 42 edges
4. `StudentSidebar()` - 23 edges
5. `queueEmail()` - 23 edges
6. `TeacherSidebar()` - 21 edges
7. `verifyToken()` - 18 edges
8. `AdminSidebar()` - 17 edges
9. `CommunityPost` - 17 edges
10. `ResultUpload` - 16 edges

## Surprising Connections (you probably didn't know these)
- `test()` --references--> `Lecture`  [EXTRACTED]
  scratch/test_view.js → server/controllers/lectureController.js
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `RoleRouter()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `AppContent()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `AcademicCalendarViewPage()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/pages/AcademicCalendarViewPage.jsx → client/src/contexts/AuthContext.jsx

## Import Cycles
- None detected.

## Communities (94 total, 28 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.17
Nodes (3): StudentSidebar(), MessagePage(), RTC_CONFIG

### Community 1 - "authMiddleware.js"
Cohesion: 0.18
Nodes (8): multer, path, storage, upload, ctrl, router, upload, { verifyToken }

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): bcryptjs, cors, dotenv, express, jsonwebtoken, mammoth, mongoose, multer (+38 more)

### Community 3 - "communityController.js"
Cohesion: 0.07
Nodes (41): addCourseComment(), addPublicComment(), CommunityComment, CommunityPost, ContactRequest, Course, createCoursePost(), createPublicPost() (+33 more)

### Community 4 - "User.js"
Cohesion: 0.22
Nodes (7): verifyToken(), ctrl, router, { verifyToken, checkRole }, ctrl, router, { verifyToken, checkRole }

### Community 5 - "assignmentController.js"
Cohesion: 0.05
Nodes (43): Assignment, Course, deleteSubmission(), fs, { getIO }, getSubmissions(), gradeSubmission(), Notification (+35 more)

### Community 6 - "test_exam_controller.js"
Cohesion: 0.16
Nodes (14): assert, Course, emailService, Exam, examController, ExamSubmission, mongoose, Notification (+6 more)

### Community 7 - "attendanceController.js"
Cohesion: 0.07
Nodes (19): Attendance, Course, evalArithmetic(), evaluateExcelFormula(), getAttendance(), getAttendanceStats(), markAttendance(), IMPORTANT: Filter only students, not teachers (+11 more)

### Community 8 - "lectureController.js"
Cohesion: 0.09
Nodes (25): axios, jwt, mongoose, test(), Course, deleteLecture(), downloadLecture(), fs (+17 more)

### Community 9 - "examController.js"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 10 - "authRoutes.js"
Cohesion: 0.18
Nodes (16): bcrypt, blockUser(), forgotPassword(), generateToken(), getBlockedUsers(), getMe(), jwt, login() (+8 more)

### Community 11 - "package.json"
Cohesion: 0.11
Nodes (18): concurrently, author, dependencies, concurrently, nodemon, description, nodemon, keywords (+10 more)

### Community 12 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, jspdf-autotable, jszip, react-hot-toast, socket.io-client, @testing-library/dom, @testing-library/user-event, web-vitals (+7 more)

### Community 13 - "assessmentController.js"
Cohesion: 0.15
Nodes (8): Assessment, Course, fs, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User, XLSX

### Community 14 - "previewService.js"
Cohesion: 0.04
Nodes (54): AcademicCalendarViewPage, AcademicRegistrationPage, AdminAdvisers, AdminAuditLogsPage, AdminCalendarManagementPage, AdminCourses, AdminDashboard, AdminNoticeManagementPage (+46 more)

### Community 15 - "deadlineReminder.js"
Cohesion: 0.06
Nodes (10): Adviser, CourseImport, importTeachers(), Payment, Registration, RegistrationCalendar, Student, syncTeacherCourseAssignments() (+2 more)

### Community 16 - "package.json"
Cohesion: 0.13
Nodes (11): courseImportSchema, mongoose, mongoose, teacherSchema, Adviser, bcrypt, CourseImport, mongoose (+3 more)

### Community 17 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 19 - "package.json"
Cohesion: 0.50
Nodes (3): @opencode-ai/plugin, dependencies, @opencode-ai/plugin

### Community 20 - "manifest.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 21 - "upload.js"
Cohesion: 0.11
Nodes (20): GlobalNotificationBell(), AuthContext, AuthProvider(), getActiveStatusSetting(), getSocketUrl(), useAuth(), AuthPage(), CourseAnalyticsPage() (+12 more)

### Community 22 - "authMiddleware.js"
Cohesion: 0.22
Nodes (7): checkRole(), ctrl, router, { verifyToken, checkRole }, ctrl, router, { verifyToken, checkRole }

### Community 23 - "scripts"
Cohesion: 0.11
Nodes (14): mongoose, allowedOrigins, app, connectDB, cors, dns, express, fs (+6 more)

### Community 24 - "seedAdmin.js"
Cohesion: 0.40
Nodes (3): adminData, bcrypt, mongoose

### Community 25 - "previewService.js"
Cohesion: 0.25
Nodes (7): eslintConfig, extends, name, private, version, react-app, react-app/jest

### Community 28 - "Department.js"
Cohesion: 0.10
Nodes (27): AcademicProfile, AuditLog, calculateStudentCGPA(), CGPARecord, computeGradePoint(), Course, CourseImport, Department (+19 more)

### Community 34 - "notificationRoutes.js"
Cohesion: 0.31
Nodes (7): getNotifications(), markAllAsRead(), markAsRead(), Notification, {
  getNotifications,
  markAsRead,
  markAllAsRead,
}, router, { verifyToken }

### Community 37 - "Exam.js"
Cohesion: 0.06
Nodes (46): AcademicProfile, batchUpdateMarks(), calculateSemesterGPA(), CGPARecord, Course, CourseImport, createCorrectionRequest(), deleteDraftUpload() (+38 more)

### Community 38 - "assessmentRoutes.js"
Cohesion: 0.40
Nodes (4): ctrl, router, upload, { verifyToken, checkRole }

### Community 39 - "assignmentRoutes.js"
Cohesion: 0.40
Nodes (4): ctrl, router, upload, { verifyToken, checkRole }

### Community 40 - "lectureRoutes.js"
Cohesion: 0.40
Nodes (4): ctrl, router, upload, { verifyToken, checkRole }

### Community 41 - "examRoutes.js"
Cohesion: 0.42
Nodes (4): PaymentCheckoutModal(), RegistrationInvoiceModal(), FIXED_REGISTRATION_FEES, FIXED_REGISTRATION_FEES

### Community 42 - "ShareModal.jsx"
Cohesion: 0.13
Nodes (24): FilePreviewModal(), ShareModal(), CommentItem(), CommunityHub(), CreatePostModal(), EditPostModal(), getFileUrl(), PostCard() (+16 more)

### Community 48 - "emailService.js"
Cohesion: 0.20
Nodes (8): { sendEmail, emailTemplates }, test(), clientUrl, emailQueue, emailTemplates, nodemailer, processQueue(), transporter

### Community 49 - "registrationController.js"
Cohesion: 0.15
Nodes (15): Adviser, approveAllPendingRegistrations(), approveRegistration(), CourseImport, createNotification(), Enrollment, linkOrCreateLmsCourse(), Payment (+7 more)

### Community 50 - "Assessment.js"
Cohesion: 0.25
Nodes (5): Assessment, assessmentSchema, mongoose, Assessment, mongoose

### Community 51 - "useAuth"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 52 - "apiCache.js"
Cohesion: 0.23
Nodes (14): CourseListPage(), getCourseBanner(), StudentAssignmentPage(), StudentDashboard(), TeacherAssignmentPage(), TeacherDashboard(), BACKEND_URL, fetchWithCache() (+6 more)

### Community 53 - "test_phase2_flow.js"
Cohesion: 0.10
Nodes (16): enrollmentSchema, mongoose, mongoose, registrationSchema, mongoose, registrationCalendarSchema, Adviser, bcrypt (+8 more)

### Community 54 - "announcementController.js"
Cohesion: 0.18
Nodes (13): Announcement, Course, createAnnouncement(), deleteAnnouncement(), getCourseAnnouncements(), { getIO }, { sendEmail }, updateAnnouncement() (+5 more)

### Community 55 - "test_assignment_controller.js"
Cohesion: 0.07
Nodes (30): CourseRegistrationPage(), StudentRegistrationPaymentPage(), getPendingRegistrationsForAdviser(), AuditLog, calculateRegistrationFee(), createAuditLog(), FIXED_FEES_TOTAL, FIXED_REGISTRATION_FEES (+22 more)

### Community 56 - "AuthContext.jsx"
Cohesion: 0.12
Nodes (12): Assignment, Course, CourseImport, Notice, Result, Student, Teacher, User (+4 more)

### Community 57 - "CommunityHub.jsx"
Cohesion: 0.25
Nodes (5): examSchema, mongoose, questionSchema, Exam, mongoose

### Community 58 - "recalculate_all_plagiarism.js"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 59 - "verifyToken"
Cohesion: 0.13
Nodes (16): AcademicCalendarEvent, { createAuditLog }, createCalendarEvent(), deleteCalendarEvent(), getCalendarEvents(), { getIO }, getPublishedCalendar(), Notification (+8 more)

### Community 60 - "registrationRoutes.js"
Cohesion: 0.40
Nodes (4): express, regCtrl, router, { verifyToken, checkRole }

### Community 61 - "User.js"
Cohesion: 0.10
Nodes (11): analyzeAI(), { analyzeAnswers }, Exam, ExamSubmission, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User (+3 more)

### Community 63 - "umsAdminRoutes.js"
Cohesion: 0.43
Nodes (3): DEFAULT_CALENDAR_DATA, OfficialAcademicCalendarCard(), AcademicCalendarViewPage()

### Community 64 - "Adviser.js"
Cohesion: 0.07
Nodes (31): mongoose, submissionSchema, fs, main(), mongoose, path, recalculateAssignmentSimilarity(), similarityService (+23 more)

### Community 66 - "Payment.js"
Cohesion: 0.13
Nodes (15): createAuditLog(), graduateStudent(), promoteStudentsBatch(), { createAuditLog }, createNotice(), deleteNotice(), { getIO }, Notice (+7 more)

### Community 70 - "adminRoutes.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 71 - "attendanceRoutes.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 72 - "registrationPaymentRoutes.js"
Cohesion: 0.50
Nodes (3): payCtrl, router, { verifyToken, checkRole }

### Community 73 - "axios"
Cohesion: 0.22
Nodes (9): uploadMarksheet(), createAssignment(), createContactRequest(), respondToContactRequest(), createExam(), publishExamResults(), submitExam(), startScheduler() (+1 more)

### Community 74 - "react"
Cohesion: 0.67
Nodes (3): react, TeacherResultManagementPage(), react

### Community 77 - "examRoutes.js"
Cohesion: 0.25
Nodes (5): adviserSchema, mongoose, Adviser, dns, mongoose

### Community 84 - "TeacherHomeDashboard.jsx"
Cohesion: 0.20
Nodes (3): getCourseBanner(), TeacherHomeDashboard(), TeacherSidebar()

### Community 85 - "serviceRoutes.js"
Cohesion: 0.29
Nodes (6): calendarCtrl, noticeCtrl, router, searchCtrl, upload, { verifyToken, checkRole }

### Community 86 - "StudentExamPage.jsx"
Cohesion: 0.20
Nodes (8): bcrypt, mongoose, userSchema, ContactRequest, initSocket(), onlineUsers, { Server }, User

### Community 88 - "CommunityPost.js"
Cohesion: 0.15
Nodes (11): answerSchema, examSubmissionSchema, mongoose, Assignment, cron, Exam, ExamSubmission, { getIO } (+3 more)

### Community 93 - "courseRoutes.js"
Cohesion: 0.29
Nodes (5): jwt, User, ctrl, router, { verifyToken, checkRole }

### Community 97 - "StudentExamPage.jsx"
Cohesion: 0.22
Nodes (6): mongoose, studentSchema, dns, mongoose, path, Student

## Knowledge Gaps
- **523 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin`, `name`, `version` (+518 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StudentRegistrationPaymentPage()` connect `test_assignment_controller.js` to `examRoutes.js`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `api` connect `emailService.js` to `App.jsx`, `StudentExamPage.jsx`, `examRoutes.js`, `ShareModal.jsx`, `TeacherHomeDashboard.jsx`, `upload.js`, `apiCache.js`, `umsAdminRoutes.js`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin` to the rest of the system?**
  _527 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `communityController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07123034227567067 - nodes in this community are weakly interconnected._
- **Should `assignmentController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `attendanceController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._