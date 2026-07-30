# Graph Report - UFTB_Moodle  (2026-07-27)

## Corpus Check
- 183 files · ~160,912 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1112 nodes · 1862 edges · 90 communities (63 shown, 27 thin omitted)
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
- CourseCommunity.jsx
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
- Registration.js
- RegistrationCalendar.js
- Result.js
- axios
- ResultUpload.js
- Student.js
- axios
- react
- react-hot-toast
- run_recalculate.js
- @testing-library/jest-dom
- @testing-library/react
- @testing-library/user-event
- xlsx
- GlobalSettingsPortal.jsx
- SkeletonLoader.jsx
- test_plagiarism.js
- serviceRoutes.js
- StudentExamPage.jsx
- AcademicProfile.js
- docx-preview
- CourseImport.js
- test_plagiarism.js

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 63 edges
2. `api` - 60 edges
3. `getIO()` - 40 edges
4. `queueEmail()` - 23 edges
5. `StudentSidebar()` - 22 edges
6. `TeacherSidebar()` - 20 edges
7. `verifyToken()` - 18 edges
8. `AdminSidebar()` - 17 edges
9. `CommunityPost` - 17 edges
10. `checkRole()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `test()` --references--> `Lecture`  [EXTRACTED]
  scratch/test_view.js → server/controllers/lectureController.js
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `RoleRouter()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `AppContent()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `CommunityHub()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/pages/CommunityHub.jsx → client/src/contexts/AuthContext.jsx

## Import Cycles
- None detected.

## Communities (90 total, 27 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.29
Nodes (10): FilePreviewModal(), CommentItem(), CommunityHub(), CreatePostModal(), EditPostModal(), getFileUrl(), PostCard(), renderAttachments() (+2 more)

### Community 1 - "authMiddleware.js"
Cohesion: 0.18
Nodes (8): multer, path, storage, upload, ctrl, router, upload, { verifyToken }

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): bcryptjs, cors, dotenv, express, jsonwebtoken, mammoth, mongoose, multer (+38 more)

### Community 3 - "communityController.js"
Cohesion: 0.06
Nodes (54): uploadMarksheet(), createAssignment(), gradeSubmission(), addCourseComment(), addPublicComment(), CommunityComment, CommunityPost, ContactRequest (+46 more)

### Community 4 - "User.js"
Cohesion: 0.16
Nodes (14): assert, Course, emailService, Exam, examController, ExamSubmission, mongoose, Notification (+6 more)

### Community 5 - "assignmentController.js"
Cohesion: 0.11
Nodes (18): Assignment, Course, deleteSubmission(), fs, { getIO }, getSubmissions(), Notification, path (+10 more)

### Community 6 - "test_exam_controller.js"
Cohesion: 0.10
Nodes (11): analyzeAI(), { analyzeAnswers }, Exam, ExamSubmission, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User (+3 more)

### Community 7 - "attendanceController.js"
Cohesion: 0.07
Nodes (19): Attendance, Course, evalArithmetic(), evaluateExcelFormula(), getAttendance(), getAttendanceStats(), markAttendance(), IMPORTANT: Filter only students, not teachers (+11 more)

### Community 8 - "lectureController.js"
Cohesion: 0.07
Nodes (36): axios, jwt, mongoose, test(), Course, deleteLecture(), downloadLecture(), fs (+28 more)

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
Nodes (15): dependencies, axios, jszip, react-dom, react-icons, socket.io-client, @testing-library/dom, web-vitals (+7 more)

### Community 13 - "assessmentController.js"
Cohesion: 0.12
Nodes (10): Assessment, Course, fs, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User, XLSX (+2 more)

### Community 14 - "previewService.js"
Cohesion: 0.04
Nodes (52): AcademicCalendarViewPage, AcademicRegistrationPage, AdminAdvisers, AdminAuditLogsPage, AdminCalendarManagementPage, AdminCourses, AdminDashboard, AdminNoticeManagementPage (+44 more)

