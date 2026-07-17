const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");

  const Lecture = require("./models/Lecture");
  const User = require("./models/User");

  const lectures = await Lecture.find();
  console.log("Total Lectures:", lectures.length);
  for (const l of lectures) {
    const uploader = await User.findById(l.uploadedBy);
    console.log(`Lecture Title: ${l.title} | ID: ${l._id} | UploadedBy: ${l.uploadedBy} (${uploader ? uploader.name : "N/A"}) | fileURL: ${l.fileURL}`);
  }

  process.exit(0);
}

run();
