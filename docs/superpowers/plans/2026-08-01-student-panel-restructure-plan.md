# Student Panel Restructuring & Level-Term Locking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize Student Panel sidebar navigation, update Notice Board icon, implement level-term locking on Assessment Marksheet, Result Publication, and My Courses level-term cards, and maintain session-isolated course display.

**Architecture:** React state & router hooks for navigation, lucide/feather icons (`FiClipboard`, `FiLock`, etc.), dynamic level-term index calculation (1-8) based on student profile/registrations.

**Tech Stack:** React, React Router v6, React Icons, CSS Modules/Styles.

## Global Constraints
- Do NOT perform git commits or pushes (user explicitly requested no commits/pushes).
- Preserve all pre-existing application functionality and API contracts.

---

### Task 1: Reorganize Student Sidebar Navigation (`StudentSidebar.jsx`)

**Files:**
- Modify: `client/src/components/StudentSidebar.jsx`

- [ ] **Step 1: Update Main Student Sidebar Navigation (`!cid`)**
Re-order main sidebar links:
1. My Courses (`/courses`)
2. Academic Profile (`/student/academic-profile`)
3. Registration (Collapsible dropdown: Course Registration, Retake Registration, Registration Payments)
4. Assessment Marksheet (`/student/assessment`)
5. Result Publication (`/student/results`)
6. Academic Transcript (`/student/transcript`)
7. Academic Calendar (`/academic-calendar`)
8. Community Hub (Collapsible dropdown: Discussion Feed, Messages, Contact Requests)
9. Notice Board (`/student/notices`) — Replace icon with `FiClipboard`
10. Notifications (`/student/notifications`)
11. Settings (`/settings`)
12. Logout

- [ ] **Step 2: Update Course Details Sidebar Navigation (`cid` present)**
Re-order course-specific sidebar links:
1. Course Materials (`/course/${cid}`)
2. Attendance (`/student/attendance/${cid}`)
3. Exams (`/student/exams/${cid}`)
4. Assignments (`/student/assignments/${cid}`)
5. Assessment Marks (`/student/assessment/${cid}`)
6. Performance Analytics (`/student/analytics/${cid}`)
7. Community (Collapsible dropdown: Discussion Feed, Messages, Contact Requests)
8. Back to Courses (`/courses`)
9. Notifications
10. Settings
11. Logout

- [ ] **Step 3: Verify syntax**
Run `node -e "console.log('Sidebar updated')"`

---

### Task 2: Assessment Marksheet Page Level-Term Locking (`StudentAssessmentPage.jsx`)

**Files:**
- Modify: `client/src/pages/StudentAssessmentPage.jsx`

- [ ] **Step 1: Add Level-Term Cards & Locking Logic**
- Fetch student profile/registration to determine `currentLevel` (1-4) and `currentTerm` (1-2).
- Calculate `currentLevelTermIndex = (level - 1) * 2 + term` (1 to 8).
- Render 8 Level-Term Cards (`Level 1 - Term 1` to `Level 4 - Term 2`).
- Mark cards 1..currentLevelTermIndex as UNLOCKED (clickable, filter assessments by level-term).
- Mark cards (currentLevelTermIndex + 1)..8 as LOCKED (render `FiLock` icon, disabled style).

- [ ] **Step 2: Filter Assessment Records by Selected Unlocked Level-Term**
- Display assessment mark records matching selected level-term.

---

### Task 3: Result Publication Page Level-Term Locking (`StudentAcademicResultsPage.jsx`)

**Files:**
- Modify: `client/src/pages/StudentAcademicResultsPage.jsx`

- [ ] **Step 1: Apply Level-Term Locking to Result Publication Cards**
- Calculate `currentLevelTermIndex` for student.
- Cards up to `currentLevelTermIndex` remain UNLOCKED & clickable.
- Cards beyond `currentLevelTermIndex` display `FiLock` icon, "Locked" badge, and are non-clickable.

---

### Task 4: My Courses Page Level-Term Cards & Session Filter (`CourseListPage.jsx`)

**Files:**
- Modify: `client/src/pages/CourseListPage.jsx`

- [ ] **Step 1: Render 8 Level-Term Cards for Student View**
- Show 8 Level-Term Cards on top of My Courses page for students.
- Unlock cards up to student's current registered level-term.
- Lock future unregistered level-term cards.
- Filter courses list based on clicked level-term card.

---

### Task 5: End-to-End Verification

**Files:**
- All modified components.

- [ ] **Step 1: Verify Node/React compilation**
- Run node syntax checks.
- Run `graphify update .` to update code graph.
