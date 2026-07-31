const axios = require("axios");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

async function testCorrectionRoute() {
  await mongoose.connect(process.env.MONGODB_URI);
  const student = await User.findOne({ role: "student" });
  if (!student) {
    console.log("No student found");
    return;
  }

  const token = jwt.sign(
    { uid: student._id, role: student.role, email: student.email, name: student.name, studentId: student.studentId },
    process.env.JWT_SECRET || "your_super_secret_key_change_this",
    { expiresIn: "1h" }
  );

  console.log(`Testing correction request submission for student: ${student.name} (${student.email})`);

  try {
    const res = await axios.post(
      "http://localhost:5000/api/results/correction-request",
      {
        courseCode: "ET 317",
        courseTitle: "Blended Education Design and Development",
        teacherEmail: "rubel@gmail.com",
        studentMessage: "[Assessment Marksheet Issue] Test correction request from student dashboard",
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log("✅ SUCCESS! Server response:", res.data.message);
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

testCorrectionRoute();
