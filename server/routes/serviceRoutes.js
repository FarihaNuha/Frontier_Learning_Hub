const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const noticeCtrl = require("../controllers/noticeController");
const calendarCtrl = require("../controllers/academicCalendarController");
const searchCtrl = require("../controllers/searchController");

// Notice Endpoints
router.get("/notices", verifyToken, noticeCtrl.getNotices);
router.post("/notices", verifyToken, checkRole("admin"), noticeCtrl.createNotice);
router.put("/notices/:id", verifyToken, checkRole("admin"), noticeCtrl.updateNotice);
router.delete("/notices/:id", verifyToken, checkRole("admin"), noticeCtrl.deleteNotice);
router.post("/notices/pin/:id", verifyToken, checkRole("admin"), noticeCtrl.togglePinNotice);

const upload = require("../middleware/upload");

// Academic Calendar Endpoints
router.get("/calendar", verifyToken, calendarCtrl.getCalendarEvents);
router.get("/calendar/published", verifyToken, calendarCtrl.getPublishedCalendar);
router.post("/calendar/published", verifyToken, checkRole("admin"), calendarCtrl.publishCalendar);
router.post("/calendar/upload-file", verifyToken, checkRole("admin"), upload.single("calendarFile"), calendarCtrl.uploadCalendarFile);
router.post("/calendar", verifyToken, checkRole("admin"), calendarCtrl.createCalendarEvent);
router.put("/calendar/:id", verifyToken, checkRole("admin"), calendarCtrl.updateCalendarEvent);
router.delete("/calendar/:id", verifyToken, checkRole("admin"), calendarCtrl.deleteCalendarEvent);

// Global Search Endpoint
router.get("/search", verifyToken, searchCtrl.globalSearch);

module.exports = router;
