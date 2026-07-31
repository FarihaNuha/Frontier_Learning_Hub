const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Adviser = require("../models/Adviser");
const Student = require("../models/Student");
const Registration = require("../models/Registration");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");

  const teacherEmailClean = "farihatasnim0903@gmail.com";

  const teacherDoc = await Teacher.findOne({
    $or: [
      { email: teacherEmailClean },
      { email: { $regex: new RegExp(`^${teacherEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
    ]
  }).lean();

  const searchCriteria = [
    { teacherEmail: { $regex: new RegExp(`^${teacherEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
  ];
  if (teacherDoc?.teacherId) {
    searchCriteria.push({ teacherId: String(teacherDoc.teacherId).trim() });
  }
  if (teacherDoc?.name) {
    searchCriteria.push({ teacherName: { $regex: new RegExp(teacherDoc.name.trim(), "i") } });
  }

  const adviserRecords = await Adviser.find({ $or: searchCriteria }).lean();
  console.log("adviserRecords matched:", adviserRecords.length);

  const regOrCriteria = [
    { adviserEmail: { $regex: new RegExp(`^${teacherEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
  ];

  const pendingRegs = await Registration.find({
    status: "Pending Adviser Approval",
    $or: regOrCriteria,
  }).populate("user", "name email");

  console.log("pendingRegs found:", pendingRegs.length, JSON.stringify(pendingRegs, null, 2));

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
