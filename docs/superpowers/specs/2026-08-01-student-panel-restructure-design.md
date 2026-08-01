# Student Panel Restructuring & Level-Term Locking Design Spec

## Overview
This specification outlines structural and UI design enhancements for the UFTB Moodle Student Panel. It reorganizes sidebar navigation, implements level-term progression locking across Assessment Marksheets, Result Publication, and My Courses, and ensures proper session-isolated course display.

## 1. Sidebar Navigation Restructure (`StudentSidebar.jsx`)

### A. Main Student Sidebar (No Active Course Context `!cid`)
Order of items:
1. **My Courses** (`/courses`) — `FiBookOpen`
2. **Academic Profile** (`/student/academic-profile`) — `FiUser`
3. **Registration** (Collapsible Dropdown):
   - **Course Registration** (`/student/course-registration`) — `FiCalendar`
   - **Retake Registration** (`/student/retake-registration`) — `FiRefreshCw`
   - **Registration Payments** (`/student/registration-payments`) — `FiCreditCard`
4. **Assessment Marksheet** (`/student/assessment`) — `FiFileText`
5. **Result Publication** (`/student/results`) — `FiAward`
6. **Academic Transcript** (`/student/transcript`) — `FiFileText`
7. **Academic Calendar** (`/academic-calendar`) — `FiCalendar`
8. **Community Hub** (Collapsible Dropdown):
   - **Discussion Feed** (`/community`) — `FiMessageCircle`
   - **Messages** (`/messages`) — `FiMail`
   - **Contact Requests** (`/messages?tab=requests`) — `FiClock`
9. **Notice Board** (`/student/notices`) — Changed icon to `FiClipboard` (prevents clash with Notifications `FiBell`)
10. **Notifications** (`/student/notifications` or notification portal) — `FiBell`
11. **Settings** (`/settings`) — `FiSettings`
12. **Logout** — `FiLogOut`

### B. Course Details Sidebar (Active Course Context `cid` present)
Order of items:
1. **Course Materials** (`/course/${cid}`) — `FiBook`
2. **Attendance** (`/student/attendance/${cid}`) — `FiCalendar`
3. **Exams** (`/student/exams/${cid}`) — `FiFileText`
4. **Assignments** (`/student/assignments/${cid}`) — `FiFileText`
5. **Assessment Marks** (`/student/assessment/${cid}`) — `FiFileText`
6. **Performance Analytics** (`/student/analytics/${cid}`) — `FiActivity`
7. **Community** (Collapsible Dropdown):
   - **Discussion Feed** (`/community/courses/${cid}`) — `FiMessageCircle`
   - **Messages** (`/messages?courseId=${cid}`) — `FiMail`
   - **Contact Requests** (`/messages?tab=requests&courseId=${cid}`) — `FiClock`
8. **Back to Courses** (`/courses`) — `FiArrowLeft`
9. **Notifications** — `FiBell`
10. **Settings** — `FiSettings`
11. **Logout** — `FiLogOut`

---

## 2. Assessment Marksheet Page Level-Term Locking (`StudentAssessmentPage.jsx`)
- Render 8 Level-Term cards at the top (`Level 1 - Term 1` to `Level 4 - Term 2`).
- Unlocked cards: Current student Level-Term and all previous Level-Terms.
- Locked cards: Future Level-Terms beyond current assigned Level-Term.
- Unlocked cards display counts, active status, and are selectable.
- Locked cards display `FiLock` icon with "Locked" badge and muted aesthetic.

---

## 3. Result Publication Page Level-Term Locking (`StudentAcademicResultsPage.jsx`)
- Apply locking logic to the existing 8 Level-Term cards.
- Current and past Level-Term cards remain unlocked and clickable.
- Future Level-Term cards display `FiLock` icon, disabled cursor, and lock message if clicked.

---

## 4. My Courses Page Level-Term Cards & Session Filtering (`CourseListPage.jsx`)
- Render 8 Level-Term cards at the top of My Courses page for students.
- Only registered Level-Term cards (past and current) are unlocked.
- Future unregistered Level-Term cards are locked.
- Clicking an unlocked Level-Term card filters courses assigned specifically for that level-term and session.
- Ensures unique course card rendering per session & department.
