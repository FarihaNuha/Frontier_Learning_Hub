const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");

  // 1. Update User records with passwords to isRegistered: true
  const usersWithPass = await User.find({ password: { $exists: true, $ne: "" } });
  for (const u of usersWithPass) {
    u.isRegistered = true;
    await u.save();
    console.log("Set isRegistered: true for user:", u.email);

    // Sync Teacher status
    if (u.role === "teacher") {
      await Teacher.updateMany(
        { email: { $regex: new RegExp(`^${u.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
        { $set: { isActive: true, accountStatus: "active" } }
      );
    }
    // Sync Student status
    if (u.role === "student") {
      await Student.updateMany(
        { universityEmail: { $regex: new RegExp(`^${u.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
        { $set: { accountStatus: "active" } }
      );
    }
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
