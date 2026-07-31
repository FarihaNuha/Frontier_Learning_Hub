const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");

async function testDuplicateKeyError() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  console.log("=== TESTING DUP KEY ERROR SCENARIOS ===");

  // Scenario 1: Teacher A has teacherId "3", email "rabbi@gmail.com" in DB.
  // Teacher B has teacherId "4", email "lata@gmail.com" in DB.
  // Excel has teacherId "3", email "lata@gmail.com".
  // filter = { $or: [{ teacherId: "3" }, { email: "lata@gmail.com" }] }
  // findOneAndUpdate matches Teacher A (because teacherId is 3).
  // Then tries to set email = "lata@gmail.com".
  // BUT Teacher B already has email "lata@gmail.com"!
  // Result: E11000 duplicate key error on email_1: "lata@gmail.com"!

  const allTeachers = await Teacher.find({}).lean();
  console.log("Current Teachers in DB:", allTeachers.map(t => ({ id: t.teacherId, email: t.email, name: t.name })));

  await mongoose.disconnect();
}

testDuplicateKeyError().catch(console.error);
