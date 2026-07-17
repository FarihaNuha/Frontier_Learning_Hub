const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const ctrl = require("../controllers/assessmentController");

// Teacher routes
router.post(
  "/upload",
  verifyToken,
  checkRole("teacher", "admin"),
  upload.single("file"),
  ctrl.uploadMarksheet
);
router.get(
  "/teacher",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.getTeacherAssessments
);

// Student routes
router.get(
  "/student",
  verifyToken,
  checkRole("student"),
  ctrl.getStudentAssessments
);

// Delete routes
router.delete(
  "/course/:courseCode",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.deleteCourseAssessment
);

router.delete(
  "/record/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.deleteSingleAssessment
);

module.exports = router;
