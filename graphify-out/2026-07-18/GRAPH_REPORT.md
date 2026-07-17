# Graph Report - UFTB_Moodle  (2026-07-18)

## Corpus Check
- 105 files · ~82,945 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 667 nodes · 1089 edges · 39 communities (30 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1b2500bc`
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
- getIO
- development
- emailService.js
- package.json
- manifest.json
- Exam.js
- Assessment.js
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

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 54 edges
2. `api` - 27 edges
3. `getIO()` - 22 edges
4. `queueEmail()` - 19 edges
5. `CommunityPost` - 17 edges
6. `verifyToken()` - 11 edges
7. `Lecture` - 10 edges
8. `StudentSidebar()` - 9 edges
9. `TeacherSidebar()` - 9 edges
10. `CommunityComment` - 9 edges

## Surprising Connections (you probably didn't know these)
- `test()` --references--> `Lecture`  [EXTRACTED]
  scratch/test_view.js → server/controllers/lectureController.js
- `TeacherAttendancePage()` --references--> `jspdf`  [EXTRACTED]
  client/src/pages/TeacherAttendancePage.jsx → client/package.json
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `RoleRouter()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `AppContent()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx

## Import Cycles
- None detected.

## Communities (39 total, 9 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.08
Nodes (55): App(), AppContent(), ProtectedRoute(), RoleRouter(), GlobalNotificationBell(), GlobalSettingsPortal(), ShareModal(), StudentSidebar() (+47 more)

### Community 1 - "authMiddleware.js"
Cohesion: 0.05
Nodes (43): getNotifications(), markAllAsRead(), markAsRead(), Notification, checkRole(), jwt, User, verifyToken() (+35 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): bcryptjs, cors, dotenv, express, jsonwebtoken, mammoth, mongoose, multer (+38 more)

### Community 3 - "communityController.js"
Cohesion: 0.07
Nodes (50): uploadMarksheet(), createAssignment(), gradeSubmission(), addCourseComment(), addPublicComment(), CommunityComment, CommunityPost, ContactRequest (+42 more)

### Community 4 - "User.js"
Cohesion: 0.07
Nodes (28): mongoose, submissionSchema, fs, main(), mongoose, path, recalculateAssignmentSimilarity(), similarityService (+20 more)

### Community 5 - "assignmentController.js"
Cohesion: 0.06
Nodes (26): Assignment, Course, deleteSubmission(), fs, { getIO }, Notification, path, previewService (+18 more)

### Community 6 - "test_exam_controller.js"
Cohesion: 0.10
Nodes (11): analyzeAI(), { analyzeAnswers }, Exam, ExamSubmission, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User (+3 more)

### Community 7 - "attendanceController.js"
Cohesion: 0.07
Nodes (20): Attendance, Course, evalArithmetic(), evaluateExcelFormula(), getAttendance(), getAttendanceStats(), markAttendance(), IMPORTANT: Filter only students, not teachers (+12 more)

### Community 8 - "lectureController.js"
Cohesion: 0.09
Nodes (24): axios, jwt, mongoose, test(), Course, deleteLecture(), downloadLecture(), fs (+16 more)

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
Cohesion: 0.16
Nodes (14): assert, Course, emailService, Exam, examController, ExamSubmission, mongoose, Notification (+6 more)

### Community 15 - "deadlineReminder.js"
Cohesion: 0.17
Nodes (10): mongoose, notificationSchema, Assignment, cron, Exam, ExamSubmission, { getIO }, Notification (+2 more)

### Community 16 - "getIO"
Cohesion: 0.25
Nodes (5): examSchema, mongoose, questionSchema, Exam, mongoose

### Community 17 - "development"
Cohesion: 0.09
Nodes (21): browserslist, development, production, eslintConfig, extends, name, private, scripts (+13 more)

### Community 18 - "emailService.js"
Cohesion: 0.21
Nodes (9): { sendEmail, emailTemplates }, test(), clientUrl, emailQueue, emailTemplates, nodemailer, processQueue(), sendEmail() (+1 more)

### Community 19 - "package.json"
Cohesion: 0.50
Nodes (3): @opencode-ai/plugin, dependencies, @opencode-ai/plugin

### Community 20 - "manifest.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 21 - "Exam.js"
Cohesion: 0.50
Nodes (3): answerSchema, examSubmissionSchema, mongoose

### Community 22 - "Assessment.js"
Cohesion: 0.29
Nodes (4): assessmentSchema, mongoose, Assessment, mongoose

### Community 23 - "scripts"
Cohesion: 0.08
Nodes (21): mongoose, allowedOrigins, app, connectDB, cors, dns, express, fs (+13 more)

### Community 24 - "seedAdmin.js"
Cohesion: 0.40
Nodes (3): adminData, bcrypt, mongoose

### Community 25 - "previewService.js"
Cohesion: 0.26
Nodes (12): buildSlideBodyHtml(), extractPptxSlidesArray(), extractPptxSlidesHtml(), extractSlideElements(), formatTableHtml(), formatTextElementHtml(), fs, generatePreviewData() (+4 more)

## Knowledge Gaps
- **298 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin`, `name`, `version` (+293 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `development`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `App.jsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `TeacherAttendancePage()` connect `App.jsx` to `dependencies`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin` to the rest of the system?**
  _301 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07643758765778401 - nodes in this community are weakly interconnected._
- **Should `authMiddleware.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._