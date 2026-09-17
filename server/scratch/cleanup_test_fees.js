const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const RetakeRequest = require("../models/RetakeRequest");

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
    await RetakeRequest.deleteMany({ courseCode: { $in: ["TEST 301", "TEST 101"] } });
    console.log("Test retake records cleaned up.");
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
cleanup();
