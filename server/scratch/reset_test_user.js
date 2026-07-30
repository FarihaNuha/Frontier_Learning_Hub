const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function resetPrachurjo() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  const User = require("../models/User");
  const Student = require("../models/Student");

  await User.deleteOne({ email: "prachurjo@gmail.com" });
  await Student.updateOne({ universityEmail: "prachurjo@gmail.com" }, { accountStatus: "inactive" });

  console.log("Reset prachurjo@gmail.com for fresh browser sign up test.");
  await mongoose.disconnect();
}

resetPrachurjo();
