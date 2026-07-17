const router = require("express").Router();
const upload = require("../middleware/upload");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/assignmentController");

// Teacher routes
router.post(
  "/create",
  verifyToken,
  checkRole("teacher", "admin"),
  upload.single("file"), // ADDED: file upload support
  ctrl.createAssignment,
);
router.put(
  "/toggle/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.toggleSubmission,
);
router.delete(
  "/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.deleteAssignment,
);
router.get(
  "/submissions/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.getSubmissions,
);
router.put(
  "/grade/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.gradeSubmission,
);

// Student routes
router.post(
  "/submit/:id",
  verifyToken,
  checkRole("student"),
  upload.any(),
  ctrl.submitAssignment,
);
router.get(
  "/my-submissions",
  verifyToken,
  checkRole("student"),
  ctrl.getMySubmissions,
);
router.delete(
  "/submission/:id",
  verifyToken,
  checkRole("student"),
  ctrl.deleteSubmission,
);

// Common routes
router.get("/", verifyToken, ctrl.getAssignments);
router.get("/view-base64/:id", verifyToken, ctrl.viewAssignmentBase64);
router.get("/submission/view-base64/:id", verifyToken, ctrl.viewSubmissionBase64);
router.get("/:id", verifyToken, ctrl.getAssignment);

module.exports = router;
