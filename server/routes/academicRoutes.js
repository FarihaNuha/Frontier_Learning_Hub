const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/academicController");

// Student Academic Endpoints
router.get("/student/profile", verifyToken, checkRole("student"), ctrl.getStudentAcademicProfile);
router.get("/student/transcript", verifyToken, ctrl.getStudentTranscript); // Allowed for Student & Admin
router.get("/student/failed-courses", verifyToken, checkRole("student"), ctrl.getFailedCoursesForRetake);
router.post("/student/retake-request", verifyToken, checkRole("student"), ctrl.submitRetakeRequest);
router.get("/student/dashboard-stats", verifyToken, checkRole("student"), ctrl.getStudentDashboardStats);

// Teacher / Adviser Retake Endpoints
router.get("/teacher/retakes", verifyToken, checkRole("teacher"), ctrl.getTeacherRetakeRequests);
router.post("/teacher/retake-process/:id", verifyToken, checkRole("teacher"), ctrl.processRetakeRequest);
router.get("/teacher/dashboard-stats", verifyToken, checkRole("teacher"), ctrl.getTeacherDashboardStats);

// Admin Academic Suite Endpoints
router.post("/admin/promote", verifyToken, checkRole("admin"), ctrl.promoteStudentsBatch);
router.post("/admin/graduate", verifyToken, checkRole("admin"), ctrl.graduateStudent);
router.get("/admin/dashboard-stats", verifyToken, checkRole("admin"), ctrl.getAdminDashboardStats);
router.get("/admin/audit-logs", verifyToken, checkRole("admin"), ctrl.getAuditLogs);

module.exports = router;
