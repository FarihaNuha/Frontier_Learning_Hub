const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// Config
const MONGO_URI = "mongodb://localhost:27017/uftb_moodle" || "mongodb://127.0.0.1:27017/uftb_moodle";
const JWT_SECRET = "your_super_secret_key_change_this";

async function test() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected!");

    // Get a user (student or teacher)
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
    const user = await User.findOne();
    if (!user) {
      console.error("No user found in database!");
      return;
    }
    console.log(`Found user: ${user.email} (Role: ${user.role})`);

    // Generate token
    const token = jwt.sign(
      { uid: user._id, role: user.role, department: user.department },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log("Generated Token:", token);

    // Get a lecture
    const Lecture = mongoose.model("Lecture", new mongoose.Schema({}, { strict: false }), "lectures");
    const lecture = await Lecture.findOne();
    if (!lecture) {
      console.error("No lectures found in database!");
      return;
    }
    console.log(`Found lecture: ${lecture.title} (ID: ${lecture._id})`);

    // Request the view endpoint
    const url = `http://localhost:5000/api/lectures/view/${lecture._id}?token=${token}`;
    console.log("Requesting URL:", url);

    const res = await axios.get(url, {
      validateStatus: () => true, // Don't throw on error status codes
      responseType: 'arraybuffer'
    });

    console.log("\n=== Response ===");
    console.log("Status:", res.status);
    console.log("Headers:", res.headers);
    console.log("Data size (bytes):", res.data.length);

  } catch (error) {
    console.error("Test error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

test();
