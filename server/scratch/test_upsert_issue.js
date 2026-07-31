const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");

async function testUpsertIssue() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle";
  await mongoose.connect(mongoUri);

  console.log("=== TESTING TEACHER UPSERT ===");

  // Find teacher lata@gmail.com
  const existing = await Teacher.findOne({ email: "lata@gmail.com" });
  console.log("Existing lata doc:", existing?.teacherId, existing?.email, existing?._id);

  // Try findOneAndUpdate with $or and updated teacherId
  try {
    const filter = { $or: [{ teacherId: "999" }, { email: "lata@gmail.com" }] };
    console.log("Trying findOneAndUpdate with filter:", filter);
    const res = await Teacher.findOneAndUpdate(
      filter,
      { teacherId: "999", name: "Munira Akter Lata", email: "lata@gmail.com", department: "EDTE" },
      { upsert: true, new: true }
    );
    console.log("Result:", res?.teacherId, res?.email);
  } catch (err) {
    console.error("EXPECTED ERROR CAUGHT:", err.message);
  }

  await mongoose.disconnect();
}

testUpsertIssue().catch(console.error);
