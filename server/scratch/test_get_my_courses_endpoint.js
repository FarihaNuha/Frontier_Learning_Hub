const mongoose = require("mongoose");
require("dotenv").config();

const { getMyCourses } = require("../controllers/courseController");
const User = require("../models/User");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");

  const asimUser = await User.findOne({ email: "asim@gmail.com" }).lean();
  console.log("Found asimUser:", asimUser?._id, asimUser?.email, asimUser?.role);

  const req = {
    user: {
      id: asimUser._id.toString(),
      _id: asimUser._id,
      email: asimUser.email,
      role: asimUser.role
    }
  };

  const res = {
    json: (data) => {
      console.log("RESULT COURSES COUNT:", data.courses?.length);
      console.log("COURSES LIST:", data.courses?.map(c => ({
        id: c._id,
        name: c.name,
        displayCode: c.displayCode,
        session: c.session,
        level: c.level,
        term: c.term
      })));
    },
    status: (code) => ({ json: (err) => console.error("ERROR STATUS:", code, err) })
  };

  await getMyCourses(req, res);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
