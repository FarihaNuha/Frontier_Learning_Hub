const router = require("express").Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/umsAdminController");

// Stats & lists
router.get("/stats", verifyToken, checkRole("admin"), ctrl.getStats);
router.get("/students", verifyToken, checkRole("admin"), ctrl.getStudents);
router.get("/teachers", verifyToken, checkRole("admin"), ctrl.getTeachers);
router.get("/teachers/academic-years", verifyToken, checkRole("admin"), ctrl.getTeacherAcademicYears);
router.get("/courses", verifyToken, checkRole("admin"), ctrl.getCourses);
router.get("/advisers", verifyToken, checkRole("admin"), ctrl.getAdvisers);

// Excel Imports
router.post("/import/students", verifyToken, checkRole("admin"), ctrl.importStudents);
router.post("/import/teachers", verifyToken, checkRole("admin"), ctrl.importTeachers);
router.post("/import/courses", verifyToken, checkRole("admin"), ctrl.importCourses);
router.post("/import/advisers", verifyToken, checkRole("admin"), ctrl.importAdvisers);
router.post("/import-advisers", verifyToken, checkRole("admin"), ctrl.importAdvisers);

// Manual Edit & Delete Endpoints
router.put("/students/:id", verifyToken, checkRole("admin"), ctrl.updateStudent);
router.delete("/students/:id", verifyToken, checkRole("admin"), ctrl.deleteStudent);

router.put("/teachers/:id", verifyToken, checkRole("admin"), ctrl.updateTeacher);
router.delete("/teachers/:id", verifyToken, checkRole("admin"), ctrl.deleteTeacher);
router.post("/teachers/assign", verifyToken, checkRole("admin"), ctrl.assignTeacherToCourse);
router.put("/teachers/:id/toggle-active", verifyToken, checkRole("admin"), ctrl.toggleTeacherActiveStatus);
router.get("/teachers/workload", verifyToken, checkRole("admin"), ctrl.getTeacherWorkload);

router.put("/courses/:id", verifyToken, checkRole("admin"), ctrl.updateCourse);
router.delete("/courses/:id", verifyToken, checkRole("admin"), ctrl.deleteCourse);

router.put("/advisers/:id", verifyToken, checkRole("admin"), ctrl.updateAdviser);
router.delete("/advisers/:id", verifyToken, checkRole("admin"), ctrl.deleteAdviser);

// Calendar & Payment & Registration Management Routes
router.get("/calendar", verifyToken, checkRole("admin"), ctrl.getRegistrationCalendars);
router.post("/calendar", verifyToken, checkRole("admin"), ctrl.upsertRegistrationCalendar);
router.put("/calendar/:id", verifyToken, checkRole("admin"), ctrl.updateRegistrationCalendar);
router.delete("/calendar/:id", verifyToken, checkRole("admin"), ctrl.deleteRegistrationCalendar);

router.get("/payments", verifyToken, checkRole("admin"), ctrl.getAdminPayments);
router.put("/payments/:id", verifyToken, checkRole("admin"), ctrl.updatePaymentStatus);

router.get("/registrations", verifyToken, checkRole("admin"), ctrl.getAllRegistrationsAdmin);

module.exports = router;
