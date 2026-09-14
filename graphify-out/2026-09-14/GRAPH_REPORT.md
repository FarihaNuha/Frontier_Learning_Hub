# Graph Report - UFTB_Moodle  (2026-09-14)

## Corpus Check
- 250 files · ~225,311 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1537 nodes · 2405 edges · 142 communities (103 shown, 39 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a588b615`
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
- deadlineReminder.js
- xlsx
- GlobalSettingsPortal.jsx
- SkeletonLoader.jsx
- test_teacher_summary.js
- serviceRoutes.js
- StudentExamPage.jsx
- Department.js
- CommunityPost.js
- test_pending_query.js
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
- deadlineReminder.js
- jszip
- previewService.js
- PrivateMessage.js
- reset_db.js
- Submission.js
- Teacher.js
- courseController.js
- socket.js
- test_full_import_teachers.js
- reset_test_user.js
- check_atlas.js
- find_atlas_db.js
- test_signup_api.js
- AcademicCalendarEvent.js
- fix_teacher_course_links.js
- test_pending_query.js
- test_registration.js
- test_plagiarism.js
- test_template_gen.js
- test_view.js
- CGPARecord.js
- CommunityPost.js
- axios
- ResultCorrectionRequest.js
- inspect_student_docs.js
- jspdf
- react-dom
- reset_db.js
- docx-preview
- ResultCorrectionRequest.js
- ResultLog.js
- RegistrationCalendar.js
- react-dom
- @testing-library/jest-dom
- react-hot-toast
- docx-preview

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 67 edges
2. `api` - 63 edges
3. `getIO()` - 44 edges
4. `queueEmail()` - 25 edges
5. `StudentSidebar()` - 24 edges
6. `TeacherSidebar()` - 23 edges
7. `AdminSidebar()` - 18 edges
8. `CommunityPost` - 18 edges
9. `verifyToken()` - 18 edges
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

## Communities (142 total, 39 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.16
Nodes (6): StudentSidebar(), StudentAssignmentPage(), StudentAttendancePage(), StudentDashboard(), StudentExamPage(), BACKEND_URL

### Community 1 - "authMiddleware.js"
Cohesion: 0.18
Nodes (8): multer, path, storage, upload, ctrl, router, upload, { verifyToken }

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): bcryptjs, cors, dotenv, express, jsonwebtoken, mammoth, mongoose, multer (+38 more)

### Community 3 - "communityController.js"
Cohesion: 0.11
Nodes (31): addCourseComment(), addPublicComment(), CommunityComment, CommunityPost, ContactRequest, Course, deleteComment(), deleteMessage() (+23 more)

### Community 4 - "User.js"
Cohesion: 0.19
Nodes (10): ShareModal(), CourseCommunityPostDetail(), renderContentWithLinks(), MessagePage(), RTC_CONFIG, PostDetailPage(), renderContentWithLinks(), PublicPostDetailPage() (+2 more)

### Community 5 - "assignmentController.js"
Cohesion: 0.05
Nodes (38): Assignment, Course, deleteSubmission(), fs, { getIO }, getSubmissions(), Notification, path (+30 more)

### Community 6 - "test_exam_controller.js"
Cohesion: 0.13
Nodes (10): mongoose, registrationSchema, mongoose, Registration, Course, Enrollment, mongoose, Registration (+2 more)

### Community 7 - "attendanceController.js"
Cohesion: 0.07
Nodes (21): Attendance, Course, evalArithmetic(), evaluateExcelFormula(), getAttendance(), getAttendanceStats(), markAttendance(), User (+13 more)

### Community 8 - "lectureController.js"
Cohesion: 0.11
Nodes (22): Course, deleteLecture(), downloadLecture(), fs, { getIO }, getLectureById(), getLectures(), jwt (+14 more)

### Community 9 - "examController.js"
Cohesion: 0.26
Nodes (12): buildSlideBodyHtml(), extractPptxSlidesArray(), extractPptxSlidesHtml(), extractSlideElements(), formatTableHtml(), formatTextElementHtml(), fs, generatePreviewData() (+4 more)

### Community 10 - "authRoutes.js"
Cohesion: 0.18
Nodes (16): bcrypt, blockUser(), forgotPassword(), generateToken(), getBlockedUsers(), getMe(), jwt, login() (+8 more)

### Community 11 - "package.json"
Cohesion: 0.11
Nodes (18): concurrently, author, dependencies, concurrently, nodemon, description, nodemon, keywords (+10 more)

### Community 12 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, axios, jspdf-autotable, react-dom, react-icons, react-scripts, socket.io-client, @testing-library/jest-dom (+11 more)

### Community 13 - "assessmentController.js"
Cohesion: 0.08
Nodes (19): Assessment, Course, fs, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User, XLSX (+11 more)

### Community 14 - "previewService.js"
Cohesion: 0.04
Nodes (54): AcademicCalendarViewPage, AcademicRegistrationPage, AdminAdvisers, AdminCalendarManagementPage, AdminCourses, AdminDashboard, AdminNoticeManagementPage, AdminPaymentManagement (+46 more)

### Community 15 - "deadlineReminder.js"
Cohesion: 0.06
Nodes (7): Adviser, CourseImport, Payment, Registration, RegistrationCalendar, Student, Teacher

### Community 16 - "package.json"
Cohesion: 0.22
Nodes (6): courseImportSchema, mongoose, CourseImport, dns, mongoose, path

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
Cohesion: 0.12
Nodes (13): TeacherHomeDashboard(), TeacherSidebar(), AuthContext, AuthProvider(), getActiveStatusSetting(), getSocketUrl(), CourseAnalyticsPage(), NotificationsPage() (+5 more)

### Community 22 - "authMiddleware.js"
Cohesion: 0.18
Nodes (8): enrollmentSchema, mongoose, Course, Enrollment, mongoose, Registration, Student, User

### Community 23 - "scripts"
Cohesion: 0.08
Nodes (21): mongoose, allowedOrigins, app, connectDB, cors, dns, express, fs (+13 more)

### Community 24 - "seedAdmin.js"
Cohesion: 0.40
Nodes (3): adminData, bcrypt, mongoose

### Community 25 - "previewService.js"
Cohesion: 0.25
Nodes (7): eslintConfig, extends, name, private, version, react-app, react-app/jest

### Community 26 - "inspect_submissions.js"
Cohesion: 0.40
Nodes (3): dns, mongoose, path

### Community 28 - "Department.js"
Cohesion: 0.11
Nodes (21): AcademicProfile, AuditLog, calculateStudentCGPA(), CGPARecord, computeGradePoint(), Course, CourseImport, Department (+13 more)

### Community 34 - "notificationRoutes.js"
Cohesion: 0.31
Nodes (7): getNotifications(), markAllAsRead(), markAsRead(), Notification, {
  getNotifications,
  markAsRead,
  markAllAsRead,
}, router, { verifyToken }

### Community 36 - "verifyToken"
Cohesion: 0.07
Nodes (35): Adviser, approveAllPendingRegistrations(), approveRegistration(), CourseImport, createNotification(), Enrollment, findRegistrationCalendarRule(), getAvailableCourses() (+27 more)

### Community 37 - "Exam.js"
Cohesion: 0.09
Nodes (19): AcademicProfile, CGPARecord, Course, CourseImport, createCorrectionRequest(), { getIO }, getStudentCorrectionRequests(), getTeacherCorrectionRequests() (+11 more)

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
Cohesion: 0.33
Nodes (9): FilePreviewModal(), CommentItem(), CourseCommunity(), CoursePostCard(), EditPostModal(), getFileUrl(), renderAttachments(), renderContentWithLinks() (+1 more)

### Community 47 - "deadlineReminder.js"
Cohesion: 0.25
Nodes (6): axios, dns, jwt, mongoose, path, User

### Community 48 - "emailService.js"
Cohesion: 0.22
Nodes (8): Assignment, cron, Exam, ExamSubmission, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User

### Community 49 - "registrationController.js"
Cohesion: 0.12
Nodes (6): Exam, ExamSubmission, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User

### Community 50 - "Assessment.js"
Cohesion: 0.06
Nodes (21): Assessment, assessmentSchema, mongoose, Assessment, dns, mongoose, path, Assessment (+13 more)

### Community 51 - "useAuth"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 52 - "apiCache.js"
Cohesion: 0.27
Nodes (11): CourseListPage(), getCourseBanner(), TeacherAssignmentPage(), TeacherDashboard(), fetchWithCache(), getCachedData(), getUserScopedKey(), invalidateCache() (+3 more)

### Community 53 - "test_phase2_flow.js"
Cohesion: 0.11
Nodes (14): mongoose, paymentSchema, mongoose, registrationCalendarSchema, Adviser, bcrypt, CourseImport, Enrollment (+6 more)

### Community 54 - "announcementController.js"
Cohesion: 0.21
Nodes (11): Announcement, Course, createAnnouncement(), deleteAnnouncement(), getCourseAnnouncements(), { getIO }, { sendEmail }, updateAnnouncement() (+3 more)

### Community 55 - "test_assignment_controller.js"
Cohesion: 0.05
Nodes (35): CourseRegistrationPage(), StudentRegistrationPaymentPage(), AuditLog, calculateRegistrationFee(), createAuditLog(), FIXED_FEES_TOTAL, FIXED_REGISTRATION_FEES, getAdminRegistrationPayments() (+27 more)

### Community 56 - "AuthContext.jsx"
Cohesion: 0.22
Nodes (7): Adviser, bcrypt, CourseImport, mongoose, Student, Teacher, User

### Community 57 - "CommunityHub.jsx"
Cohesion: 0.25
Nodes (5): adviserSchema, mongoose, Adviser, dns, mongoose

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
Cohesion: 0.08
Nodes (22): examSchema, mongoose, questionSchema, answerSchema, examSubmissionSchema, mongoose, assert, Course (+14 more)

### Community 62 - "react-scripts"
Cohesion: 0.25
Nodes (6): dns, mongoose, path, Student, Teacher, User

### Community 63 - "umsAdminRoutes.js"
Cohesion: 0.33
Nodes (4): dns, fs, mongoose, path

### Community 64 - "Adviser.js"
Cohesion: 0.06
Nodes (36): mongoose, submissionSchema, dns, fs, main(), mongoose, path, recalculateAssignmentSimilarity() (+28 more)

### Community 65 - "clean_courses_programs.js"
Cohesion: 0.29
Nodes (7): cleanAtlasPrograms(), Course, dns, mapProgramToShortForm(), mongoose, path, Student

### Community 66 - "Payment.js"
Cohesion: 0.14
Nodes (12): { createAuditLog }, createCourseNotice(), createNotice(), deleteNotice(), { getIO }, Notice, Notification, notifyCourseStudentsOfNotice() (+4 more)

### Community 67 - "StudentRegistrationPaymentPage.jsx"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 68 - "StudentExamPage.jsx"
Cohesion: 0.29
Nodes (6): dns, { importTeachers }, mongoose, path, Teacher, testIdCollisionImport()

### Community 70 - "adminRoutes.js"
Cohesion: 0.25
Nodes (6): Course, dns, mongoose, path, Teacher, User

### Community 71 - "attendanceRoutes.js"
Cohesion: 0.25
Nodes (6): dns, mongoose, path, Student, Teacher, User

### Community 72 - "registrationPaymentRoutes.js"
Cohesion: 0.22
Nodes (7): Course, CourseImport, dns, mongoose, path, Teacher, User

### Community 73 - "axios"
Cohesion: 0.26
Nodes (14): uploadMarksheet(), createAssignment(), gradeSubmission(), createContactRequest(), createCoursePost(), createPublicPost(), respondToContactRequest(), sendMessage() (+6 more)

### Community 74 - "react"
Cohesion: 0.38
Nodes (6): react, AdminResultManagementPage(), formatLevel(), formatTerm(), TeacherResultManagementPage(), react

### Community 75 - "react-hot-toast"
Cohesion: 0.29
Nodes (5): dns, mongoose, path, Student, User

### Community 77 - "examRoutes.js"
Cohesion: 0.25
Nodes (6): Course, Enrollment, mongoose, Registration, Student, User

### Community 78 - "@testing-library/jest-dom"
Cohesion: 0.29
Nodes (7): deleteDraftUpload(), getAdminResults(), publishResultBatch(), requestCorrectionBatch(), ResultLog, submitResultToAdmin(), verifyResultBatch()

### Community 79 - "@testing-library/react"
Cohesion: 0.50
Nodes (4): batchUpdateMarks(), parseOptionalNumber(), uploadResultExcel(), validateResultRows()

### Community 80 - "deadlineReminder.js"
Cohesion: 0.10
Nodes (22): checkRole(), jwt, User, verifyToken(), ctrl, router, { verifyToken, checkRole }, ctrl (+14 more)

### Community 84 - "test_teacher_summary.js"
Cohesion: 0.17
Nodes (9): mongoose, noticeSchema, dns, mongoose, Notice, path, ResultUpload, Teacher (+1 more)

### Community 85 - "serviceRoutes.js"
Cohesion: 0.29
Nodes (6): calendarCtrl, noticeCtrl, router, searchCtrl, upload, { verifyToken, checkRole }

### Community 86 - "StudentExamPage.jsx"
Cohesion: 0.14
Nodes (9): mongoose, User, bcrypt, mongoose, userSchema, dns, mongoose, path (+1 more)

### Community 88 - "CommunityPost.js"
Cohesion: 0.40
Nodes (4): axios, jwt, mongoose, test()

### Community 89 - "test_pending_query.js"
Cohesion: 0.25
Nodes (6): Adviser, mongoose, Registration, Student, Teacher, User

### Community 91 - "uploadResultExcel"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 93 - "courseRoutes.js"
Cohesion: 0.43
Nodes (3): DEFAULT_CALENDAR_DATA, OfficialAcademicCalendarCard(), AcademicCalendarViewPage()

### Community 94 - "ExamSubmission.js"
Cohesion: 0.17
Nodes (9): mongoose, resultSchema, dns, mongoose, Notice, path, Result, ResultUpload (+1 more)

### Community 95 - "academicRoutes.js"
Cohesion: 0.33
Nodes (6): TeacherImportBatch, deleteTeacher(), getTeacherAcademicYears(), getTeachers(), syncTeacherCourseAssignments(), updateTeacher()

### Community 96 - "AcademicProfile.js"
Cohesion: 0.25
Nodes (6): Course, dns, mongoose, path, Teacher, User

### Community 98 - "CGPARecord.js"
Cohesion: 0.22
Nodes (7): axios, dns, FormData, fs, jwt, path, XLSX

### Community 99 - "CommunityComment.js"
Cohesion: 0.20
Nodes (7): mongoose, resultUploadSchema, Course, CourseImport, mongoose, ResultUpload, User

### Community 100 - "CommunityPost.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 102 - "PrivateMessage.js"
Cohesion: 0.25
Nodes (6): axios, dns, jwt, mongoose, path, User

### Community 103 - "ResultCorrectionRequest.js"
Cohesion: 0.25
Nodes (6): axios, dns, jwt, mongoose, path, User

### Community 104 - "ResultLog.js"
Cohesion: 0.29
Nodes (5): dns, mongoose, path, Teacher, User

### Community 105 - "deadlineReminder.js"
Cohesion: 0.25
Nodes (9): createAuditLog(), getFailedCoursesForRetake(), getTeacherDashboardStats(), getTeacherRetakeRequests(), graduateStudent(), processRetakeRequest(), promoteStudentsBatch(), RetakeRequest (+1 more)

### Community 107 - "previewService.js"
Cohesion: 0.29
Nodes (5): Course, CourseImport, mongoose, ResultUpload, User

### Community 109 - "reset_db.js"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 110 - "Submission.js"
Cohesion: 0.22
Nodes (6): Course, mongoose, Student, User, courseSchema, mongoose

### Community 112 - "courseController.js"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 113 - "socket.js"
Cohesion: 0.22
Nodes (7): Course, CourseImport, Enrollment, mongoose, Registration, Student, User

### Community 114 - "test_full_import_teachers.js"
Cohesion: 0.29
Nodes (7): importTeachers(), dns, { importTeachers }, mongoose, path, Teacher, testFullImportTeachers()

### Community 115 - "reset_test_user.js"
Cohesion: 0.40
Nodes (3): dns, mongoose, path

### Community 119 - "AcademicCalendarEvent.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 121 - "test_pending_query.js"
Cohesion: 0.22
Nodes (6): AcademicProfile, mongoose, Registration, Student, academicProfileSchema, mongoose

### Community 127 - "CommunityPost.js"
Cohesion: 0.67
Nodes (3): analyzeAnswers(), axios, detectAI()

### Community 130 - "inspect_student_docs.js"
Cohesion: 0.13
Nodes (10): mongoose, studentSchema, dns, mongoose, path, Student, mongoose, Student (+2 more)

### Community 131 - "jspdf"
Cohesion: 0.25
Nodes (5): mongoose, teacherSchema, Adviser, mongoose, Teacher

### Community 134 - "docx-preview"
Cohesion: 0.17
Nodes (16): GlobalNotificationBell(), useAuth(), AuthPage(), CommentItem(), CommunityHub(), CreatePostModal(), EditPostModal(), getFileUrl() (+8 more)

### Community 137 - "RegistrationCalendar.js"
Cohesion: 0.29
Nodes (6): levelDigit, rawRows, termDigit, ws, wsData, XLSX

### Community 142 - "@testing-library/jest-dom"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

## Knowledge Gaps
- **776 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin`, `name`, `version` (+771 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StudentRegistrationPaymentPage()` connect `test_assignment_controller.js` to `examRoutes.js`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Why does `api` connect `emailService.js` to `App.jsx`, `User.js`, `docx-preview`, `examRoutes.js`, `react`, `ShareModal.jsx`, `apiCache.js`, `upload.js`, `courseRoutes.js`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin` to the rest of the system?**
  _778 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `communityController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11363636363636363 - nodes in this community are weakly interconnected._
- **Should `assignmentController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05053191489361702 - nodes in this community are weakly interconnected._
- **Should `test_exam_controller.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._