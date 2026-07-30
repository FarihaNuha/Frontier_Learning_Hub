const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const payCtrl = require("../controllers/registrationPaymentController");

// Student Endpoints
router.post("/initiate", verifyToken, payCtrl.initiateOrGetPaymentRecord);
router.post("/process", verifyToken, payCtrl.processOnlinePayment);
router.post("/retry/:paymentId", verifyToken, payCtrl.retryPayment);
router.get("/history", verifyToken, payCtrl.getStudentPaymentHistory);
router.get("/receipt/:paymentId", verifyToken, payCtrl.getPaymentReceiptData);
router.get("/invoice/:registrationId", verifyToken, payCtrl.getRegistrationInvoiceData);

// Admin Endpoints
router.get("/admin/payments", verifyToken, checkRole("admin"), payCtrl.getAdminRegistrationPayments);

module.exports = router;
