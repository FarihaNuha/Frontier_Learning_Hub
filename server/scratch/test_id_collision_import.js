const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");
const { importTeachers } = require("../controllers/umsAdminController");

async function testIdCollisionImport() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  console.log("=== TESTING IMPORT WITH ID SWAPPING AND CONCURRENT IDs ===");

  const req = {
    body: {
      teachers: [
        // Assign teacherId "1" to Lata (lata@gmail.com) while Aditya currently holds "1"
        { teacherId: "1", name: "Munira Akter Lata", email: "lata@gmail.com", department: "EDTE", assignedLevelTerm: "Level 3- Term 2", assignedSession: "2022-23", assignedCourses: "Computer Networking" },
        // Assign teacherId "101" to Aditya (farihanuha356@gmail.com)
        { teacherId: "101", name: "Aditya Rajbongshi", email: "farihanuha356@gmail.com", department: "EDTE", assignedLevelTerm: "Level 4- Term 2", assignedSession: "2021-22", assignedCourses: "Android and Web Application Development" },
        // Add 2 brand new teachers
        { teacherId: "20", name: "Brand New Teacher A", email: "brandnew_a@gmail.com", department: "EDTE", assignedLevelTerm: "Level 1- Term 1", assignedSession: "2023-24", assignedCourses: "Structured Programming Language" },
        { teacherId: "21", name: "Brand New Teacher B", email: "brandnew_b@gmail.com", department: "EDTE", assignedLevelTerm: "Level 1- Term 1", assignedSession: "2023-24", assignedCourses: "Communicative English Language" },
      ]
    }
  };

  const res = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { console.log("RESPONSE:", this.statusCode || 200, data); return this; }
  };

  await importTeachers(req, res);

  const allTeachers = await Teacher.find().lean();
  console.log("All Teachers count after collision import:", allTeachers.length);
  console.log("Teachers summary:", allTeachers.map(t => ({ id: t.teacherId, email: t.email, name: t.name })));

  // Clean up scratch teachers: Free teacherId "1" from lata first!
  await Teacher.deleteMany({ email: { $in: ["brandnew_a@gmail.com", "brandnew_b@gmail.com"] } });
  await Teacher.findOneAndUpdate({ email: "lata@gmail.com" }, { teacherId: "3" });
  await Teacher.findOneAndUpdate({ email: "farihanuha356@gmail.com" }, { teacherId: "1" });

  await mongoose.disconnect();
}

testIdCollisionImport().catch(console.error);
