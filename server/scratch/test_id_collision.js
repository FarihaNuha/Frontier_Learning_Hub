const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");

async function testTeacherIdCollision() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  console.log("=== TESTING TEACHER ID COLLISION RESOLUTION ===");

  const teachersInDb = await Teacher.find().lean();
  console.log("Teachers in DB:", teachersInDb.map(t => ({ id: t.teacherId, email: t.email, name: t.name })));

  // Simulate Excel data where Teacher B (lata@gmail.com) is given teacherId "1"
  // But teacherId "1" is currently held by Aditya (farihanuha356@gmail.com)
  const targetEmail = "lata@gmail.com";
  let targetTeacherId = "1";

  // Check if existing doc exists by email
  let existingTeacher = await Teacher.findOne({ email: targetEmail });
  console.log("Found existing by email:", existingTeacher?.name, existingTeacher?.teacherId);

  if (existingTeacher) {
    if (targetTeacherId && existingTeacher.teacherId !== targetTeacherId) {
      // Check if targetTeacherId belongs to someone else
      const conflict = await Teacher.findOne({ teacherId: targetTeacherId });
      if (conflict && conflict._id.toString() !== existingTeacher._id.toString()) {
        console.log(`Conflict found! teacherId "${targetTeacherId}" is currently used by ${conflict.name} (${conflict.email}). Re-assigning conflict teacherId...`);
        // Disambiguate conflict teacherId to prevent E11000 duplicate key error
        await Teacher.findByIdAndUpdate(conflict._id, { teacherId: `${conflict.teacherId}_old_${Date.now().toString().slice(-4)}` });
      }
    }

    const updated = await Teacher.findByIdAndUpdate(
      existingTeacher._id,
      { teacherId: targetTeacherId, name: "Munira Akter Lata" },
      { returnDocument: "after" }
    );
    console.log("Successfully updated Lata with teacherId '1':", updated.teacherId, updated.email);
  }

  await mongoose.disconnect();
}

testTeacherIdCollision().catch(console.error);