### Community 15 - "deadlineReminder.js"
Cohesion: 0.06
Nodes (10): Adviser, CourseImport, importTeachers(), Payment, Registration, RegistrationCalendar, Student, syncTeacherCourseAssignments() (+2 more)

### Community 16 - "package.json"
Cohesion: 0.13
Nodes (11): adviserSchema, mongoose, mongoose, teacherSchema, Adviser, bcrypt, CourseImport, mongoose (+3 more)

### Community 17 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 18 - "emailService.js"
Cohesion: 0.09
Nodes (3): AdminSidebar(), PaymentCheckoutModal(), api

### Community 19 - "package.json"
Cohesion: 0.50
Nodes (3): @opencode-ai/plugin, dependencies, @opencode-ai/plugin

### Community 20 - "manifest.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 21 - "upload.js"
Cohesion: 0.11
Nodes (22): GlobalNotificationBell(), TeacherSidebar(), AuthContext, AuthProvider(), getActiveStatusSetting(), getSocketUrl(), useAuth(), AcademicCalendarViewPage() (+14 more)

### Community 22 - "authMiddleware.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

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
Cohesion: 0.06
Nodes (36): AcademicProfile, AuditLog, calculateStudentCGPA(), CGPARecord, Course, CourseImport, Department, Enrollment (+28 more)

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
Nodes (40): AcademicProfile, batchUpdateMarks(), CGPARecord, Course, CourseImport, createCorrectionRequest(), deleteDraftUpload(), getAdminResults() (+32 more)

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
Cohesion: 0.22
Nodes (7): checkRole(), ctrl, router, { verifyToken, checkRole }, ctrl, router, { verifyToken, checkRole }

### Community 42 - "ShareModal.jsx"
Cohesion: 0.16
Nodes (16): ShareModal(), CommentItem(), CourseCommunity(), CoursePostCard(), EditPostModal(), getFileUrl(), renderAttachments(), renderContentWithLinks() (+8 more)

### Community 47 - "deadlineReminder.js"
Cohesion: 0.20
Nodes (8): bcrypt, mongoose, userSchema, ContactRequest, initSocket(), onlineUsers, { Server }, User

### Community 48 - "emailService.js"
Cohesion: 0.21
Nodes (9): { sendEmail, emailTemplates }, test(), clientUrl, emailQueue, emailTemplates, nodemailer, processQueue(), sendEmail() (+1 more)

### Community 49 - "registrationController.js"
Cohesion: 0.15
Nodes (14): Adviser, approveAllPendingRegistrations(), approveRegistration(), CourseImport, createNotification(), Enrollment, linkOrCreateLmsCourse(), Payment (+6 more)

### Community 50 - "Assessment.js"
Cohesion: 0.25
Nodes (5): Assessment, assessmentSchema, mongoose, Assessment, mongoose

### Community 51 - "CourseCommunity.jsx"
Cohesion: 0.18
Nodes (10): mongoose, submissionSchema, fs, main(), mongoose, path, recalculateAssignmentSimilarity(), similarityService (+2 more)

### Community 52 - "apiCache.js"
Cohesion: 0.18
Nodes (16): getCourseBanner(), TeacherHomeDashboard(), CourseListPage(), getCourseBanner(), StudentAssignmentPage(), StudentDashboard(), TeacherAssignmentPage(), TeacherDashboard() (+8 more)

### Community 53 - "test_phase2_flow.js"
Cohesion: 0.11
Nodes (14): enrollmentSchema, mongoose, mongoose, paymentSchema, Adviser, bcrypt, CourseImport, Enrollment (+6 more)

### Community 54 - "announcementController.js"
Cohesion: 0.21
Nodes (11): Announcement, Course, createAnnouncement(), deleteAnnouncement(), getCourseAnnouncements(), { getIO }, { sendEmail }, updateAnnouncement() (+3 more)

