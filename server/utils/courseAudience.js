const mongoose = require("mongoose");
const Course = require("../models/Course");
const CourseImport = require("../models/CourseImport");
const User = require("../models/User");
const Registration = require("../models/Registration");
const Enrollment = require("../models/Enrollment");
const RetakeRequest = require("../models/RetakeRequest");

const escaped = value => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = value => new RegExp(`^${escaped(String(value).trim())}$`, "i");
const code = value => String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
const coursePattern = value => new RegExp(`^${code(value).split("").join("[\\s_-]*")}$`, "i");
const digit = value => String(value || "").match(/\d+/)?.[0] || "";
const dept = value => {
  const text = String(value || "").trim().toUpperCase();
  return ({ SOFTWARE: "SWE", CYBER: "CYSE", DATASCIENCE: "DSE", GENEAL: "GENERAL" })[text] || text;
};
const departmentFilter = value => {
  const canonical = dept(value);
  const aliases = { SWE: ["SWE", "Software"], CYSE: ["CySE", "Cyber"], DSE: ["DSE", "DataScience"] };
  return { $in: (aliases[canonical] || [canonical]).map(exact) };
};
const cohortError = message => Object.assign(new Error(message), { status: 400 });

// Only verified members of one course/cohort. Never fall back to all students.
async function getEnrolledStudents(courseId, courseCode, department, target = {}) {
  let courseDoc;
  if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
    courseDoc = await Course.findById(courseId).lean();
    if (!courseDoc) throw cohortError("Select an existing course before sending student notifications.");
  } else if (courseCode) {
    const matches = await Course.find({ displayCode: coursePattern(courseCode),
      ...(department ? { department: departmentFilter(department) } : {}),
      ...(target.session ? { session: target.session } : {}),
    }).limit(2).lean();
    if (matches.length !== 1) throw cohortError("Select the exact course and session; the course code alone is ambiguous.");
    courseDoc = matches[0];
  } else throw cohortError("A course is required for student notifications.");

  const courseCodeValue = courseDoc.displayCode, departmentValue = courseDoc.department;
  const session = String(courseDoc.session || target.session || "").trim();
  let level = digit(courseDoc.level || target.level), term = digit(courseDoc.term || target.term);
  if (!level || !term) {
    const catalog = await CourseImport.find({ courseCode: coursePattern(courseCodeValue), department: departmentFilter(departmentValue) })
      .select("level term").lean();
    const cohorts = [...new Set(catalog.map(row => `${digit(row.level)}:${digit(row.term)}`).filter(pair => !pair.startsWith(":") && !pair.endsWith(":")))];
    if (cohorts.length !== 1) throw cohortError("Set an unambiguous level and term for this course in the course catalog.");
    [level, term] = cohorts[0].split(":");
  }
  const memberIds = new Set((courseDoc.students || []).map(String));
  if (!session && !memberIds.size) throw cohortError("Set a course session or enroll its students before notifying this class.");
  const normCode = code(courseCodeValue);
  const cohortMatches = row => digit(row.level) === level && digit(row.term) === term;
  const sessionMatches = value => !session || String(value || "").trim() === session;
  const departmentMatches = value => dept(departmentValue) === "GENERAL" || dept(value) === dept(departmentValue);
  const sessionQuery = session ? { session } : {};
  const [registrations, enrollments, retakes] = await Promise.all([
    Registration.find({ status: "Approved", "selectedCourses.courseCode": coursePattern(courseCodeValue), ...sessionQuery })
      .select("user department session level term selectedCourses.courseCode").lean(),
    Enrollment.find({ courseCode: coursePattern(courseCodeValue), ...sessionQuery })
      .select("student session level term").lean(),
    RetakeRequest.find({ status: "Approved", courseCode: coursePattern(courseCodeValue), ...(session ? { targetSession: session } : {}) })
      .select("student department targetSession level term").lean(),
  ]);
  const ids = new Set();
  const include = id => {
    const value = String(id || "");
    if (mongoose.Types.ObjectId.isValid(value) && (session || memberIds.has(value))) ids.add(value);
  };
  for (const row of registrations) if (cohortMatches(row) && sessionMatches(row.session) && departmentMatches(row.department) &&
      row.selectedCourses?.some(item => code(item.courseCode) === normCode)) include(row.user);
  for (const row of enrollments) if (cohortMatches(row) && sessionMatches(row.session)) include(row.student);
  for (const row of retakes) if (cohortMatches(row) && sessionMatches(row.targetSession) && departmentMatches(row.department)) include(row.student);
  if (!ids.size) return [];
  return User.find({ _id: { $in: [...ids] }, role: "student", isBlocked: { $ne: true },
    ...(dept(departmentValue) !== "GENERAL" ? { department: departmentFilter(departmentValue) } : {}),
  }).select("_id name email emailNotifications department").lean();
}
module.exports = { getEnrolledStudents };
