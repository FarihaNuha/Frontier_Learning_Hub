const mongoose = require("mongoose");
const Course = require("../models/Course");
const User = require("../models/User");
const Registration = require("../models/Registration");
const Enrollment = require("../models/Enrollment");
const RetakeRequest = require("../models/RetakeRequest");

/**
 * Robustly find all enrolled and relevant students for a course
 * Ensures no student is ever missed when a teacher uploads or creates content.
 *
 * @param {string} courseId - Course MongoDB ObjectId or code
 * @param {string} courseCode - Course display code (e.g. "SWE-101", "CSE 101")
 * @param {string} department - Department string (e.g. "Software", "EDTE")
 * @returns {Promise<Array<User>>} - Array of User documents
 */
async function getEnrolledStudents(courseId, courseCode, department) {
  const studentUserIds = new Set();
  let courseDoc = null;

  // 1. Try finding course document by ID if it's a valid ObjectId
  if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
    try {
      courseDoc = await Course.findById(courseId).lean();
    } catch (e) {
      console.warn("Course.findById note:", e.message);
    }
  }

  // 2. Try finding course by code/name if not found by ID
  if (!courseDoc && courseCode) {
    try {
      const cleanCode = courseCode.trim();
      courseDoc = await Course.findOne({
        $or: [
          { displayCode: new RegExp(`^${cleanCode}$`, "i") },
          { name: new RegExp(`^${cleanCode}$`, "i") },
          { joinCode: cleanCode },
        ],
      }).lean();
    } catch (e) {
      console.warn("Course.findOne by code note:", e.message);
    }
  }

  // 3. Add students from Course.students array if present
  if (courseDoc && Array.isArray(courseDoc.students)) {
    for (const sid of courseDoc.students) {
      if (sid) studentUserIds.add(String(sid));
    }
  }

  const effectiveCode = (courseCode || courseDoc?.displayCode || courseDoc?.name || "").trim();
  const effectiveDept = (department || courseDoc?.department || "").trim();

  if (effectiveCode) {
    const normCode = effectiveCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const codeRegex = new RegExp(`^${effectiveCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i");

    // 4. Source B: Approved Registration Collection
    try {
      const approvedRegs = await Registration.find({ status: "Approved" }).lean();
      for (const r of approvedRegs) {
        const hasCourse = (r.selectedCourses || []).some((c) => {
          const cCode = (c.courseCode || c.code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          const cTitle = (c.courseTitle || "").toLowerCase();
          return (cCode && cCode === normCode) || cTitle.includes(normCode.toLowerCase());
        });
        if (hasCourse && r.user) {
          studentUserIds.add(String(r.user));
        }
      }
    } catch (e) {
      console.warn("Registration lookup note:", e.message);
    }

    // 5. Source C: Enrollment Collection
    try {
      const enrollments = await Enrollment.find({
        $or: [
          { courseCode: { $regex: codeRegex } },
          { courseTitle: { $regex: new RegExp(effectiveCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") } },
        ],
      }).lean();
      for (const en of enrollments) {
        if (en.student) studentUserIds.add(String(en.student));
      }
    } catch (e) {
      console.warn("Enrollment lookup note:", e.message);
    }

    // 6. Source D: Approved Retakes
    try {
      const retakes = await RetakeRequest.find({ status: "Approved" }).lean();
      for (const retake of retakes) {
        const cCode = (retake.courseCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (cCode && cCode === normCode && retake.student) {
          studentUserIds.add(String(retake.student));
        }
      }
    } catch (e) {
      console.warn("RetakeRequest lookup note:", e.message);
    }
  }

  // 7. Fallback to Department Students if no specific course enrollment found
  // This ensures students NEVER miss a lecture/exam/assignment notification even before registration is finalized
  if (studentUserIds.size === 0) {
    try {
      const deptFilter = { role: { $in: ["student", "Student"] } };
      if (effectiveDept && effectiveDept !== "General") {
        deptFilter.department = new RegExp(`^${effectiveDept}$`, "i");
      }
      const deptStudents = await User.find(deptFilter).select("_id").lean();
      for (const ds of deptStudents) {
        studentUserIds.add(String(ds._id));
      }
    } catch (e) {
      console.warn("Department fallback note:", e.message);
    }
  }

  // 8. Failsafe: If still 0, include all students
  if (studentUserIds.size === 0) {
    try {
      const allStudents = await User.find({ role: { $in: ["student", "Student"] } }).select("_id").lean();
      for (const as of allStudents) {
        studentUserIds.add(String(as._id));
      }
    } catch (e) {
      console.warn("All students failsafe note:", e.message);
    }
  }

  // 9. Query actual User documents
  const targetIds = Array.from(studentUserIds).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (targetIds.length === 0) {
    return [];
  }

  const students = await User.find({ _id: { $in: targetIds } });
  return students;
}

module.exports = {
  getEnrolledStudents,
};
