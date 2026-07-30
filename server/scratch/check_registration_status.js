const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");

async function run() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  console.log("Connecting to DB...");
  await mongoose.connect(mongoUri);

  const users = await User.find({}, "email role isRegistered name").lean();
  console.log("\n=== USERS IN DB ===");
  users.forEach(u => {
    console.log(`Email: ${u.email}, Role: ${u.role}, isRegistered: ${u.isRegistered}`);
  });

  const students = await Student.find({}, "studentId name universityEmail accountStatus").lean();
  console.log("\n=== STUDENTS IN DB ===");
  students.forEach(s => {
    console.log(`Student ID: ${s.studentId}, Name: ${s.name}, Email: ${s.universityEmail}, accountStatus: ${s.accountStatus}`);
  });

  const teachers = await Teacher.find({}, "teacherId name email accountStatus").lean();
  console.log("\n=== TEACHERS IN DB ===");
  teachers.forEach(t => {
    console.log(`Teacher ID: ${t.teacherId}, Name: ${t.name}, Email: ${t.email}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
