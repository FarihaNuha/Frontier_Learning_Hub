const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Student = require("../models/Student");

async function test() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  console.log("=== CHECKING STUDENT STATUS ===");
  const bulbul = await Student.findOne({ universityEmail: "bulbul@gmail.com" });
  const asim = await Student.findOne({ universityEmail: "asim@gmail.com" });
  console.log("Bulbul (Not signed up/logged in):", bulbul?.accountStatus);
  console.log("Asim (Signed up/logged in):", asim?.accountStatus);

  await mongoose.disconnect();
}

test().catch(console.error);
