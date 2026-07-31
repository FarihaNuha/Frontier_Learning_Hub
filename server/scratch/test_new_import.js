const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");
const User = require("../models/User");

async function testNewImportLogic() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  console.log("=== TESTING NEW TEACHER IMPORT LOGIC ===");

  const tData = {
    teacherId: "3", // Changing teacherId from 999 to 3 for lata@gmail.com
    name: "Munira Akter Lata",
    email: "lata@gmail.com",
    department: "EDTE",
    program: "BSc. Eng in EDTE",
    assignedLevelTerm: "Level 3- Term 2",
    assignedSession: "2022-23",
    assignedCourses: [
      { courseName: "Computer Networking", levelTerm: "Level 3- Term 2", session: "2022-23" },
      { courseName: "Computer Networking Sessional", levelTerm: "Level 3- Term 2", session: "2022-23" }
    ],
    adviserSession: "2022-23"
  };

  const targetEmail = tData.email.toLowerCase().trim();
  const targetTeacherId = tData.teacherId;

  let existingTeacher = null;
  if (targetEmail) {
    existingTeacher = await Teacher.findOne({ email: targetEmail });
  }
  if (!existingTeacher && targetTeacherId) {
    existingTeacher = await Teacher.findOne({ teacherId: targetTeacherId });
  }

  let savedTeacher = null;
  if (existingTeacher) {
    console.log("Found existing teacher doc by email:", existingTeacher._id, existingTeacher.teacherId);
    savedTeacher = await Teacher.findByIdAndUpdate(
      existingTeacher._id,
      {
        teacherId: targetTeacherId,
        name: tData.name,
        email: targetEmail,
        department: tData.department,
        program: tData.program,
        assignedLevelTerm: tData.assignedLevelTerm,
        assignedSession: tData.assignedSession,
        assignedCourses: tData.assignedCourses,
        adviserSession: tData.adviserSession,
      },
      { returnDocument: "after" }
    );
  } else {
    console.log("Creating new teacher doc...");
    savedTeacher = await Teacher.create(tData);
  }

  console.log("Saved Teacher Doc:", savedTeacher.teacherId, savedTeacher.email, savedTeacher.name);

  await mongoose.disconnect();
}

testNewImportLogic().catch(console.error);
