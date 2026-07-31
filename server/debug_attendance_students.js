const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

const Course = require("./models/Course");
const User = require("./models/User");
const Student = require("./models/Student");

async function check() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
  console.log("Connected to DB");

  const courses = await Course.find({}).lean();
  console.log("Courses:", courses.map(c => ({ _id: c._id, displayCode: c.displayCode, name: c.name, studentsCount: c.students?.length })));

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
