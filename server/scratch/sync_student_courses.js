const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Student = require("../models/Student");
const Registration = require("../models/Registration");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");

  // Create an approved registration for Asim for testing if needed
  const asimUser = await User.findOne({ email: "asim@gmail.com" }).lean();
  const asimStudent = await Student.findOne({ studentId: "2302001" }).lean();

  console.log("Asim User:", asimUser?._id);
  console.log("Asim Student:", asimStudent?.name);

  // Sync approved registrations & enrollments for all students
  const approvedRegs = await Registration.find({ status: "Approved" }).lean();
  console.log("Approved Registrations Count:", approvedRegs.length);

  for (const reg of approvedRegs) {
    const studentUser = await User.findOne({
      $or: [
        { _id: reg.user },
        ...(reg.studentId ? [{ studentId: reg.studentId }] : [])
      ]
    });
    if (!studentUser) continue;

    for (const courseItem of reg.selectedCourses || []) {
      const codeStr = (courseItem.courseCode || courseItem.code || "").toUpperCase().trim();
      if (!codeStr) continue;

      let lmsCourse = await Course.findOne({ displayCode: codeStr });
      if (!lmsCourse) {
        const joinCode = Math.floor(100000 + Math.random() * 900000).toString();
        lmsCourse = await Course.create({
          name: courseItem.courseTitle || codeStr,
          displayCode: codeStr,
          session: reg.session || "2023-24",
          department: reg.department || "EDTE",
          teacher: reg.user,
          joinCode,
          students: [studentUser._id]
        });
      } else {
        if (!lmsCourse.students.some(s => s.toString() === studentUser._id.toString())) {
          lmsCourse.students.push(studentUser._id);
          await lmsCourse.save();
        }
      }

      await Enrollment.findOneAndUpdate(
        {
          student: studentUser._id,
          courseCode: codeStr,
        },
        {
          studentId: reg.studentId,
          course: lmsCourse._id,
          courseTitle: courseItem.courseTitle,
          session: reg.session,
          level: reg.level,
          term: reg.term,
        },
        { upsert: true, returnDocument: "after" }
      );
    }
  }

  console.log("Synced approved courses to Course.students & Enrollment.");
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
