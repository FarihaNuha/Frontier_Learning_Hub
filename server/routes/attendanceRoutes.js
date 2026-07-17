const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/attendanceController");

// Teacher routes
router.get(
  "/courses/my",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.getTeacherCourses,
);

router.get(
  "/students/:courseId",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.getStudentsByCourse,
);

router.post(
  "/mark",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.markAttendance,
);

router.put(
  "/courses/:courseId/formulas",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.updateCourseFormulas,
);

// Student routes
router.get(
  "/my-courses",
  verifyToken,
  checkRole("student"),
  ctrl.getStudentCourses,
);

// Common routes
router.get("/stats", verifyToken, ctrl.getAttendanceStats);
router.get("/", verifyToken, ctrl.getAttendance);

module.exports = router;
