const mongoose = require("mongoose");
require("dotenv").config();

const { getAvailableCourses } = require("../controllers/registrationController");
const User = require("../models/User");
const Student = require("../models/Student");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");

  const student = await Student.findOne({ department: "EDTE" }).lean();
  if (student) {
    const user = await User.findOne({ email: student.universityEmail }).lean();
    const req = {
      user: { id: user._id, _id: user._id, email: user.email, role: "student" },
      query: { level: `Level-${student.currentLevel}`, term: `Term-${student.currentTerm}` }
    };

    const res = {
      json: (d) => {
        console.log("AVAILABLE COURSES FOR STUDENT:", student.name, student.department, student.program);
        console.log("FETCHED COURSES COUNT:", d.courses?.length);
        console.log("COURSES:", d.courses?.map(c => ({ code: c.courseCode, title: c.courseTitle, dept: c.department, prog: c.program })));
      },
      status: (code) => ({ json: (err) => console.log("ERROR:", code, err) })
    };

    await getAvailableCourses(req, res);
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
