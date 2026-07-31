const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function verify() {
  const User = require("../models/User");
  const mongoose = require("mongoose");
  await mongoose.connect(process.env.MONGODB_URI);

  const teacher = await User.findOne({ role: "teacher" });
  if (!teacher) {
    console.log("No teacher found");
    return;
  }

  const token = jwt.sign(
    { uid: teacher._id, role: teacher.role, department: teacher.department, name: teacher.name },
    process.env.JWT_SECRET || "your_super_secret_key_change_this",
    { expiresIn: "1h" }
  );

  console.log(`1. Logged in as Teacher: ${teacher.name} (${teacher.email})`);

  const wsData = [
    ["", "", "Dept: EDTE", "Session: 2022-23", "Level 3", "Term 2"],
    ["", "Course Code: UNASSIGNED 999", "Course Title: Fake Unassigned Course", "", "Course Type: Theory", "Credit Hour: 3"],
    [
      "SL",
      "ID of the Student",
      "Attendance and Class Performance Marks (30)",
      "Class Test/Quiz (Out of 30)",
      "Assignment (Out of 30)",
      "Presentation (Out of 30)",
      "Total CA Marks (90)",
    ],
    [1, "2202001", 30, 20, 26, 24, 70]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const tempPath = path.join(__dirname, "temp_fake_course.xlsx");
  XLSX.writeFile(wb, tempPath);

  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(tempPath));

    const uploadRes = await axios.post("http://localhost:5000/api/assessments/upload", form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Unexpected upload success:", uploadRes.data);
  } catch (err) {
    if (err.response) {
      console.log("\n✅ Backend BLOCKED unassigned course upload as expected!");
      console.log("\nReturned Warning Message:\n" + err.response.data.error);
    } else {
      console.error("Connection error:", err.message);
    }
  } finally {
    try { fs.unlinkSync(tempPath); } catch (e) {}
    await mongoose.disconnect();
  }
}

verify();
