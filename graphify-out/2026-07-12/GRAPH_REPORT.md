# Graph Report - .  (2026-07-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 620 nodes · 974 edges · 47 communities (30 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `42b46a69`
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
- ExamSubmission.js
- inspect_submissions.js
- delete_user.js
- Department.js
- JoinRequest.js
- cleanup_teachers_from_students.js
- inspect_db.js
- test_query_requests.js
- docx-preview
- jspdf
- react
- react-dom
- react-hot-toast
- react-icons
- react-router-dom
- @testing-library/user-event
- web-vitals
- xlsx

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 50 edges
2. `api` - 23 edges
3. `getIO()` - 18 edges
4. `sendEmail()` - 17 edges
5. `CommunityPost` - 16 edges
6. `verifyToken()` - 11 edges
7. `CommunityComment` - 9 edges
8. `Lecture` - 9 edges
9. `checkRole()` - 9 edges
10. `emailTemplates` - 7 edges

## Surprising Connections (you probably didn't know these)
- `test()` --references--> `Lecture`  [EXTRACTED]
  scratch/test_view.js → server/controllers/lectureController.js
- `test()` --calls--> `sendEmail()`  [EXTRACTED]
  server/scratch/test_emails.js → server/services/emailService.js
- `TeacherAttendancePage()` --references--> `jspdf`  [EXTRACTED]
  client/src/pages/TeacherAttendancePage.jsx → client/package.json
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx
- `RoleRouter()` --calls--> `useAuth()`  [EXTRACTED]
  client/src/App.jsx → client/src/contexts/AuthContext.jsx

## Import Cycles
- None detected.

## Communities (47 total, 17 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.07
Nodes (49): App(), AppContent(), ProtectedRoute(), RoleRouter(), GlobalNotificationBell(), GlobalSettingsPortal(), ShareModal(), StudentSidebar() (+41 more)

### Community 1 - "authMiddleware.js"
Cohesion: 0.05
Nodes (43): getNotifications(), markAllAsRead(), markAsRead(), Notification, checkRole(), jwt, User, verifyToken() (+35 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (44): bcryptjs, cors, dotenv, express, jsonwebtoken, jszip, mammoth, mongoose (+36 more)

### Community 3 - "communityController.js"
Cohesion: 0.09
Nodes (37): addCourseComment(), addPublicComment(), CommunityComment, CommunityPost, Course, createCoursePost(), createPublicPost(), deletePost() (+29 more)

### Community 4 - "User.js"
Cohesion: 0.06
Nodes (29): mongoose, submissionSchema, bcrypt, mongoose, userSchema, fs, main(), mongoose (+21 more)

### Community 5 - "assignmentController.js"
Cohesion: 0.06
Nodes (26): Assignment, Course, deleteSubmission(), fs, { getIO }, Notification, path, previewService (+18 more)

### Community 6 - "test_exam_controller.js"
Cohesion: 0.07
Nodes (27): mongoose, app, connectDB, cors, express, http, { initSocket }, path (+19 more)

### Community 7 - "attendanceController.js"
Cohesion: 0.08
Nodes (13): Attendance, Course, getAttendance(), getAttendanceStats(), markAttendance(), IMPORTANT: Filter only students, not teachers, User, Course (+5 more)

### Community 8 - "lectureController.js"
Cohesion: 0.09
Nodes (23): axios, jwt, mongoose, test(), Course, deleteLecture(), downloadLecture(), fs (+15 more)

### Community 9 - "examController.js"
Cohesion: 0.10
Nodes (11): analyzeAI(), { analyzeAnswers }, Exam, ExamSubmission, { getIO }, Notification, { sendEmail, emailTemplates }, User (+3 more)

### Community 10 - "authRoutes.js"
Cohesion: 0.18
Nodes (16): bcrypt, blockUser(), forgotPassword(), generateToken(), getBlockedUsers(), getMe(), jwt, login() (+8 more)

### Community 11 - "package.json"
Cohesion: 0.12
Nodes (16): concurrently, author, dependencies, concurrently, description, keywords, license, main (+8 more)

### Community 12 - "dependencies"
Cohesion: 0.18
Nodes (13): dependencies, axios, jspdf-autotable, react-scripts, socket.io-client, @testing-library/dom, @testing-library/jest-dom, @testing-library/react (+5 more)

### Community 13 - "assessmentController.js"
Cohesion: 0.15
Nodes (8): Assessment, Course, fs, { getIO }, Notification, { sendEmail, emailTemplates }, User, XLSX

### Community 14 - "previewService.js"
Cohesion: 0.26
Nodes (12): buildSlideBodyHtml(), extractPptxSlidesArray(), extractPptxSlidesHtml(), extractSlideElements(), formatTableHtml(), formatTextElementHtml(), fs, generatePreviewData() (+4 more)

### Community 15 - "deadlineReminder.js"
Cohesion: 0.17
Nodes (10): mongoose, notificationSchema, Assignment, cron, Exam, ExamSubmission, { getIO }, Notification (+2 more)

### Community 16 - "getIO"
Cohesion: 0.36
Nodes (10): uploadMarksheet(), createAssignment(), gradeSubmission(), createExam(), publishExamResults(), submitExam(), uploadLecture(), startScheduler() (+2 more)

### Community 17 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 18 - "emailService.js"
Cohesion: 0.25
Nodes (6): { sendEmail, emailTemplates }, test(), emailQueue, emailTemplates, nodemailer, transporter

### Community 19 - "package.json"
Cohesion: 0.25
Nodes (7): eslintConfig, extends, name, private, version, react-app, react-app/jest

### Community 20 - "manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 21 - "Exam.js"
Cohesion: 0.25
Nodes (5): examSchema, mongoose, questionSchema, Exam, mongoose

### Community 22 - "Assessment.js"
Cohesion: 0.29
Nodes (4): assessmentSchema, mongoose, Assessment, mongoose

### Community 23 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 24 - "seedAdmin.js"
Cohesion: 0.40
Nodes (3): adminData, bcrypt, mongoose

### Community 25 - "ExamSubmission.js"
Cohesion: 0.50
Nodes (3): answerSchema, examSubmissionSchema, mongoose

## Knowledge Gaps
- **278 isolated node(s):** `name`, `version`, `private`, `@testing-library/user-event`, `axios` (+273 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `docx-preview`, `jspdf`, `react`, `react-dom`, `react-hot-toast`, `react-icons`, `react-router-dom`, `@testing-library/user-event`, `web-vitals`, `xlsx`, `package.json`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `jspdf` connect `jspdf` to `App.jsx`, `dependencies`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `TeacherAttendancePage()` connect `App.jsx` to `jspdf`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _280 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06894790602655772 - nodes in this community are weakly interconnected._
- **Should `authMiddleware.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._