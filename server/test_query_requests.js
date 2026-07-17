const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");

  const JoinRequest = require("./models/JoinRequest");
  const Course = require("./models/Course");
  const User = require("./models/User");

  // Delware Hossain
  const teacher = await User.findOne({ email: "nazmunnahar0127@gmail.com" });
  if (!teacher) {
    console.log("Teacher not found!");
    process.exit(0);
  }

  console.log("Teacher ID:", teacher._id);

  const courses = await Course.find({ teacher: teacher._id });
  console.log("Courses taught by teacher:", courses.map(c => `${c.name} (${c.displayCode}) [ID: ${c._id}]`));
  const courseIds = courses.map((c) => c._id);

  const requests = await JoinRequest.find({
    course: { $in: courseIds },
    status: "pending"
  });

  console.log("Requests count:", requests.length);
  for (const r of requests) {
    console.log(`Request Course ID: ${r.course} | Student ID: ${r.student} | Status: ${r.status}`);
  }

  // Check all requests in db
  const allRequests = await JoinRequest.find();
  console.log("All requests in db:", allRequests.map(r => `Course ID: ${r.course} | Status: ${r.status}`));

  process.exit(0);
}

run();
