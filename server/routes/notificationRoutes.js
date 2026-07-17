const router = require("express").Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.get("/", verifyToken, getNotifications);
router.put("/:notificationId/read", verifyToken, markAsRead);
router.put("/read-all", verifyToken, markAllAsRead);

module.exports = router;
