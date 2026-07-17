const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/examController");

// Teacher routes
router.post(
  "/create",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.createExam,
);
router.get(
  "/submissions/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.getSubmissions,
);
router.put(
  "/grade",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.gradeShortAnswer,
);
router.put(
  "/submission/:id/feedback",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.updateOverallFeedback,
);
router.get(
  "/teacher/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.getExamForTeacher,
);
router.delete(
  "/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.deleteExam,
);
router.put(
  "/toggle/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.toggleExam,
);
router.put(
  "/publish/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.publishExamResults,
);

// Student routes
router.post("/submit", verifyToken, checkRole("student"), ctrl.submitExam);
router.get(
  "/my-submissions",
  verifyToken,
  checkRole("student"),
  ctrl.getMySubmissions,
);
router.post("/analyze-ai", verifyToken, ctrl.analyzeAI);

// Common routes
router.get("/", verifyToken, ctrl.getExams);
router.get("/:id", verifyToken, ctrl.getExam);

module.exports = router;
