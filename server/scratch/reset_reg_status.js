const mongoose = require("mongoose");
require("dotenv").config();

const Registration = require("../models/Registration");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
  await Registration.updateMany(
    { studentId: "2302002" },
    { $set: { status: "Pending Adviser Approval" } }
  );
  console.log("Reset Israt registration status to Pending Adviser Approval.");
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
