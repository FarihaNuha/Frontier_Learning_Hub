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

  // 1. Fetch all Users
  const registeredUsers = await User.find({ isRegistered: true }).lean();
  const registeredEmailSet = new Set(
    registeredUsers.map(u => (u.email || "").toLowerCase().trim()).filter(Boolean)
  );

  console.log("Currently registered emails (isRegistered: true):", Array.from(registeredEmailSet));

  // 2. Update Student accountStatus based on whether email is in registeredEmailSet
  const students = await Student.find();
  for (const s of students) {
    const email = (s.universityEmail || "").toLowerCase().trim();
    const isSignedUp = registeredEmailSet.has(email);
    const newStatus = isSignedUp ? "active" : "inactive";
    if (s.accountStatus !== newStatus) {
      s.accountStatus = newStatus;
      await s.save();
      console.log(`Updated Student ${s.studentId} (${s.name}) accountStatus -> ${newStatus}`);
    }
  }

  // 3. Update Teacher accountStatus (if present or if needed)
  const teachers = await Teacher.find();
  for (const t of teachers) {
    const email = (t.email || "").toLowerCase().trim();
    const isSignedUp = registeredEmailSet.has(email);
    const newStatus = isSignedUp ? "active" : "inactive";
    if (t.accountStatus !== newStatus) {
      t.accountStatus = newStatus;
      await t.save();
      console.log(`Updated Teacher ${t.teacherId} (${t.name}) accountStatus -> ${newStatus}`);
    }
  }

  console.log("\nDone updating MongoDB registration statuses!");
  await mongoose.disconnect();
}

run().catch(console.error);
