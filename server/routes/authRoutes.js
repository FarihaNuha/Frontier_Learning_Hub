const router = require("express").Router();
const { register, login, getMe, updateProfile, forgotPassword, resetPassword, blockUser, unblockUser, getBlockedUsers } = require("../controllers/authController");
const { saveFcmToken, removeFcmToken, getPushStatus, testPushNotification } = require("../controllers/pushController");
const { verifyToken, checkRole } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);
router.post("/fcm-token", verifyToken, saveFcmToken);
router.delete("/fcm-token", verifyToken, removeFcmToken);
router.get("/push-status", verifyToken, getPushStatus);
router.post("/push-test", verifyToken, testPushNotification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/users/:userId/block", verifyToken, checkRole("teacher", "admin"), blockUser);
router.post("/users/:userId/unblock", verifyToken, checkRole("teacher", "admin"), unblockUser);
router.get("/blocked-users", verifyToken, checkRole("teacher", "admin"), getBlockedUsers);

module.exports = router;
