const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const Adviser = require("../models/Adviser");

async function checkAdvisers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
    const advisers = await Adviser.find({}).lean();
    console.log("Advisers in DB:", advisers);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
checkAdvisers();
