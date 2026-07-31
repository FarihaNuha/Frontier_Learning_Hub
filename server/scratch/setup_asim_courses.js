const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Student = require("../models/Student");
const Registration = require("../models/Registration");
const CourseImport = require("../models/CourseImport");
const { approveRegistration } = require("../controllers/registrationController");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");

  const asimUser = await User.findOne({ email: "asim@gmail.com" });
  const asimStudent = await Student.findOne({ studentId: "2302001" });

  const level2Term2Courses = await CourseImport.find({
    level: { $regex: /level[\s-]*2/i },
    term: { $regex: /term[\s-]*2/i }
  }).lean();

  console.log("Found L2T2 courses count:", level2Term2Courses.length);

  // Create an approved registration for Asim
  let reg = await Registration.findOne({ studentId: "2302001" });
  if (!reg) {
    reg = await Registration.create({
      studentId: "2302001",
      user: asimUser._id,
      department: "EDTE",
      session: "2023-24",
      level: "Level-2",
      term: "Term-2",
      totalCredits: 18,
      registrationFee: 4900,
      totalPayable: 4900,
      selectedCourses: level2Term2Courses.map(c => ({
        courseCode: c.courseCode,
        courseTitle: c.courseTitle,
        creditHours: c.creditHours,
        courseType: c.courseType
      })),
      adviserEmail: "farihatasnim0903@gmail.com",
      status: "Approved",
      paymentStatus: "Paid"
    });
    console.log("Created Approved Registration for Asim with", reg.selectedCourses.length, "courses");
  } else {
    reg.status = "Approved";
    await reg.save();
  }

  // Run approval logic to create enrollments
  const req = { params: { id: reg._id } };
  const res = { json: () => {}, status: () => ({ json: () => {} }) };
  await approveRegistration(req, res);

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
