const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

const User = require("./models/User");

async function check() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
  console.log("Connected to DB");

  const students = await User.find({ role: "student" }).limit(10).lean();
  console.log("Sample students:", students.map(s => ({
    _id: s._id,
    name: s.name,
    studentId: s.studentId,
    department: s.department,
    session: s.session,
    level: s.level,
    term: s.term,
    batch: s.batch,
    program: s.program
  })));

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
