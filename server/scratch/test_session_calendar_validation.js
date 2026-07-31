const mongoose = require("mongoose");
require("dotenv").config();

const { getAvailableCourses, submitRegistration } = require("../controllers/registrationController");
const User = require("../models/User");
const Student = require("../models/Student");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");

  // Asim is Session 2023-24
  const asimUser = await User.findOne({ email: "asim@gmail.com" }).lean();
  console.log("Testing calendar for Asim (Session 2023-24)...");

  const reqAsim = {
    user: { id: asimUser._id, _id: asimUser._id, email: asimUser.email, role: "student" },
    query: {}
  };

  const resAsim = {
    json: (d) => console.log("ASIM AVAILABLE COURSES RES:", { isOpen: d.calendar?.isOpen, message: d.calendar?.message }),
    status: (code) => ({ json: (err) => console.log("ASIM ERROR:", code, err) })
  };

  await getAvailableCourses(reqAsim, resAsim);

  const reqSubmit = {
    user: { id: asimUser._id, _id: asimUser._id, email: asimUser.email, role: "student" },
    body: { selectedCourseIds: ["6a6c85c577ebf8d7766a2426"] }
  };

  const resSubmit = {
    json: (d) => console.log("ASIM SUBMIT RES:", d),
    status: (code) => ({ json: (err) => console.log("ASIM SUBMIT BLOCKED:", code, err) })
  };

  await submitRegistration(reqSubmit, resSubmit);

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
