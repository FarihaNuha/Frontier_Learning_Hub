const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Student = require("../models/Student");
const Registration = require("../models/Registration");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
  
  const asimUser = await User.findOne({ email: "asim@gmail.com" }).lean();
  const asimStudent = await Student.findOne({ studentId: "2302001" }).lean();
  const asimRegs = await Registration.find({ studentId: "2302001" }).lean();
  const asimEnrollments = await Enrollment.find({
    $or: [{ student: asimUser._id }, { studentId: "2302001" }]
  }).lean();

  console.log("Asim User:", asimUser?._id);
  console.log("Asim Student:", asimStudent?.name, asimStudent?.studentId);
  console.log("Asim Registrations:", JSON.stringify(asimRegs, null, 2));
  console.log("Asim Enrollments:", asimEnrollments);

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
