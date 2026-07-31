const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");
const { importTeachers } = require("../controllers/umsAdminController");

async function testFullImportTeachers() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  console.log("=== TESTING FULL IMPORT TEACHERS CONTROLLER ===");

  const req = {
    body: {
      teachers: [
        { teacherId: "3", name: "Munira Akter Lata", email: "lata@gmail.com", department: "EDTE", assignedLevelTerm: "Level 3- Term 2", assignedSession: "2022-23", assignedCourses: "Computer Networking" },
        { teacherId: "3", name: "Munira Akter Lata", email: "lata@gmail.com", department: "EDTE", assignedLevelTerm: "Level 3- Term 2", assignedSession: "2022-23", assignedCourses: "Computer Networking Sessional" },
        { teacherId: "10", name: "New Teacher One", email: "newteacher1@gmail.com", department: "EDTE", assignedLevelTerm: "Level 1- Term 1", assignedSession: "2023-24", assignedCourses: "Structured Programming Language" },
        { teacherId: "11", name: "New Teacher Two", email: "newteacher2@gmail.com", department: "EDTE", assignedLevelTerm: "Level 1- Term 1", assignedSession: "2023-24", assignedCourses: "Introduction to Education" },
      ]
    }
  };

  const res = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { console.log("RESPONSE:", this.statusCode || 200, data); return this; }
  };

  await importTeachers(req, res);

  const allTeachers = await Teacher.find().lean();
  console.log("All Teachers after import count:", allTeachers.length);
  console.log("Teacher summary:", allTeachers.map(t => ({ id: t.teacherId, email: t.email, name: t.name, courses: t.assignedCourses.length })));

  await mongoose.disconnect();
}

testFullImportTeachers().catch(console.error);
