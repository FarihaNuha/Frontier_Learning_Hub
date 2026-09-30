# Graph Report - UFTB_Moodle  (2026-09-30)

## Corpus Check
- 366 files · ~304,359 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1978 nodes · 2857 edges · 256 communities (186 shown, 70 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e1dc193b`
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
- ResultCorrectionRequest.js
- ResultLog.js
- deadlineReminder.js
- jszip
- previewService.js
- reset_db.js
- Submission.js
- docx-preview
- courseController.js
- socket.js
- test_full_import_teachers.js
- reset_test_user.js
- check_atlas.js
- find_atlas_db.js
- test_signup_api.js
- ResultCorrectionRequest
- fix_teacher_course_links.js
- test_pending_query.js
- test_registration.js
- test_plagiarism.js
- test_template_gen.js
- test_view.js
- xlsx
- CommunityPost.js
- inspect_student_docs.js
- react-dom
- reset_db.js
- docx-preview
- ResultCorrectionRequest.js
- ResultLog.js
- RegistrationCalendar.js
- react-dom
- ResultLog.js
- examRoutes.js
- TeacherImportBatch.js
- docx-preview
- react-scripts
- announcementRoutes.js
- examRoutes.js
- run_recalculate.js
- docx-preview
- test_login_activation.js
- test_assignment_controller.js
- authMiddleware.js
- inspect_atlas.js
- react-dom
- Course.js
- docx-preview
- check_dbs.js
- inspect_student_30.js
- list_students.js
- list_students_local.js
- test_plagiarism_local.js
- reset_db.js
- test_view.js
- ResultCorrectionRequest
- scripts
- xlsx
- check_advisers.js
- sync_advisers_fix.js
- ExampleUnitTest.java
- gradlew
- MainActivity.java
- AcademicCalendarEvent.js
- @capacitor/android
- @capacitor/core
- @capacitor/push-notifications
- @capacitor/status-bar
- jspdf
- jszip
- react-router-dom
- @testing-library/jest-dom
- web-vitals
- compression
- cors
- express
- firebase-admin
- jsonwebtoken
- mongoose
- multer
- nodemailer
- pdf-parse
- jszip
- socket.io

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 67 edges
2. `api` - 64 edges
3. `getIO()` - 44 edges
4. `StudentSidebar()` - 26 edges
5. `n()` - 25 edges
6. `queueEmail()` - 25 edges
7. `TeacherSidebar()` - 23 edges
8. `u()` - 18 edges
9. `AdminSidebar()` - 18 edges
10. `CommunityPost` - 18 edges

## Surprising Connections (you probably didn't know these)
- `AdminNoticeManagementPage()` --indirect_call--> `n()`  [INFERRED]
  client/src/pages/AdminNoticeManagementPage.jsx → android/app/src/main/assets/public/static/js/main.b1162215.js
- `AdminTeachers()` --indirect_call--> `h()`  [INFERRED]
  client/src/pages/AdminTeachers.jsx → android/app/src/main/assets/public/static/js/main.b1162215.js
- `AdminRegistrationPaymentPage()` --indirect_call--> `p()`  [INFERRED]
  client/src/pages/AdminRegistrationPaymentPage.jsx → android/app/src/main/assets/public/static/js/main.b1162215.js
- `GlobalNotificationBell()` --indirect_call--> `n()`  [INFERRED]
  client/src/components/GlobalNotificationBell.jsx → android/app/src/main/assets/public/static/js/main.b1162215.js
- `NotificationsPage()` --indirect_call--> `n()`  [INFERRED]
  client/src/pages/NotificationsPage.jsx → android/app/src/main/assets/public/static/js/main.b1162215.js

## Import Cycles
- None detected.

## Communities (256 total, 70 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.16
Nodes (6): StudentSidebar(), StudentAssignmentPage(), StudentAttendancePage(), StudentDashboard(), StudentExamPage(), BACKEND_URL

### Community 1 - "authMiddleware.js"
Cohesion: 0.18
Nodes (8): multer, path, storage, upload, ctrl, router, upload, { verifyToken }

### Community 2 - "dependencies"
Cohesion: 0.15
Nodes (13): bcryptjs, dotenv, mammoth, node-cron, dependencies, axios, bcryptjs, dotenv (+5 more)

### Community 3 - "communityController.js"
Cohesion: 0.11
Nodes (31): addCourseComment(), addPublicComment(), CommunityComment, CommunityPost, ContactRequest, Course, deleteComment(), deleteMessage() (+23 more)

### Community 4 - "User.js"
Cohesion: 0.19
Nodes (10): ShareModal(), CourseCommunityPostDetail(), renderContentWithLinks(), MessagePage(), RTC_CONFIG, PostDetailPage(), renderContentWithLinks(), PublicPostDetailPage() (+2 more)

### Community 5 - "assignmentController.js"
Cohesion: 0.05
Nodes (42): Assignment, Course, deleteSubmission(), fs, { getIO }, getSubmissions(), Notification, path (+34 more)

### Community 6 - "test_exam_controller.js"
Cohesion: 0.11
Nodes (14): enrollmentSchema, mongoose, Course, Enrollment, mongoose, Registration, Student, User (+6 more)

### Community 7 - "attendanceController.js"
Cohesion: 0.18
Nodes (7): Course, evalArithmetic(), evaluateExcelFormula(), getAttendanceStats(), User, attendanceSchema, mongoose

### Community 8 - "lectureController.js"
Cohesion: 0.08
Nodes (26): axios, jwt, mongoose, test(), Course, deleteLecture(), downloadLecture(), fs (+18 more)

### Community 9 - "examController.js"
Cohesion: 0.18
Nodes (10): author, description, devDependencies, nodemon, nodemon, keywords, license, main (+2 more)

### Community 10 - "authRoutes.js"
Cohesion: 0.18
Nodes (17): bcrypt, blockUser(), forgotPassword(), generateToken(), getBlockedUsers(), getMe(), jwt, login() (+9 more)

### Community 11 - "package.json"
Cohesion: 0.06
Nodes (30): concurrently, author, dependencies, @capacitor/android, @capacitor/app, @capacitor/cli, @capacitor/core, @capacitor/push-notifications (+22 more)

### Community 12 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, axios, @capacitor/app, @capacitor/cli, docx-preview, jspdf-autotable, socket.io-client, @testing-library/react (+9 more)

### Community 13 - "assessmentController.js"
Cohesion: 0.11
Nodes (19): sendTeacherReminder(), setDeadlineAndNotice(), Assignment, cron, Exam, ExamSubmission, { getIO }, Notification (+11 more)

### Community 14 - "previewService.js"
Cohesion: 0.04
Nodes (53): AcademicCalendarViewPage, AcademicRegistrationPage, AdminAdvisers, AdminCalendarManagementPage, AdminCourses, AdminDashboard, AdminNoticeManagementPage, AdminPaymentManagement (+45 more)

### Community 15 - "deadlineReminder.js"
Cohesion: 0.06
Nodes (13): TeacherImportBatch, Adviser, CourseImport, deleteTeacher(), getTeacherAcademicYears(), getTeachers(), Payment, Registration (+5 more)

### Community 16 - "package.json"
Cohesion: 0.11
Nodes (13): courseImportSchema, mongoose, Course, CourseImport, Enrollment, mongoose, Registration, Student (+5 more)

### Community 17 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 18 - "emailService.js"
Cohesion: 0.11
Nodes (5): AdminSidebar(), AdminNoticeManagementPage(), AdminRegistrationPaymentPage(), AdminTeachers(), api

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
Cohesion: 0.13
Nodes (10): mongoose, registrationSchema, Course, Enrollment, mongoose, Registration, Student, User (+2 more)

### Community 23 - "scripts"
Cohesion: 0.08
Nodes (21): mongoose, allowedOrigins, compression, connectDB, cors, dns, express, fs (+13 more)

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
Cohesion: 0.09
Nodes (22): AcademicProfile, AuditLog, calculateStudentCGPA(), CGPARecord, computeGradePoint(), Course, CourseImport, Department (+14 more)

### Community 34 - "notificationRoutes.js"
Cohesion: 0.31
Nodes (7): getNotifications(), markAllAsRead(), markAsRead(), Notification, {
  getNotifications,
  markAsRead,
  markAllAsRead,
}, router, { verifyToken }

### Community 36 - "verifyToken"
Cohesion: 0.10
Nodes (21): Adviser, approveAllPendingRegistrations(), approveRegistration(), CourseImport, createNotification(), Enrollment, linkOrCreateLmsCourse(), Payment (+13 more)

### Community 37 - "Exam.js"
Cohesion: 0.09
Nodes (16): AcademicProfile, CGPARecord, Course, CourseImport, { getIO }, Notice, Notification, { resolveCourseCode } (+8 more)

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
Nodes (7): Course, CourseImport, dns, mongoose, path, Teacher, User

### Community 42 - "ShareModal.jsx"
Cohesion: 0.22
Nodes (9): createAuditLog(), graduateStudent(), payRetakeFee(), processRetakeRequest(), promoteStudentsBatch(), submitRetakeRequest(), createNotice(), deleteNotice() (+1 more)

### Community 47 - "deadlineReminder.js"
Cohesion: 0.07
Nodes (18): mongoose, User, bcrypt, mongoose, userSchema, mongoose, path, User (+10 more)

### Community 48 - "emailService.js"
Cohesion: 0.17
Nodes (14): findRegistrationCalendarRule(), getAvailableCourses(), isDepartmentAndProgramMatch(), submitRegistration(), { getAvailableCourses }, mongoose, run(), Student (+6 more)

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
Cohesion: 0.17
Nodes (3): Course, mongoose, User

### Community 57 - "CommunityHub.jsx"
Cohesion: 0.22
Nodes (7): Adviser, bcrypt, CourseImport, mongoose, Student, Teacher, User

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
Cohesion: 0.08
Nodes (22): examSchema, mongoose, questionSchema, answerSchema, examSubmissionSchema, mongoose, assert, Course (+14 more)

### Community 62 - "react-scripts"
Cohesion: 0.25
Nodes (6): dns, mongoose, path, Student, Teacher, User

### Community 63 - "umsAdminRoutes.js"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 64 - "Adviser.js"
Cohesion: 0.06
Nodes (36): mongoose, submissionSchema, dns, fs, main(), mongoose, path, recalculateAssignmentSimilarity() (+28 more)

### Community 65 - "clean_courses_programs.js"
Cohesion: 0.29
Nodes (7): cleanAtlasPrograms(), Course, dns, mapProgramToShortForm(), mongoose, path, Student

### Community 66 - "Payment.js"
Cohesion: 0.12
Nodes (13): CGPARecord, { createAuditLog }, createCourseNotice(), { getIO }, Notice, Notification, notifyCourseStudentsOfNotice(), { queueEmail, emailTemplates } (+5 more)

### Community 67 - "StudentRegistrationPaymentPage.jsx"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 68 - "StudentExamPage.jsx"
Cohesion: 0.25
Nodes (5): adviserSchema, mongoose, Adviser, dns, mongoose

### Community 70 - "adminRoutes.js"
Cohesion: 0.25
Nodes (6): Course, dns, mongoose, path, Teacher, User

### Community 71 - "attendanceRoutes.js"
Cohesion: 0.25
Nodes (6): dns, mongoose, path, Student, Teacher, User

### Community 72 - "registrationPaymentRoutes.js"
Cohesion: 0.14
Nodes (8): Assessment, Course, fs, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User, XLSX

### Community 73 - "axios"
Cohesion: 0.19
Nodes (17): uploadMarksheet(), createAssignment(), gradeSubmission(), createContactRequest(), createCoursePost(), createPublicPost(), respondToContactRequest(), sendMessage() (+9 more)

### Community 74 - "react"
Cohesion: 0.06
Nodes (46): 1052(), 265(), 3113(), 5271(), 4620(), 8728(), 1085(), 1352() (+38 more)

### Community 77 - "examRoutes.js"
Cohesion: 0.29
Nodes (7): deleteDraftUpload(), getAdminResults(), publishResultBatch(), requestCorrectionBatch(), ResultLog, submitResultToAdmin(), verifyResultBatch()

### Community 78 - "@testing-library/jest-dom"
Cohesion: 0.22
Nodes (7): verifyToken(), ctrl, router, { verifyToken, checkRole }, ctrl, router, { verifyToken, checkRole }

### Community 79 - "@testing-library/react"
Cohesion: 0.25
Nodes (6): axios, dns, jwt, mongoose, path, User

### Community 80 - "deadlineReminder.js"
Cohesion: 0.25
Nodes (5): mongoose, retakeRequestSchema, mongoose, path, RetakeRequest

### Community 81 - "xlsx"
Cohesion: 0.25
Nodes (6): Adviser, mongoose, Registration, Student, Teacher, User

### Community 85 - "serviceRoutes.js"
Cohesion: 0.29
Nodes (6): calendarCtrl, noticeCtrl, router, searchCtrl, upload, { verifyToken, checkRole }

### Community 89 - "test_pending_query.js"
Cohesion: 0.17
Nodes (10): academicCtrl, Adviser, Course, courseCtrl, Enrollment, mongoose, path, RetakeRequest (+2 more)

### Community 90 - "RetakeRequest.js"
Cohesion: 0.15
Nodes (10): mongoose, notificationSchema, academicCtrl, Adviser, mongoose, Notification, path, RetakeRequest (+2 more)

### Community 91 - "uploadResultExcel"
Cohesion: 0.40
Nodes (5): getMyCourses(), { getMyCourses }, mongoose, run(), User

### Community 93 - "courseRoutes.js"
Cohesion: 0.43
Nodes (3): DEFAULT_CALENDAR_DATA, OfficialAcademicCalendarCard(), AcademicCalendarViewPage()

### Community 96 - "AcademicProfile.js"
Cohesion: 0.33
Nodes (7): Attendance, getAttendance(), markAttendance(), findAssessmentRecord(), getCourseStudentsAnalytics(), getStudentAnalytics(), getTeacherDashboardSummary()

### Community 97 - "StudentExamPage.jsx"
Cohesion: 0.22
Nodes (6): mongoose, teacherSchema, dns, mongoose, path, Teacher

### Community 98 - "CGPARecord.js"
Cohesion: 0.22
Nodes (7): axios, dns, FormData, fs, jwt, path, XLSX

### Community 99 - "CommunityComment.js"
Cohesion: 0.29
Nodes (5): dns, mongoose, path, Student, User

### Community 103 - "ResultCorrectionRequest.js"
Cohesion: 0.25
Nodes (6): axios, dns, jwt, mongoose, path, User

### Community 104 - "ResultLog.js"
Cohesion: 0.29
Nodes (5): dns, mongoose, path, Teacher, User

### Community 105 - "deadlineReminder.js"
Cohesion: 0.40
Nodes (5): batchUpdateMarks(), calculateGradeAndGPFromTotal(), parseOptionalNumber(), uploadResultExcel(), validateResultRows()

### Community 107 - "previewService.js"
Cohesion: 0.29
Nodes (5): Course, CourseImport, mongoose, ResultUpload, User

### Community 109 - "reset_db.js"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 110 - "Submission.js"
Cohesion: 0.50
Nodes (3): payCtrl, router, { verifyToken, checkRole }

### Community 111 - "docx-preview"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 112 - "courseController.js"
Cohesion: 0.33
Nodes (4): Adviser, mongoose, path, RetakeRequest

### Community 113 - "socket.js"
Cohesion: 0.60
Nodes (3): ExampleInstrumentedTest, Test, RunWith

### Community 114 - "test_full_import_teachers.js"
Cohesion: 0.15
Nodes (13): importTeachers(), dns, { importTeachers }, mongoose, path, Teacher, testFullImportTeachers(), dns (+5 more)

### Community 115 - "reset_test_user.js"
Cohesion: 0.40
Nodes (3): dns, mongoose, path

### Community 121 - "test_pending_query.js"
Cohesion: 0.22
Nodes (6): AcademicProfile, mongoose, Registration, Student, academicProfileSchema, mongoose

### Community 127 - "CommunityPost.js"
Cohesion: 0.67
Nodes (3): analyzeAnswers(), axios, detectAI()

### Community 130 - "inspect_student_docs.js"
Cohesion: 0.13
Nodes (10): mongoose, studentSchema, dns, mongoose, path, Student, mongoose, Student (+2 more)

### Community 134 - "docx-preview"
Cohesion: 0.17
Nodes (16): GlobalNotificationBell(), useAuth(), AuthPage(), CommentItem(), CommunityHub(), CreatePostModal(), EditPostModal(), getFileUrl() (+8 more)

### Community 135 - "ResultCorrectionRequest.js"
Cohesion: 0.27
Nodes (4): communityCommentSchema, mongoose, communityPostSchema, mongoose

### Community 136 - "ResultLog.js"
Cohesion: 0.33
Nodes (4): academicCtrl, mongoose, path, User

### Community 137 - "RegistrationCalendar.js"
Cohesion: 0.29
Nodes (6): levelDigit, rawRows, termDigit, ws, wsData, XLSX

### Community 138 - "react-dom"
Cohesion: 0.30
Nodes (4): PaymentCheckoutModal(), RegistrationInvoiceModal(), FIXED_REGISTRATION_FEES, FIXED_REGISTRATION_FEES

### Community 140 - "examRoutes.js"
Cohesion: 0.22
Nodes (7): Adviser, mongoose, path, Result, RetakeRequest, Student, User

### Community 142 - "docx-preview"
Cohesion: 0.29
Nodes (5): jwt, User, ctrl, router, { verifyToken, checkRole }

### Community 144 - "react-scripts"
Cohesion: 0.33
Nodes (9): FilePreviewModal(), CommentItem(), CourseCommunity(), CoursePostCard(), EditPostModal(), getFileUrl(), renderAttachments(), renderContentWithLinks() (+1 more)

### Community 146 - "announcementRoutes.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 147 - "examRoutes.js"
Cohesion: 0.50
Nodes (4): AppContent(), initNativeFeatures(), initPushNotifications(), app

### Community 148 - "run_recalculate.js"
Cohesion: 0.22
Nodes (7): checkRole(), ctrl, router, { verifyToken, checkRole }, ctrl, router, { verifyToken, checkRole }

### Community 151 - "test_assignment_controller.js"
Cohesion: 0.50
Nodes (3): ctrl, router, { verifyToken, checkRole }

### Community 155 - "Course.js"
Cohesion: 0.12
Nodes (12): Course, mongoose, Student, User, courseSchema, mongoose, Course, dns (+4 more)

### Community 162 - "reset_db.js"
Cohesion: 0.33
Nodes (4): dns, mongoose, path, Teacher

### Community 163 - "test_view.js"
Cohesion: 0.05
Nodes (33): Assignment, Course, CourseImport, Notice, Result, Student, Teacher, User (+25 more)

### Community 164 - "ResultCorrectionRequest"
Cohesion: 0.40
Nodes (5): createCorrectionRequest(), getStudentCorrectionRequests(), getTeacherCorrectionRequests(), replyToCorrectionRequest(), ResultCorrectionRequest

### Community 165 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, dev, start, test, test-controller

### Community 167 - "check_advisers.js"
Cohesion: 0.40
Nodes (3): Adviser, mongoose, path

### Community 168 - "sync_advisers_fix.js"
Cohesion: 0.40
Nodes (3): Adviser, mongoose, Teacher

### Community 177 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **878 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin`, `short_name`, `name` (+873 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **70 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `u()` connect `react` to `deadlineReminder.js`, `User.js`, `upload.js`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `uploadResultExcel()` connect `deadlineReminder.js` to `react`, `examRoutes.js`, `Exam.js`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `n()` (e.g. with `1052()` and `265()`) actually correct?**
  _`n()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin` to the rest of the system?**
  _880 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `communityController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11363636363636363 - nodes in this community are weakly interconnected._
- **Should `assignmentController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05333333333333334 - nodes in this community are weakly interconnected._
- **Should `test_exam_controller.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._