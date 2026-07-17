const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const Course = require("../models/Course");
    const User = require("../models/User");

    const courses = await Course.find({});
    for (const course of courses) {
      const originalCount = course.students.length;
      
      // Filter out users who are teachers or admins
      const validStudents = [];
      for (const studentId of course.students) {
        const user = await User.findById(studentId);
        if (user && user.role === "student") {
          validStudents.push(studentId);
        } else {
          console.log(`Removing non-student (Role: ${user ? user.role : 'unknown'}) from course ${course.displayCode}: ${studentId}`);
        }
      }

      course.students = validStudents;
      await course.save();
      console.log(`Updated course ${course.displayCode}: student count from ${originalCount} to ${validStudents.length}`);
    }

    console.log("Database cleanup complete!");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
