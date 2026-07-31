# Graph Report - UFTB_Moodle  (2026-07-31)

## Corpus Check
- 236 files · ~201,160 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1458 nodes · 2302 edges · 134 communities (97 shown, 37 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `edf6ec3d`
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
- clean_courses_programs.js
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
- uploadResultExcel
- Transcript.js
- courseRoutes.js
- ExamSubmission.js
- academicRoutes.js
- AcademicProfile.js
- StudentExamPage.jsx
- CGPARecord.js
- CommunityComment.js
- CommunityPost.js
- Course.js
- PrivateMessage.js
- ResultCorrectionRequest.js
- ResultLog.js
- ResultUpload.js
- jszip
- RegistrationCalendar.js
- createAuditLog
- reset_db.js
- test_dup_key.js
- uploadResultExcel
- courseController.js
- socket.js
- test_teacher_summary.js
- reset_test_user.js
- check_atlas.js
- find_atlas_db.js
- test_signup_api.js
- AcademicCalendarEvent.js
- Registration.js
- AcademicProfile.js
- test_plagiarism.js
- test_template_gen.js
- CGPARecord.js
- CommunityPost.js
- ResultCorrectionRequest.js
- test_id_collision_import.js
- examRoutes.js
- ResultCorrectionRequest.js
- ResultLog.js
- axios
- test_plagiarism.js
- jszip

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 64 edges
2. `api` - 63 edges
3. `getIO()` - 42 edges
4. `queueEmail()` - 25 edges
5. `StudentSidebar()` - 23 edges
6. `TeacherSidebar()` - 21 edges
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
- `AcademicCalendarViewPage()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/pages/AcademicCalendarViewPage.jsx → client/src/contexts/AuthContext.jsx

## Import Cycles
- None detected.

## Communities (134 total, 37 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.16
Nodes (3): StudentSidebar(), MessagePage(), RTC_CONFIG

### Community 1 - "authMiddleware.js"
Cohesion: 0.18
Nodes (8): multer, path, storage, upload, ctrl, router, upload, { verifyToken }

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): bcryptjs, cors, dotenv, express, jsonwebtoken, mammoth, mongoose, multer (+38 more)

### Community 3 - "communityController.js"
Cohesion: 0.08
Nodes (38): addCourseComment(), addPublicComment(), CommunityComment, CommunityPost, ContactRequest, Course, deleteComment(), deleteMessage() (+30 more)

### Community 4 - "User.js"
Cohesion: 0.22
Nodes (7): verifyToken(), ctrl, router, { verifyToken, checkRole }, ctrl, router, { verifyToken, checkRole }

### Community 5 - "assignmentController.js"
Cohesion: 0.05
Nodes (42): Assignment, Course, deleteSubmission(), fs, { getIO }, getSubmissions(), Notification, path (+34 more)

### Community 6 - "test_exam_controller.js"
Cohesion: 0.15
Nodes (10): Assignment, Course, CourseImport, Notice, Result, Student, Teacher, User (+2 more)

### Community 7 - "attendanceController.js"
Cohesion: 0.07
Nodes (22): Attendance, Course, evalArithmetic(), evaluateExcelFormula(), getAttendance(), getAttendanceStats(), markAttendance(), IMPORTANT: Filter only students, not teachers (+14 more)

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
Nodes (15): dependencies, jspdf-autotable, react-hot-toast, react-icons, react-scripts, socket.io-client, @testing-library/jest-dom, web-vitals (+7 more)

### Community 13 - "assessmentController.js"
Cohesion: 0.12
Nodes (11): Assessment, Course, fs, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, uploadMarksheet(), User (+3 more)

### Community 14 - "previewService.js"
Cohesion: 0.04
Nodes (54): AcademicCalendarViewPage, AcademicRegistrationPage, AdminAdvisers, AdminAuditLogsPage, AdminCalendarManagementPage, AdminCourses, AdminDashboard, AdminNoticeManagementPage (+46 more)

### Community 15 - "deadlineReminder.js"
Cohesion: 0.06
Nodes (7): Adviser, CourseImport, Payment, Registration, RegistrationCalendar, Student, Teacher

### Community 16 - "package.json"
Cohesion: 0.22
Nodes (7): Adviser, bcrypt, CourseImport, mongoose, Student, Teacher, User

### Community 17 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 19 - "package.json"
Cohesion: 0.50
Nodes (3): @opencode-ai/plugin, dependencies, @opencode-ai/plugin

### Community 20 - "manifest.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 22 - "authMiddleware.js"
Cohesion: 0.25
Nodes (6): Course, Enrollment, mongoose, Registration, Student, User

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
Cohesion: 0.11
Nodes (22): AcademicProfile, AuditLog, CGPARecord, Course, CourseImport, Department, Enrollment, getAdminDashboardStats() (+14 more)

### Community 34 - "notificationRoutes.js"
Cohesion: 0.31
Nodes (7): getNotifications(), markAllAsRead(), markAsRead(), Notification, {
  getNotifications,
  markAsRead,
  markAllAsRead,
}, router, { verifyToken }

### Community 37 - "Exam.js"
Cohesion: 0.09
Nodes (20): AcademicProfile, CGPARecord, Course, CourseImport, createCorrectionRequest(), { getIO }, getStudentCorrectionRequests(), getTeacherCorrectionRequests() (+12 more)

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
Cohesion: 0.30
Nodes (4): PaymentCheckoutModal(), RegistrationInvoiceModal(), FIXED_REGISTRATION_FEES, FIXED_REGISTRATION_FEES

### Community 42 - "ShareModal.jsx"
Cohesion: 0.16
Nodes (16): ShareModal(), CommentItem(), CourseCommunity(), CoursePostCard(), EditPostModal(), getFileUrl(), renderAttachments(), renderContentWithLinks() (+8 more)

### Community 47 - "deadlineReminder.js"
Cohesion: 0.33
Nodes (5): ContactRequest, initSocket(), onlineUsers, { Server }, User

### Community 48 - "emailService.js"
Cohesion: 0.19
Nodes (10): setDeadlineAndNotice(), { sendEmail, emailTemplates }, test(), clientUrl, emailQueue, emailTemplates, nodemailer, processQueue() (+2 more)

### Community 49 - "registrationController.js"
Cohesion: 0.09
Nodes (28): Adviser, approveAllPendingRegistrations(), approveRegistration(), CourseImport, createNotification(), Enrollment, findRegistrationCalendarRule(), getAvailableCourses() (+20 more)

### Community 50 - "Assessment.js"
Cohesion: 0.06
Nodes (21): Assessment, assessmentSchema, mongoose, Assessment, dns, mongoose, path, Assessment (+13 more)

### Community 51 - "useAuth"
Cohesion: 0.23
Nodes (12): react-dom, FilePreviewModal(), CommentItem(), CommunityHub(), CreatePostModal(), EditPostModal(), getFileUrl(), PostCard() (+4 more)

### Community 52 - "apiCache.js"
Cohesion: 0.11
Nodes (32): GlobalNotificationBell(), AuthContext, AuthProvider(), getActiveStatusSetting(), getSocketUrl(), useAuth(), AuthPage(), CourseAnalyticsPage() (+24 more)

### Community 53 - "test_phase2_flow.js"
Cohesion: 0.13
Nodes (12): mongoose, paymentSchema, Adviser, bcrypt, CourseImport, Enrollment, mongoose, Payment (+4 more)

### Community 54 - "announcementController.js"
Cohesion: 0.21
Nodes (11): Announcement, Course, createAnnouncement(), deleteAnnouncement(), getCourseAnnouncements(), { getIO }, { sendEmail }, updateAnnouncement() (+3 more)

### Community 55 - "test_assignment_controller.js"
Cohesion: 0.05
Nodes (35): CourseRegistrationPage(), StudentRegistrationPaymentPage(), AuditLog, calculateRegistrationFee(), createAuditLog(), FIXED_FEES_TOTAL, FIXED_REGISTRATION_FEES, getAdminRegistrationPayments() (+27 more)

### Community 56 - "AuthContext.jsx"
Cohesion: 0.17
Nodes (9): mongoose, noticeSchema, dns, mongoose, Notice, path, Result, ResultUpload (+1 more)

### Community 57 - "CommunityHub.jsx"
Cohesion: 0.17
Nodes (9): mongoose, resultUploadSchema, dns, mongoose, Notice, path, ResultUpload, Teacher (+1 more)

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

### Community 62 - "react-scripts"
Cohesion: 0.12
Nodes (12): mongoose, studentSchema, dns, mongoose, path, Student, Teacher, User (+4 more)

### Community 63 - "umsAdminRoutes.js"
Cohesion: 0.22
Nodes (6): courseImportSchema, mongoose, CourseImport, dns, mongoose, path

### Community 64 - "Adviser.js"
Cohesion: 0.07
Nodes (31): mongoose, submissionSchema, fs, main(), mongoose, path, recalculateAssignmentSimilarity(), similarityService (+23 more)

### Community 65 - "clean_courses_programs.js"
Cohesion: 0.20
Nodes (9): courseSchema, mongoose, cleanAtlasPrograms(), Course, dns, mapProgramToShortForm(), mongoose, path (+1 more)

### Community 66 - "Payment.js"
Cohesion: 0.16
Nodes (12): createAuditLog(), graduateStudent(), promoteStudentsBatch(), { createAuditLog }, createNotice(), deleteNotice(), { getIO }, Notice (+4 more)

### Community 67 - "StudentRegistrationPaymentPage.jsx"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 68 - "StudentExamPage.jsx"
Cohesion: 0.20
Nodes (10): importTeachers(), syncTeacherCourseAssignments(), updateTeacher(), dns, { importTeachers }, mongoose, path, Teacher (+2 more)

### Community 70 - "adminRoutes.js"
Cohesion: 0.25
Nodes (6): dns, mongoose, path, Student, Teacher, User

### Community 71 - "attendanceRoutes.js"
Cohesion: 0.29
Nodes (5): dns, mongoose, path, Student, User

### Community 72 - "registrationPaymentRoutes.js"
Cohesion: 0.29
Nodes (5): jwt, User, payCtrl, router, { verifyToken, checkRole }

### Community 73 - "axios"
Cohesion: 0.28
Nodes (13): createAssignment(), gradeSubmission(), createContactRequest(), createCoursePost(), createPublicPost(), respondToContactRequest(), sendMessage(), createExam() (+5 more)

### Community 74 - "react"
Cohesion: 0.67
Nodes (3): react, TeacherResultManagementPage(), react

### Community 75 - "react-hot-toast"
Cohesion: 0.16
Nodes (14): assert, Course, emailService, Exam, examController, ExamSubmission, mongoose, Notification (+6 more)

### Community 77 - "examRoutes.js"
Cohesion: 0.18
Nodes (8): enrollmentSchema, mongoose, Course, Enrollment, mongoose, Registration, Student, User

### Community 78 - "@testing-library/jest-dom"
Cohesion: 0.14
Nodes (12): answerSchema, examSubmissionSchema, mongoose, Assignment, cron, Exam, ExamSubmission, { getIO } (+4 more)

### Community 84 - "TeacherHomeDashboard.jsx"
Cohesion: 0.25
Nodes (5): adviserSchema, mongoose, Adviser, dns, mongoose

### Community 85 - "serviceRoutes.js"
Cohesion: 0.29
Nodes (6): calendarCtrl, noticeCtrl, router, searchCtrl, upload, { verifyToken, checkRole }

### Community 86 - "StudentExamPage.jsx"
Cohesion: 0.12
Nodes (11): bcrypt, mongoose, userSchema, mongoose, Student, Teacher, User, dns (+3 more)

### Community 88 - "CommunityPost.js"
Cohesion: 0.25
Nodes (5): examSchema, mongoose, questionSchema, Exam, mongoose

### Community 89 - "docx-preview"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 91 - "uploadResultExcel"
Cohesion: 0.25
Nodes (7): { approveRegistration }, CourseImport, mongoose, Registration, run(), Student, User

### Community 93 - "courseRoutes.js"
Cohesion: 0.43
Nodes (3): DEFAULT_CALENDAR_DATA, OfficialAcademicCalendarCard(), AcademicCalendarViewPage()

### Community 94 - "ExamSubmission.js"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 95 - "academicRoutes.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 96 - "AcademicProfile.js"
Cohesion: 0.25
Nodes (6): Course, dns, mongoose, path, Teacher, User

### Community 97 - "StudentExamPage.jsx"
Cohesion: 0.22
Nodes (7): checkRole(), ctrl, router, { verifyToken, checkRole }, ctrl, router, { verifyToken, checkRole }

### Community 98 - "CGPARecord.js"
Cohesion: 0.22
Nodes (7): axios, dns, FormData, fs, jwt, path, XLSX

### Community 99 - "CommunityComment.js"
Cohesion: 0.25
Nodes (6): Course, dns, mongoose, path, Teacher, User

### Community 100 - "CommunityPost.js"
Cohesion: 0.25
Nodes (6): axios, dns, jwt, mongoose, path, User

### Community 101 - "Course.js"
Cohesion: 0.50
Nodes (5): calculateStudentCGPA(), computeGradePoint(), getStudentAcademicProfile(), getStudentDashboardStats(), getStudentTranscript()

### Community 102 - "PrivateMessage.js"
Cohesion: 0.25
Nodes (6): axios, dns, jwt, mongoose, path, User

### Community 103 - "ResultCorrectionRequest.js"
Cohesion: 0.25
Nodes (6): axios, dns, jwt, mongoose, path, User

### Community 104 - "ResultLog.js"
Cohesion: 0.29
Nodes (5): dns, mongoose, path, Teacher, User

### Community 105 - "ResultUpload.js"
Cohesion: 0.29
Nodes (7): deleteDraftUpload(), getAdminResults(), publishResultBatch(), requestCorrectionBatch(), ResultLog, submitResultToAdmin(), verifyResultBatch()

### Community 106 - "jszip"
Cohesion: 0.25
Nodes (6): Course, Enrollment, mongoose, Registration, Student, User

### Community 109 - "reset_db.js"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 110 - "test_dup_key.js"
Cohesion: 0.25
Nodes (5): mongoose, teacherSchema, Adviser, mongoose, Teacher

### Community 111 - "uploadResultExcel"
Cohesion: 0.50
Nodes (4): batchUpdateMarks(), parseOptionalNumber(), uploadResultExcel(), validateResultRows()

### Community 113 - "socket.js"
Cohesion: 0.12
Nodes (11): mongoose, registrationSchema, Course, CourseImport, Enrollment, mongoose, Registration, Student (+3 more)

### Community 114 - "test_teacher_summary.js"
Cohesion: 0.22
Nodes (7): Course, CourseImport, dns, mongoose, path, Teacher, User

### Community 115 - "reset_test_user.js"
Cohesion: 0.40
Nodes (3): dns, mongoose, path

### Community 121 - "Registration.js"
Cohesion: 0.25
Nodes (6): Adviser, mongoose, Registration, Student, Teacher, User

### Community 127 - "CommunityPost.js"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 130 - "test_id_collision_import.js"
Cohesion: 0.33
Nodes (5): dns, { importTeachers }, mongoose, path, Teacher

### Community 131 - "examRoutes.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 134 - "axios"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

## Knowledge Gaps
- **734 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin`, `name`, `version` (+729 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StudentRegistrationPaymentPage()` connect `test_assignment_controller.js` to `examRoutes.js`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Why does `api` connect `upload.js` to `App.jsx`, `verifyToken`, `examRoutes.js`, `ShareModal.jsx`, `emailService.js`, `useAuth`, `apiCache.js`, `courseRoutes.js`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin` to the rest of the system?**
  _738 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `communityController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07505285412262157 - nodes in this community are weakly interconnected._
- **Should `assignmentController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05254901960784314 - nodes in this community are weakly interconnected._
- **Should `attendanceController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06827880512091039 - nodes in this community are weakly interconnected._