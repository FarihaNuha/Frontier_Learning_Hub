const mongoose = require("mongoose");
require("dotenv").config();

const Teacher = require("../models/Teacher");
const Adviser = require("../models/Adviser");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
  console.log("Connected to MongoDB");

  const teachers = await Teacher.find({}).lean();
  console.log("Found teachers:", teachers.length);

  for (const t of teachers) {
    if (!t.email) continue;
    const cleanEmail = t.email.toLowerCase().trim();

    const updated = await Adviser.updateMany(
      {
        $or: [
          { teacherId: t.teacherId },
          { teacherName: { $regex: new RegExp(t.name.trim(), "i") } },
          { teacherEmail: cleanEmail }
        ]
      },
      {
        $set: {
          teacherEmail: cleanEmail,
          teacherId: t.teacherId,
          teacherName: t.name
        }
      }
    );
    console.log(`Synced advisers for ${t.name} (${t.email}): matched ${updated.matchedCount}, modified ${updated.modifiedCount}`);
  }

  // Ensure Adviser entry for 2023-24 / 6th batch for farihatasnim0903@gmail.com
  const farihaTch = await Teacher.findOne({ email: "farihatasnim0903@gmail.com" }).lean();
  if (farihaTch) {
    await Adviser.findOneAndUpdate(
      { session: "2023-24", assignedBatch: "6th" },
      {
        teacherId: farihaTch.teacherId,
        teacherName: farihaTch.name,
        teacherEmail: farihaTch.email,
        session: "2023-24",
        assignedBatch: "6th",
        department: farihaTch.department || "EDTE",
        program: farihaTch.program || "BSc. Eng in EDTE"
      },
      { upsert: true, new: true }
    );
    console.log("Ensured Adviser entry for 2023-24 / 6th batch -> farihatasnim0903@gmail.com");
  }

  const allAdv = await Adviser.find({}).lean();
  console.log("UPDATED ADVISERS LIST:", JSON.stringify(allAdv, null, 2));

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
