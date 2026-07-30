const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/courseController");

// Teacher routes
router.post(
  "/create",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.createCourse,
);
router.delete(
  "/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.deleteCourse,
);

// Student routes
router.post("/join", verifyToken, checkRole("student"), ctrl.joinCourse);
router.post("/:id/leave", verifyToken, checkRole("student"), ctrl.leaveCourse);

// Join request endpoints (Teacher only)
router.get("/join-requests", verifyToken, checkRole("teacher"), ctrl.getJoinRequests);
router.post("/join-requests/:requestId/action", verifyToken, checkRole("teacher"), ctrl.handleJoinRequest);

// Teacher Dashboard & Enrolled Students routes
router.get("/teacher-summary", verifyToken, checkRole("teacher", "admin"), ctrl.getTeacherDashboardSummary);
router.get("/:courseId/enrolled-students", verifyToken, ctrl.getEnrolledStudentsForCourse);

// Common routes
router.get("/my", verifyToken, ctrl.getMyCourses);
router.get("/:id", verifyToken, ctrl.getCourse);

// Analytics routes
router.get("/:id/analytics/students", verifyToken, checkRole("teacher"), ctrl.getCourseStudentsAnalytics);
router.get("/:id/analytics/student/:studentId", verifyToken, ctrl.getStudentAnalytics);

module.exports = router;
