const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Student = require("../models/Student");
const Registration = require("../models/Registration");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const CourseImport = require("../models/CourseImport");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
  
  const asimUser = await User.findOne({ email: "asim@gmail.com" }).lean();
  const asimStudent = await Student.findOne({ studentId: "2302001" }).lean();
  
  console.log("asimUser:", asimUser?._id, asimUser?.email);
  console.log("asimStudent:", asimStudent?.name, asimStudent?.studentId, asimStudent?.currentLevel, asimStudent?.currentTerm);

  const asimRegs = await Registration.find({
    $or: [
      { user: asimUser._id },
      { studentId: "2302001" }
    ]
  }).lean();

  console.log("asimRegs count:", asimRegs.length);
  asimRegs.forEach(r => {
    console.log("  Reg ID:", r._id, "Status:", r.status, "Level:", r.level, "Term:", r.term, "Courses:", (r.selectedCourses || []).map(c => c.courseCode));
  });

  const asimEnrollments = await Enrollment.find({
    $or: [
      { student: asimUser._id },
      { studentId: "2302001" }
    ]
  }).lean();

  console.log("asimEnrollments count:", asimEnrollments.length);
  asimEnrollments.forEach(e => {
    console.log("  Enrollment:", e.courseCode, e.courseTitle);
  });

  const l2t2Import = await CourseImport.find({
    level: { $regex: /level[\s-]*2/i },
    term: { $regex: /term[\s-]*2/i }
  }).lean();

  console.log("L2T2 CourseImports count:", l2t2Import.length);
  console.log("L2T2 CourseImport codes:", l2t2Import.map(c => c.courseCode));

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
