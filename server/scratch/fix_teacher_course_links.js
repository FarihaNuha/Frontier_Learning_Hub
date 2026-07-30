const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");
const Course = require("../models/Course");
const User = require("../models/User");

async function fixTeacherCourseLinks() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  console.log("=== FIXING TEACHER COURSE LINKS IN MONGO DB ===");
  const teachers = await Teacher.find().lean();
  const users = await User.find({ role: "teacher" }).lean();

  for (const t of teachers) {
    const userDoc = users.find(u => u.email.toLowerCase() === t.email.toLowerCase());
    if (!userDoc) continue;

    const assigned = t.assignedCourses || [];
    const assignedCodes = new Set(assigned.map(ac => (ac.courseCode || "").trim().toUpperCase()).filter(Boolean));
    const assignedNames = new Set(assigned.map(ac => (ac.courseName || "").trim().toLowerCase()).filter(Boolean));

    console.log(`Teacher ${t.name} (${t.email}) assigned names:`, Array.from(assignedNames));

    // Find all courses currently assigned to this teacher in LMS Course collection
    const courses = await Course.find({ teacher: userDoc._id });
    for (const c of courses) {
      const code = (c.displayCode || "").trim().toUpperCase();
      const name = (c.name || "").trim().toLowerCase();

      const matchesCode = assignedCodes.has(code);
      const matchesExactName = assignedNames.has(name);

      if (!matchesCode && !matchesExactName) {
        console.log(`Unlinking incorrect course from ${t.name}:`, c.displayCode, c.name);
        await Course.findByIdAndUpdate(c._id, { $unset: { teacher: "" } });
      }
    }
  }

  await mongoose.disconnect();
  console.log("=== DONE FIXING TEACHER COURSE LINKS ===");
}

fixTeacherCourseLinks().catch(console.error);
