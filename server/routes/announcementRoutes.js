const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/announcementController");

router.post("/", verifyToken, checkRole("teacher", "admin"), ctrl.createAnnouncement);
router.get("/course/:courseId", verifyToken, ctrl.getCourseAnnouncements);
router.put("/:id", verifyToken, checkRole("teacher", "admin"), ctrl.updateAnnouncement);
router.delete("/:id", verifyToken, checkRole("teacher", "admin"), ctrl.deleteAnnouncement);

module.exports = router;
