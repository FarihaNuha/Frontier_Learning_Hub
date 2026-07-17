# Graph Report - server  (2026-07-17)

## Corpus Check
- 61 files · ~29,071 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 468 nodes · 666 edges · 24 communities (17 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1b2500bc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- communityController.js
- authMiddleware.js
- assessmentController.js
- assignmentController.js
- attendanceController.js
- similarityService.js
- dependencies
- index.js
- test_exam_controller.js
- lectureController.js
- examController.js
- authRoutes.js
- package.json
- previewService.js
- notificationRoutes.js
- Assessment.js
- seedAdmin.js
- inspect_submissions.js
- delete_user.js
- Department.js
- JoinRequest.js
- cleanup_teachers_from_students.js
- inspect_db.js
- test_query_requests.js

## God Nodes (most connected - your core abstractions)
1. `getIO()` - 22 edges
2. `queueEmail()` - 19 edges
3. `CommunityPost` - 17 edges
4. `verifyToken()` - 11 edges
5. `CommunityComment` - 9 edges
6. `Lecture` - 9 edges
7. `checkRole()` - 9 edges
8. `sendEmail()` - 9 edges
9. `PrivateMessage` - 8 edges
10. `emailTemplates` - 8 edges

## Surprising Connections (you probably didn't know these)
- `createContactRequest()` --calls--> `getIO()`  [EXTRACTED]
  controllers/communityController.js → socket.js
- `respondToContactRequest()` --calls--> `getIO()`  [EXTRACTED]
  controllers/communityController.js → socket.js
- `run()` --references--> `Lecture`  [EXTRACTED]
  query_lectures.js → controllers/lectureController.js
- `test()` --calls--> `sendEmail()`  [EXTRACTED]
  scratch/test_emails.js → services/emailService.js
- `uploadMarksheet()` --calls--> `queueEmail()`  [EXTRACTED]
  controllers/assessmentController.js → services/emailService.js

## Import Cycles
- None detected.

## Communities (24 total, 7 thin omitted)

### Community 0 - "communityController.js"
Cohesion: 0.07
Nodes (50): uploadMarksheet(), createAssignment(), gradeSubmission(), addCourseComment(), addPublicComment(), CommunityComment, CommunityPost, ContactRequest (+42 more)

### Community 1 - "authMiddleware.js"
Cohesion: 0.06
Nodes (36): checkRole(), jwt, User, verifyToken(), multer, path, storage, upload (+28 more)

### Community 2 - "assessmentController.js"
Cohesion: 0.07
Nodes (27): Assessment, Course, fs, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User, XLSX (+19 more)

### Community 3 - "assignmentController.js"
Cohesion: 0.06
Nodes (26): Assignment, Course, deleteSubmission(), fs, { getIO }, Notification, path, previewService (+18 more)

### Community 4 - "attendanceController.js"
Cohesion: 0.07
Nodes (20): Attendance, Course, evalArithmetic(), evaluateExcelFormula(), getAttendance(), getAttendanceStats(), markAttendance(), IMPORTANT: Filter only students, not teachers (+12 more)

### Community 5 - "similarityService.js"
Cohesion: 0.07
Nodes (28): mongoose, submissionSchema, fs, main(), mongoose, path, recalculateAssignmentSimilarity(), similarityService (+20 more)

### Community 6 - "dependencies"
Cohesion: 0.06
Nodes (31): axios, bcryptjs, cors, dotenv, express, jsonwebtoken, jszip, mammoth (+23 more)

### Community 7 - "index.js"
Cohesion: 0.08
Nodes (21): mongoose, allowedOrigins, app, connectDB, cors, dns, express, fs (+13 more)

### Community 8 - "test_exam_controller.js"
Cohesion: 0.08
Nodes (22): examSchema, mongoose, questionSchema, answerSchema, examSubmissionSchema, mongoose, assert, Course (+14 more)

### Community 9 - "lectureController.js"
Cohesion: 0.11
Nodes (20): Course, deleteLecture(), downloadLecture(), fs, { getIO }, getLectures(), jwt, Lecture (+12 more)

### Community 10 - "examController.js"
Cohesion: 0.10
Nodes (11): analyzeAI(), { analyzeAnswers }, Exam, ExamSubmission, { getIO }, Notification, { sendEmail, emailTemplates, queueEmail }, User (+3 more)

### Community 11 - "authRoutes.js"
Cohesion: 0.18
Nodes (16): bcrypt, blockUser(), forgotPassword(), generateToken(), getBlockedUsers(), getMe(), jwt, login() (+8 more)

### Community 12 - "package.json"
Cohesion: 0.12
Nodes (15): nodemon, author, description, devDependencies, nodemon, keywords, license, main (+7 more)

### Community 13 - "previewService.js"
Cohesion: 0.26
Nodes (12): buildSlideBodyHtml(), extractPptxSlidesArray(), extractPptxSlidesHtml(), extractSlideElements(), formatTableHtml(), formatTextElementHtml(), fs, generatePreviewData() (+4 more)

### Community 14 - "notificationRoutes.js"
Cohesion: 0.31
Nodes (7): getNotifications(), markAllAsRead(), markAsRead(), Notification, {
  getNotifications,
  markAsRead,
  markAllAsRead,
}, router, { verifyToken }

### Community 15 - "Assessment.js"
Cohesion: 0.29
Nodes (4): assessmentSchema, mongoose, Assessment, mongoose

### Community 16 - "seedAdmin.js"
Cohesion: 0.40
Nodes (3): adminData, bcrypt, mongoose

## Knowledge Gaps
- **235 isolated node(s):** `mongoose`, `Assessment`, `User`, `XLSX`, `fs` (+230 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getIO()` connect `communityController.js` to `assessmentController.js`, `assignmentController.js`, `index.js`, `lectureController.js`, `examController.js`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `queueEmail()` connect `communityController.js` to `examController.js`, `lectureController.js`, `assessmentController.js`, `assignmentController.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `sendEmail()` connect `assessmentController.js` to `communityController.js`, `lectureController.js`, `examController.js`, `assignmentController.js`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `mongoose`, `Assessment`, `User` to the rest of the system?**
  _236 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `communityController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06868686868686869 - nodes in this community are weakly interconnected._
- **Should `authMiddleware.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05920444033302498 - nodes in this community are weakly interconnected._
- **Should `assessmentController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06606606606606606 - nodes in this community are weakly interconnected._