### Community 55 - "test_assignment_controller.js"
Cohesion: 0.08
Nodes (24): AuditLog, calculateRegistrationFee(), createAuditLog(), getAdminRegistrationPayments(), { getIO }, getMoneyReceipt(), getStudentPaymentHistory(), initiateOrGetPaymentRecord() (+16 more)

### Community 56 - "AuthContext.jsx"
Cohesion: 0.12
Nodes (12): Assignment, Course, CourseImport, Notice, Result, Student, Teacher, User (+4 more)

### Community 57 - "CommunityHub.jsx"
Cohesion: 0.15
Nodes (11): answerSchema, examSubmissionSchema, mongoose, Assignment, cron, Exam, ExamSubmission, { getIO } (+3 more)

### Community 58 - "recalculate_all_plagiarism.js"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 59 - "verifyToken"
Cohesion: 0.29
Nodes (5): jwt, User, ctrl, router, { verifyToken, checkRole }

### Community 60 - "registrationRoutes.js"
Cohesion: 0.40
Nodes (4): express, regCtrl, router, { verifyToken, checkRole }

### Community 61 - "User.js"
Cohesion: 0.25
Nodes (5): examSchema, mongoose, questionSchema, Exam, mongoose

### Community 62 - "announcementRoutes.js"
Cohesion: 0.22
Nodes (7): verifyToken(), ctrl, router, { verifyToken, checkRole }, ctrl, router, { verifyToken, checkRole }

### Community 64 - "Adviser.js"
Cohesion: 0.26
Nodes (12): calculateSimilarity(), cleanExtractedText(), computeLevenshtein(), extractTextFromFile(), fs, getSentenceSimilarity(), getTrigrams(), mammoth (+4 more)

### Community 66 - "Payment.js"
Cohesion: 0.11
Nodes (20): AcademicCalendarEvent, { createAuditLog }, createCalendarEvent(), deleteCalendarEvent(), getCalendarEvents(), updateCalendarEvent(), createAuditLog(), graduateStudent() (+12 more)

### Community 71 - "ResultUpload.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 73 - "axios"
Cohesion: 0.16
Nodes (12): assignmentSchema, mongoose, assert, Assignment, assignmentController, fs, mongoose, path (+4 more)

### Community 76 - "run_recalculate.js"
Cohesion: 0.25
Nodes (8): fs, main(), mongoose, path, recalculateAssignmentSimilarity(), similarityService, Submission, User

### Community 85 - "serviceRoutes.js"
Cohesion: 0.33
Nodes (5): calendarCtrl, noticeCtrl, router, searchCtrl, { verifyToken, checkRole }

### Community 86 - "StudentExamPage.jsx"
Cohesion: 0.18
Nodes (3): StudentSidebar(), StudentExamPage(), analyzeAnswers()

### Community 95 - "test_plagiarism.js"
Cohesion: 0.50
Nodes (3): payCtrl, router, { verifyToken, checkRole }

## Knowledge Gaps
- **503 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin`, `name`, `version` (+498 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getIO()` connect `communityController.js` to `Payment.js`, `assignmentController.js`, `test_exam_controller.js`, `Exam.js`, `lectureController.js`, `assessmentController.js`, `deadlineReminder.js`, `announcementController.js`, `test_assignment_controller.js`, `CommunityHub.jsx`, `Department.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `AuthContext.jsx`, `axios`, `react`, `react-hot-toast`, `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`, `xlsx`, `AcademicProfile.js`, `docx-preview`, `previewService.js`, `umsAdminRoutes.js`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `upload.js` to `App.jsx`, `ShareModal.jsx`, `previewService.js`, `emailService.js`, `apiCache.js`, `StudentExamPage.jsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin` to the rest of the system?**
  _506 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `communityController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06271186440677966 - nodes in this community are weakly interconnected._
- **Should `assignmentController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10507246376811594 - nodes in this community are weakly interconnected._