# Graph Report - UFTB_Moodle  (2026-07-29)

## Corpus Check
- 187 files · ~176,222 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1142 nodes · 1933 edges · 100 communities (67 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9ffedde9`
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
- announcementRoutes.js
- umsAdminRoutes.js
- Adviser.js
- AuthContext.jsx
- Payment.js
- StudentRegistrationPaymentPage.jsx
- RegistrationCalendar.js
- Result.js
- axios
- ResultUpload.js
- AcademicCalendarEvent.js
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
- docx-preview
- serviceRoutes.js
- StudentExamPage.jsx
- Department.js
- CommunityPost.js
- docx-preview
- RetakeRequest.js
- CourseImport.js
- Transcript.js
- PublishedCalendar.js
- Student.js
- test_plagiarism.js
- axios
- StudentExamPage.jsx
- Submission.js
- test_plagiarism.js

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 63 edges
2. `api` - 62 edges
3. `getIO()` - 42 edges
4. `queueEmail()` - 23 edges
5. `StudentSidebar()` - 22 edges
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

## Communities (100 total, 33 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.18
Nodes (3): StudentSidebar(), StudentExamPage(), analyzeAnswers()

### Community 1 - "authMiddleware.js"
Cohesion: 0.18
Nodes (8): multer, path, storage, upload, ctrl, router, upload, { verifyToken }

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): bcryptjs, cors, dotenv, express, jsonwebtoken, mammoth, mongoose, multer (+38 more)

### Community 3 - "communityController.js"
Cohesion: 0.08
Nodes (39): addCourseComment(), addPublicComment(), CommunityComment, CommunityPost, ContactRequest, Course, createCoursePost(), createPublicPost() (+31 more)

### Community 4 - "User.js"
Cohesion: 0.22
Nodes (9): uploadMarksheet(), createAssignment(), gradeSubmission(), createContactRequest(), respondToContactRequest(), createExam(), publishExamResults(), submitExam() (+1 more)

### Community 5 - "assignmentController.js"
Cohesion: 0.11
Nodes (18): Assignment, Course, deleteSubmission(), fs, { getIO }, getSubmissions(), Notification, path (+10 more)

### Community 6 - "test_exam_controller.js"
Cohesion: 0.08
Nodes (22): examSchema, mongoose, questionSchema, answerSchema, examSubmissionSchema, mongoose, assert, Course (+14 more)

### Community 7 - "attendanceController.js"
Cohesion: 0.07
Nodes (19): Attendance, Course, evalArithmetic(), evaluateExcelFormula(), getAttendance(), getAttendanceStats(), markAttendance(), IMPORTANT: Filter only students, not teachers (+11 more)

### Community 8 - "lectureController.js"
Cohesion: 0.07
Nodes (37): axios, jwt, mongoose, test(), Course, deleteLecture(), downloadLecture(), fs (+29 more)

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
Nodes (15): dependencies, axios, jspdf-autotable, react-hot-toast, react-scripts, socket.io-client, @testing-library/dom, web-vitals (+7 more)

### Community 13 - "assessmentController.js"
Cohesion: 0.15
Nodes (8): Assessment, Course, fs, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User, XLSX

### Community 14 - "previewService.js"
Cohesion: 0.04
Nodes (53): AcademicCalendarViewPage, AcademicRegistrationPage, AdminAdvisers, AdminAuditLogsPage, AdminCalendarManagementPage, AdminCourses, AdminDashboard, AdminNoticeManagementPage (+45 more)

### Community 15 - "deadlineReminder.js"
Cohesion: 0.06
Nodes (10): Adviser, CourseImport, importTeachers(), Payment, Registration, RegistrationCalendar, Student, syncTeacherCourseAssignments() (+2 more)

### Community 16 - "package.json"
Cohesion: 0.13
Nodes (11): adviserSchema, mongoose, mongoose, teacherSchema, Adviser, bcrypt, CourseImport, mongoose (+3 more)

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
Cohesion: 0.19
Nodes (5): getCourseBanner(), TeacherHomeDashboard(), TeacherSidebar(), IMPORTANT: URL থেকে আসা courseId ব্যবহার করুন, TeacherExamPage()

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

### Community 36 - "verifyToken"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 37 - "Exam.js"
Cohesion: 0.07
Nodes (42): AcademicProfile, batchUpdateMarks(), calculateSemesterGPA(), CGPARecord, Course, CourseImport, createCorrectionRequest(), deleteDraftUpload() (+34 more)

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
Cohesion: 0.25
Nodes (7): PaymentCheckoutModal(), RegistrationInvoiceModal(), CourseRegistrationPage(), FIXED_REGISTRATION_FEES, FIXED_REGISTRATION_FEES, StudentRegistrationPaymentPage(), FIXED_FEES_TOTAL

### Community 42 - "ShareModal.jsx"
Cohesion: 0.19
Nodes (10): ShareModal(), CourseCommunityPostDetail(), renderContentWithLinks(), MessagePage(), RTC_CONFIG, PostDetailPage(), renderContentWithLinks(), PublicPostDetailPage() (+2 more)

### Community 47 - "deadlineReminder.js"
Cohesion: 0.33
Nodes (9): FilePreviewModal(), CommentItem(), CourseCommunity(), CoursePostCard(), EditPostModal(), getFileUrl(), renderAttachments(), renderContentWithLinks() (+1 more)

### Community 48 - "emailService.js"
Cohesion: 0.19
Nodes (10): setDeadlineAndNotice(), { sendEmail, emailTemplates }, test(), clientUrl, emailQueue, emailTemplates, nodemailer, processQueue() (+2 more)

### Community 49 - "registrationController.js"
Cohesion: 0.15
Nodes (15): Adviser, approveAllPendingRegistrations(), approveRegistration(), CourseImport, createNotification(), Enrollment, linkOrCreateLmsCourse(), Payment (+7 more)

### Community 50 - "Assessment.js"
Cohesion: 0.25
Nodes (5): Assessment, assessmentSchema, mongoose, Assessment, mongoose

### Community 51 - "useAuth"
Cohesion: 0.22
Nodes (7): verifyToken(), ctrl, router, { verifyToken, checkRole }, ctrl, router, { verifyToken, checkRole }

### Community 52 - "apiCache.js"
Cohesion: 0.19
Nodes (19): AuthContext, AuthProvider(), getActiveStatusSetting(), getSocketUrl(), CourseListPage(), getCourseBanner(), StudentAssignmentPage(), StudentDashboard() (+11 more)

### Community 53 - "test_phase2_flow.js"
Cohesion: 0.10
Nodes (16): enrollmentSchema, mongoose, mongoose, paymentSchema, mongoose, registrationSchema, Adviser, bcrypt (+8 more)

### Community 54 - "announcementController.js"
Cohesion: 0.21
Nodes (11): Announcement, Course, createAnnouncement(), deleteAnnouncement(), getCourseAnnouncements(), { getIO }, { sendEmail }, updateAnnouncement() (+3 more)

### Community 55 - "test_assignment_controller.js"
Cohesion: 0.08
Nodes (27): getPendingRegistrationsForAdviser(), AuditLog, calculateRegistrationFee(), createAuditLog(), FIXED_REGISTRATION_FEES, getAdminRegistrationPayments(), { getIO }, getMoneyReceipt() (+19 more)

### Community 56 - "AuthContext.jsx"
Cohesion: 0.11
Nodes (14): Assignment, Course, CourseImport, Notice, Result, Student, Teacher, User (+6 more)

### Community 57 - "CommunityHub.jsx"
Cohesion: 0.13
Nodes (20): GlobalNotificationBell(), useAuth(), AuthPage(), CommentItem(), CommunityHub(), CreatePostModal(), EditPostModal(), getFileUrl() (+12 more)

### Community 58 - "recalculate_all_plagiarism.js"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 59 - "verifyToken"
Cohesion: 0.16
Nodes (14): AcademicCalendarEvent, { createAuditLog }, createCalendarEvent(), deleteCalendarEvent(), getCalendarEvents(), { getIO }, getPublishedCalendar(), Notification (+6 more)

### Community 60 - "registrationRoutes.js"
Cohesion: 0.40
Nodes (4): express, regCtrl, router, { verifyToken, checkRole }

### Community 61 - "User.js"
Cohesion: 0.10
Nodes (11): analyzeAI(), { analyzeAnswers }, Exam, ExamSubmission, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User (+3 more)

### Community 62 - "announcementRoutes.js"
Cohesion: 0.29
Nodes (5): jwt, User, ctrl, router, { verifyToken, checkRole }

### Community 63 - "umsAdminRoutes.js"
Cohesion: 0.43
Nodes (3): DEFAULT_CALENDAR_DATA, OfficialAcademicCalendarCard(), AcademicCalendarViewPage()

### Community 64 - "Adviser.js"
Cohesion: 0.26
Nodes (12): calculateSimilarity(), cleanExtractedText(), computeLevenshtein(), extractTextFromFile(), fs, getSentenceSimilarity(), getTrigrams(), mammoth (+4 more)

### Community 65 - "AuthContext.jsx"
Cohesion: 0.16
Nodes (12): assignmentSchema, mongoose, assert, Assignment, assignmentController, fs, mongoose, path (+4 more)

### Community 66 - "Payment.js"
Cohesion: 0.16
Nodes (13): createAuditLog(), graduateStudent(), promoteStudentsBatch(), { createAuditLog }, createNotice(), deleteNotice(), { getIO }, Notice (+5 more)

### Community 71 - "ResultUpload.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 74 - "react"
Cohesion: 0.67
Nodes (3): react, TeacherResultManagementPage(), react

### Community 77 - "examRoutes.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 85 - "serviceRoutes.js"
Cohesion: 0.29
Nodes (6): calendarCtrl, noticeCtrl, router, searchCtrl, upload, { verifyToken, checkRole }

### Community 86 - "StudentExamPage.jsx"
Cohesion: 0.15
Nodes (10): contactRequestSchema, mongoose, bcrypt, mongoose, userSchema, ContactRequest, initSocket(), onlineUsers (+2 more)

### Community 88 - "CommunityPost.js"
Cohesion: 0.20
Nodes (9): Assignment, cron, Exam, ExamSubmission, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, startScheduler() (+1 more)

### Community 94 - "Student.js"
Cohesion: 0.25
Nodes (8): fs, main(), mongoose, path, recalculateAssignmentSimilarity(), similarityService, Submission, User

### Community 95 - "test_plagiarism.js"
Cohesion: 0.50
Nodes (3): payCtrl, router, { verifyToken, checkRole }

### Community 96 - "axios"
Cohesion: 0.25
Nodes (8): fs, main(), mongoose, path, recalculateAssignmentSimilarity(), similarityService, Submission, User

## Knowledge Gaps
- **514 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin`, `name`, `version` (+509 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FIXED_FEES_TOTAL` connect `examRoutes.js` to `test_assignment_controller.js`?**
  _High betweenness centrality (0.350) - this node is a cross-community bridge._
- **Why does `api` connect `emailService.js` to `App.jsx`, `examRoutes.js`, `ShareModal.jsx`, `deadlineReminder.js`, `apiCache.js`, `upload.js`, `CommunityHub.jsx`, `umsAdminRoutes.js`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin` to the rest of the system?**
  _518 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `communityController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07822410147991543 - nodes in this community are weakly interconnected._
- **Should `assignmentController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10507246376811594 - nodes in this community are weakly interconnected._
- **Should `test_exam_controller.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08262108262108261 - nodes in this community are weakly interconnected._