const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Course = require("../models/Course");
const Teacher = require("../models/Teacher");

async function verifyRabbiCourses() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  const rabbiUser = await User.findOne({ email: "farihatasnim0903@gmail.com" });
  console.log("Rabbi User:", rabbiUser?.email, rabbiUser?._id);

  const teacherProfile = await Teacher.findOne({ email: rabbiUser.email }).lean();
  console.log("Teacher Profile Assigned Courses Count:", teacherProfile?.assignedCourses?.length);

  let courses = await Course.find({ teacher: rabbiUser._id }).lean();
  console.log("DB LMS Courses linked to Rabbi:", courses.map(c => `${c.displayCode}: ${c.name}`));

  await mongoose.disconnect();
}

verifyRabbiCourses().catch(console.error);
