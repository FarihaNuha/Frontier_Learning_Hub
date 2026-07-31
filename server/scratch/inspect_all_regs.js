const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Student = require("../models/Student");
const Registration = require("../models/Registration");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
  
  const allRegs = await Registration.find().lean();
  const allEnrollments = await Enrollment.find().lean();
  const allStudents = await Student.find().lean();
  const allUsers = await User.find({ role: "student" }).lean();

  console.log("ALL REGISTRATIONS IN DB:", JSON.stringify(allRegs, null, 2));
  console.log("ALL ENROLLMENTS IN DB:", JSON.stringify(allEnrollments, null, 2));
  console.log("ALL STUDENT PROFILES:", allStudents.map(s => ({ name: s.name, studentId: s.studentId, email: s.universityEmail })));
  console.log("ALL STUDENT USERS:", allUsers.map(u => ({ name: u.name, email: u.email, id: u._id })));

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
