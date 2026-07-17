const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });

async function inspect() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected!");

    const User = require("../models/User");
    const Course = require("../models/Course");

    const users = await User.find({});
    console.log("\n=== USERS ===");
    users.forEach(u => {
      console.log(`- ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Department: ${u.department}`);
    });

    const courses = await Course.find({});
    console.log("\n=== COURSES ===");
    courses.forEach(c => {
      console.log(`- ID: ${c._id}, Name: ${c.name}, Code: ${c.displayCode}, JoinCode: ${c.joinCode}, Students count: ${c.students.length}`);
      console.log("  Students IDs:", c.students);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspect();
