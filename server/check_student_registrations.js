const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

const Registration = require("./models/Registration");
const Student = require("./models/Student");
const AcademicProfile = require("./models/AcademicProfile");

async function check() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
  console.log("Connected to DB");

  const regs = await Registration.find({}).limit(10).lean();
  console.log("Sample Registrations:", regs.map(r => ({
    studentId: r.studentId,
    session: r.session,
    level: r.level,
    term: r.term,
    department: r.department,
    courses: r.courses
  })));

  const students = await Student.find({}).limit(10).lean();
  console.log("Sample Student models:", students.map(s => ({
    studentId: s.studentId,
    session: s.session,
    level: s.level,
    term: s.term,
    department: s.department,
    batch: s.batch
  })));

  const profiles = await AcademicProfile.find({}).limit(10).lean();
  console.log("Sample AcademicProfiles:", profiles.map(ap => ({
    studentId: ap.studentId,
    session: ap.session,
    level: ap.level,
    term: ap.term,
    department: ap.department
  })));

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
