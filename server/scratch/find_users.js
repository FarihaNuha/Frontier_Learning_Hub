const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const User = require("../models/User");

async function findUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
    console.log("Connected URI:", process.env.MONGO_URI);
    const users = await User.find({}).select("name email role studentId department").lean();
    console.log("All Users in DB:", users);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
findUsers();
