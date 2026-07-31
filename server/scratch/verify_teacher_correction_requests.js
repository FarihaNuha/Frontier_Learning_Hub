const axios = require("axios");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

async function testTeacherCorrectionFetch() {
  await mongoose.connect(process.env.MONGODB_URI);
  const teacher = await User.findOne({ role: "teacher" });
  if (!teacher) {
    console.log("No teacher found");
    return;
  }

  const token = jwt.sign(
    { uid: teacher._id, role: teacher.role, email: teacher.email, name: teacher.name },
    process.env.JWT_SECRET || "your_super_secret_key_change_this",
    { expiresIn: "1h" }
  );

  console.log(`Fetching correction requests for teacher: ${teacher.name} (${teacher.email})`);

  try {
    const res = await axios.get("http://localhost:5000/api/results/teacher/correction-requests", {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ SUCCESS! Teacher has ${res.data.requests.length} correction requests:`);
    res.data.requests.forEach((req, idx) => {
      console.log(`  ${idx + 1}. Student: ${req.studentName} (${req.studentId}) | Course: ${req.courseCode} | Message: "${req.studentMessage}" | Status: ${req.status}`);
    });
  } catch (err) {
    if (err.response) {
      console.error("❌ FAILED with status:", err.response.status, err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  } finally {
    await mongoose.disconnect();
  }
}

testTeacherCorrectionFetch().catch(console.error);
