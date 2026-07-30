const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Course = require("../models/Course");
const CourseImport = require("../models/CourseImport");

async function testTeacherSummary() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  const rabbiUser = await User.findOne({ email: "farihatasnim0903@gmail.com" });
  console.log("Rabbi User:", rabbiUser?.email);

  const teacherDoc = await Teacher.findOne({ email: "farihatasnim0903@gmail.com" }).lean();
  console.log("Teacher Doc assignedCourses:", teacherDoc?.assignedCourses);

  const teacherLmsCourses = await Course.find({ teacher: rabbiUser._id }).lean();
  console.log("Teacher LMS Courses:", teacherLmsCourses.map(c => ({ code: c.displayCode || c.courseCode, title: c.name, session: c.session, level: c.level, term: c.term })));

  await mongoose.disconnect();
}

testTeacherSummary().catch(console.error);
