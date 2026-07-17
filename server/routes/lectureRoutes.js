const router = require("express").Router();
const upload = require("../middleware/upload");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/lectureController");

// Get all lectures
router.get("/", verifyToken, ctrl.getLectures);

// Upload lecture (Teacher and Admin only)
router.post(
  "/upload",
  verifyToken,
  checkRole("teacher", "admin"),
  upload.single("file"),
  ctrl.uploadLecture,
);

// View lecture in browser (no auth needed for direct file access)
router.get("/view/:id", ctrl.viewLecture);

// View lecture file as Base64 JSON (prevent IDM interception)
router.get("/view-base64/:id", verifyToken, ctrl.viewLectureBase64);

// Download lecture (token in query param)
router.get("/download/:id", ctrl.downloadLecture);

// Delete lecture
router.delete(
  "/:id",
  verifyToken,
  checkRole("teacher", "admin"),
  ctrl.deleteLecture,
);

// Share lecture to community
router.post(
  "/share/:id",
  verifyToken,
  ctrl.shareLecture,
);

module.exports = router;
