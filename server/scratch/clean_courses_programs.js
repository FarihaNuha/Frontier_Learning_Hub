const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Course = require("../models/Course");
const Student = require("../models/Student");

const mapProgramToShortForm = (raw) => {
  if (!raw) return "B.Sc. in EDTE";
  const str = String(raw).trim();

  const isMsc = /m\.?sc/i.test(str);
  const prefix = isMsc ? "M.Sc. in" : "B.Sc. in";

  if (/EDTE|Educational Technology/i.test(str)) return `${prefix} EDTE`;
  if (/IRE|Internet of Things|Robotics/i.test(str)) return `${prefix} IRE`;
  if (/CySE|Cyber Security/i.test(str)) return `${prefix} CySE`;
  if (/DSE|Data Science/i.test(str)) return `${prefix} DSE`;
  if (/SWE|Software Engineering/i.test(str)) return `${prefix} SWE`;

  return str;
};

async function cleanAtlasPrograms() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");

  // 1. Clean Course documents
  const courses = await Course.find({}).lean();
  let courseCount = 0;
  for (const c of courses) {
    const cleanP = mapProgramToShortForm(c.program);
    const deptMatch = (c.department || "").match(/EDTE|IRE|CySE|DSE|SWE/i);
    const cleanDept = deptMatch ? deptMatch[0].toUpperCase() : (c.department || "EDTE");

    if (c.program !== cleanP || c.department !== cleanDept) {
      await Course.updateOne({ _id: c._id }, { $set: { program: cleanP, department: cleanDept } });
      courseCount++;
    }
  }
  console.log(`✅ Cleaned ${courseCount} Course records in Atlas.`);

  // 2. Clean Student documents
  const students = await Student.find({}).lean();
  let studentCount = 0;
  for (const s of students) {
    const cleanP = mapProgramToShortForm(s.program);
    const deptMatch = (s.department || "").match(/EDTE|IRE|CySE|DSE|SWE/i);
    const cleanDept = deptMatch ? deptMatch[0].toUpperCase() : (s.department || "EDTE");

    if (s.program !== cleanP || s.department !== cleanDept) {
      await Student.updateOne({ _id: s._id }, { $set: { program: cleanP, department: cleanDept } });
      studentCount++;
    }
  }
  console.log(`✅ Cleaned ${studentCount} Student records in Atlas.`);

  await mongoose.disconnect();
}

cleanAtlasPrograms().catch(console.error);
