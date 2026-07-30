const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");

async function run() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  console.log("Connecting to DB...");
  await mongoose.connect(mongoUri);

  const depts = ["EDTE", "IRE", "CySE", "DSE", "SWE"];
  console.log("Testing Mongoose validation for department enum:", depts);

  for (const dept of depts) {
    const tempUser = new User({
      name: "Test Dept User",
      email: `test_${dept.toLowerCase()}@uftb.edu.bd`,
      password: "password123",
      role: "student",
      department: dept,
      isRegistered: true
    });

    const err = tempUser.validateSync();
    if (err) {
      console.error(`❌ Validation failed for department "${dept}":`, err.message);
    } else {
      console.log(`✅ Validation succeeded for department "${dept}"!`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
