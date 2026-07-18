# Graph Report - UFTB_Moodle  (2026-07-18)

## Corpus Check
- 108 files · ~91,994 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 706 nodes · 1160 edges · 41 communities (32 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `33f199c9`
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
- react
- deadlineReminder.js
- emailService.js
- Exam.js
- Assessment.js

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 54 edges
2. `api` - 28 edges
3. `getIO()` - 22 edges
4. `queueEmail()` - 21 edges
5. `CommunityPost` - 17 edges
6. `StudentSidebar()` - 14 edges
7. `TeacherSidebar()` - 14 edges
8. `fetchWithCache()` - 13 edges
9. `verifyToken()` - 11 edges
10. `Lecture` - 10 edges

## Surprising Connections (you probably didn't know these)
- `test()` --references--> `Lecture`  [EXTRACTED]
  scratch/test_view.js → server/controllers/lectureController.js
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `RoleRouter()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `AppContent()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `TeacherAttendancePage()` --references--> `jspdf`  [EXTRACTED]
  client/src/pages/TeacherAttendancePage.jsx → client/package.json

## Import Cycles
- None detected.

## Communities (41 total, 9 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.07
Nodes (59): FilePreviewModal(), GlobalNotificationBell(), ShareModal(), StudentSidebar(), TeacherSidebar(), AuthContext, AuthProvider(), getActiveStatusSetting() (+51 more)

### Community 1 - "authMiddleware.js"
Cohesion: 0.05
Nodes (43): getNotifications(), markAllAsRead(), markAsRead(), Notification, checkRole(), jwt, User, verifyToken() (+35 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): bcryptjs, cors, dotenv, express, jsonwebtoken, mammoth, mongoose, multer (+38 more)

### Community 3 - "communityController.js"
Cohesion: 0.07
Nodes (49): uploadMarksheet(), createAssignment(), gradeSubmission(), addCourseComment(), addPublicComment(), CommunityComment, CommunityPost, ContactRequest (+41 more)

### Community 4 - "User.js"
Cohesion: 0.07
Nodes (31): mongoose, submissionSchema, fs, main(), mongoose, path, recalculateAssignmentSimilarity(), similarityService (+23 more)

### Community 5 - "assignmentController.js"
Cohesion: 0.07
Nodes (30): Assignment, Course, deleteSubmission(), fs, { getIO }, getSubmissions(), Notification, path (+22 more)

### Community 6 - "test_exam_controller.js"
Cohesion: 0.10
Nodes (11): analyzeAI(), { analyzeAnswers }, Exam, ExamSubmission, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User (+3 more)

### Community 7 - "attendanceController.js"
Cohesion: 0.07
Nodes (18): Attendance, Course, evalArithmetic(), evaluateExcelFormula(), getAttendance(), getAttendanceStats(), markAttendance(), IMPORTANT: Filter only students, not teachers (+10 more)

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
Cohesion: 0.12
Nodes (16): concurrently, author, dependencies, concurrently, description, keywords, license, main (+8 more)

### Community 12 - "dependencies"
Cohesion: 0.05
Nodes (37): axios, jszip, xlsx, docx-preview, dependencies, axios, docx-preview, jspdf (+29 more)

### Community 13 - "assessmentController.js"
Cohesion: 0.15
Nodes (8): Assessment, Course, fs, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User, XLSX

### Community 14 - "previewService.js"
Cohesion: 0.07
Nodes (27): App(), AppContent(), AuthPage, CommunityHub, CourseAnalyticsPage, CourseCommunity, CourseCommunityPostDetail, CourseDashboard (+19 more)

### Community 15 - "deadlineReminder.js"
Cohesion: 0.50
Nodes (3): answerSchema, examSubmissionSchema, mongoose

### Community 16 - "package.json"
Cohesion: 0.50
Nodes (3): bcrypt, mongoose, userSchema

### Community 17 - "development"
Cohesion: 0.09
Nodes (21): browserslist, development, production, eslintConfig, extends, name, private, scripts (+13 more)

### Community 18 - "emailService.js"
Cohesion: 0.16
Nodes (14): assert, Course, emailService, Exam, examController, ExamSubmission, mongoose, Notification (+6 more)

### Community 19 - "package.json"
Cohesion: 0.50
Nodes (3): @opencode-ai/plugin, dependencies, @opencode-ai/plugin

### Community 20 - "manifest.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 23 - "scripts"
Cohesion: 0.08
Nodes (21): mongoose, allowedOrigins, app, connectDB, cors, dns, express, fs (+13 more)

### Community 24 - "seedAdmin.js"
Cohesion: 0.40
Nodes (3): adminData, bcrypt, mongoose

### Community 25 - "previewService.js"
Cohesion: 0.26
Nodes (12): buildSlideBodyHtml(), extractPptxSlidesArray(), extractPptxSlidesHtml(), extractSlideElements(), formatTableHtml(), formatTextElementHtml(), fs, generatePreviewData() (+4 more)

### Community 47 - "deadlineReminder.js"
Cohesion: 0.17
Nodes (10): mongoose, notificationSchema, Assignment, cron, Exam, ExamSubmission, { getIO }, Notification (+2 more)

### Community 48 - "emailService.js"
Cohesion: 0.21
Nodes (9): { sendEmail, emailTemplates }, test(), clientUrl, emailQueue, emailTemplates, nodemailer, processQueue(), sendEmail() (+1 more)

### Community 49 - "Exam.js"
Cohesion: 0.25
Nodes (5): examSchema, mongoose, questionSchema, Exam, mongoose

### Community 50 - "Assessment.js"
Cohesion: 0.29
Nodes (4): assessmentSchema, mongoose, Assessment, mongoose

## Knowledge Gaps
- **319 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin`, `name`, `version` (+314 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `App.jsx` to `previewService.js`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `development`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `TeacherAttendancePage()` connect `App.jsx` to `dependencies`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin` to the rest of the system?**
  _322 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07323883161512028 - nodes in this community are weakly interconnected._
- **Should `authMiddleware.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._