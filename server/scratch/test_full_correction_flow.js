const axios = require("axios");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

async function testFullFlow() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const student = await User.findOne({ role: "student" });
  const teacher = await User.findOne({ email: "rubel@gmail.com" }) || await User.findOne({ role: "teacher" });

  console.log(`Student: ${student.name} (${student.email})`);
  console.log(`Teacher: ${teacher.name} (${teacher.email})`);

  const studentToken = jwt.sign(
    { uid: student._id, role: student.role, email: student.email, name: student.name, studentId: student.studentId },
    process.env.JWT_SECRET || "your_super_secret_key_change_this",
    { expiresIn: "1h" }
  );

  const teacherToken = jwt.sign(
    { uid: teacher._id, role: teacher.role, email: teacher.email, name: teacher.name },
    process.env.JWT_SECRET || "your_super_secret_key_change_this",
    { expiresIn: "1h" }
  );

  // 1. Submit Correction Request
  console.log("Submitting Correction Request from Student...");
  const postRes = await axios.post(
    "http://localhost:5000/api/results/correction-request",
    {
      courseCode: "ET 317",
      courseTitle: "Blended Education Design and Development",
      teacherEmail: teacher.email,
      studentMessage: "Correction Request: Attendance mark mismatch for ET 317",
    },
    { headers: { Authorization: `Bearer ${studentToken}` } }
  );
  console.log("Submit Response:", postRes.data.message);

  // 2. Fetch Teacher Correction Requests
  console.log("Fetching Correction Requests for Teacher...");
  const getRes = await axios.get("http://localhost:5000/api/results/teacher/correction-requests", {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });

  console.log(`✅ Teacher retrieved ${getRes.data.requests.length} correction requests:`);
  getRes.data.requests.forEach((req, i) => {
    console.log(`  ${i+1}. Student: ${req.studentName} (${req.studentId}) | Course: ${req.courseCode} | Message: "${req.studentMessage}"`);
  });

  await mongoose.disconnect();
}

testFullFlow().catch(console.error);
