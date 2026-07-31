const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/resultController");

// Teacher Result endpoints
router.post("/upload", verifyToken, checkRole("teacher"), ctrl.uploadResultExcel);
router.get("/teacher", verifyToken, checkRole("teacher"), ctrl.getTeacherResults);
router.get("/teacher/deadlines", verifyToken, checkRole("teacher"), ctrl.getResultDeadlines);
router.put("/draft/:id", verifyToken, checkRole("teacher"), ctrl.updateDraftResult);
router.delete("/draft-batch/:uploadId", verifyToken, checkRole("teacher"), ctrl.deleteDraftUpload);
router.post("/submit/:uploadId", verifyToken, checkRole("teacher"), ctrl.submitResultToAdmin);
router.post("/teacher/set-correction-deadline/:uploadId", verifyToken, checkRole("teacher"), ctrl.setMidtermCorrectionDeadline);
router.post("/teacher/batch-update-marks", verifyToken, checkRole("teacher"), ctrl.batchUpdateMarks);

// Admin Result Management endpoints
router.get("/admin", verifyToken, checkRole("admin"), ctrl.getAdminResults);
router.post("/admin/verify/:uploadId", verifyToken, checkRole("admin"), ctrl.verifyResultBatch);
router.post("/admin/request-correction/:uploadId", verifyToken, checkRole("admin"), ctrl.requestCorrectionBatch);
router.post("/admin/publish/:uploadId", verifyToken, checkRole("admin"), ctrl.publishResultBatch);
router.post("/admin/calculate-gpa", verifyToken, checkRole("admin"), ctrl.calculateSemesterGPA);
router.post("/admin/notice", verifyToken, checkRole("admin"), ctrl.setDeadlineAndNotice);
router.post("/admin/send-teacher-reminder", verifyToken, checkRole("admin"), ctrl.sendTeacherReminder);
router.post("/admin/schedule-publication", verifyToken, checkRole("admin"), ctrl.schedulePublicationBySession);

// Student Result endpoints
router.get("/student", verifyToken, checkRole("student"), ctrl.getStudentPublishedResults);

// Correction Requests & Messaging
router.post("/correction-request", verifyToken, checkRole("student"), ctrl.createCorrectionRequest);
router.get("/student/correction-requests", verifyToken, checkRole("student"), ctrl.getStudentCorrectionRequests);
router.get("/teacher/correction-requests", verifyToken, checkRole("teacher"), ctrl.getTeacherCorrectionRequests);
router.post("/teacher/reply-correction-request/:requestId", verifyToken, checkRole("teacher"), ctrl.replyToCorrectionRequest);

module.exports = router;
