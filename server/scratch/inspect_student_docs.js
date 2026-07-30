const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Student = require("../models/Student");

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  console.log("Connecting to Atlas...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB Atlas successfully!");

  const students = await Student.find().lean();
  console.log("Total students in DB:", students.length);
  students.forEach((s) => {
    console.log(`ID: "${s.studentId}", Name: "${s.name}", L: ${s.currentLevel}, T: ${s.currentTerm}`);
  });

  const updates = [
    { studentId: "2202001", currentLevel: 3, currentTerm: 2 },
    { studentId: "2202002", currentLevel: 3, currentTerm: 2 },
    { studentId: "2202003", currentLevel: 3, currentTerm: 2 },
    { studentId: "2202006", currentLevel: 3, currentTerm: 2 },
    { studentId: "2202022", currentLevel: 3, currentTerm: 2 },
    { studentId: "2202030", currentLevel: 3, currentTerm: 2 },
    { studentId: "2302001", currentLevel: 2, currentTerm: 2 },
    { studentId: "2302002", currentLevel: 2, currentTerm: 2 },
    { studentId: "2301003", currentLevel: 2, currentTerm: 2 },
    { studentId: "2401001", currentLevel: 2, currentTerm: 1 },
    { studentId: "2403002", currentLevel: 2, currentTerm: 1 },
    { studentId: "2404003", currentLevel: 2, currentTerm: 1 },
  ];

  for (const u of updates) {
    const res = await Student.updateOne(
      { studentId: u.studentId },
      { currentLevel: u.currentLevel, currentTerm: u.currentTerm }
    );
    console.log(`Updated "${u.studentId}": Level ${u.currentLevel} Term ${u.currentTerm} (matched: ${res.matchedCount}, modified: ${res.modifiedCount})`);
  }

  await mongoose.disconnect();
  console.log("Done updating MongoDB Atlas!");
}

run();
