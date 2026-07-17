const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/adminController");

// Departments
router.get(
  "/departments",
  verifyToken,
  checkRole("admin"),
  ctrl.getDepartments,
);
router.post(
  "/departments",
  verifyToken,
  checkRole("admin"),
  ctrl.createDepartment,
);
router.delete(
  "/departments/:id",
  verifyToken,
  checkRole("admin"),
  ctrl.deleteDepartment,
);

// Users
router.get("/users", verifyToken, checkRole("admin"), ctrl.getUsers);
router.get("/teachers", verifyToken, checkRole("admin"), ctrl.getTeachers);
router.get("/students", verifyToken, checkRole("admin"), ctrl.getStudents);
router.get(
  "/pending-counts",
  verifyToken,
  checkRole("admin"),
  ctrl.getPendingCounts,
);
router.put(
  "/users/:id/toggle",
  verifyToken,
  checkRole("admin"),
  ctrl.toggleUser,
);
router.put(
  "/users/:id/courses",
  verifyToken,
  checkRole("admin"),
  ctrl.updateUserCourses,
);
router.put(
  "/users/:id/approve",
  verifyToken,
  checkRole("admin"),
  ctrl.approveUser,
);
router.put(
  "/users/:id/reject",
  verifyToken,
  checkRole("admin"),
  ctrl.rejectUser,
);
router.delete("/users/:id", verifyToken, checkRole("admin"), ctrl.deleteUser);
router.post(
  "/add-user",
  verifyToken,
  checkRole("admin"),
  ctrl.addUserWithCourses,
);

// Courses
router.get("/courses", verifyToken, checkRole("admin"), ctrl.getCourses);
router.post("/courses", verifyToken, checkRole("admin"), ctrl.createCourse);
router.delete(
  "/courses/:id",
  verifyToken,
  checkRole("admin"),
  ctrl.deleteCourse,
);

// Stats
router.get("/stats", verifyToken, checkRole("admin"), ctrl.getStats);
router.get(
  "/department-stats",
  verifyToken,
  checkRole("admin"),
  ctrl.getDepartmentStats,
);

module.exports = router;
