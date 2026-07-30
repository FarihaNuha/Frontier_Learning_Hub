const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const regCtrl = require("../controllers/registrationController");

// Student Routes
router.get("/available-courses", verifyToken, checkRole("student"), regCtrl.getAvailableCourses);
router.post("/submit", verifyToken, checkRole("student"), regCtrl.submitRegistration);
router.get("/my-status", verifyToken, checkRole("student"), regCtrl.getMyRegistrations);

// Teacher/Adviser Routes
router.get("/adviser/pending", verifyToken, checkRole("teacher"), regCtrl.getPendingRegistrationsForAdviser);
router.post("/adviser/approve/:id", verifyToken, checkRole("teacher"), regCtrl.approveRegistration);
router.post("/adviser/reject/:id", verifyToken, checkRole("teacher"), regCtrl.rejectRegistration);
router.post("/adviser/approve-all", verifyToken, checkRole("teacher"), regCtrl.approveAllPendingRegistrations);

module.exports = router;
