const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Assessment = require("../models/Assessment");

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await Assessment.find({}).lean();
  console.log("Verified assessment records in Atlas:");
  docs.forEach((d) => {
    console.log(`- ID: ${d.studentIdNumber} | Course: "${d.courseCode}" | Session: "${d.session}" | Level: "${d.level}" | Term: "${d.term}" | Dept: "${d.department}"`);
  });
  await mongoose.disconnect();
}

verify().catch(console.error);
