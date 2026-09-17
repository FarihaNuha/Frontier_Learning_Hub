const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Student = require("../models/Student");
const Adviser = require("../models/Adviser");
const RetakeRequest = require("../models/RetakeRequest");
const Notification = require("../models/Notification");
const academicCtrl = require("../controllers/academicController");

async function testSubmit() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");

    // Find Maria
    let mariaUser = await User.findOne({ email: /maria/i });
    if (!mariaUser) {
      mariaUser = await User.findOne({ name: /maria/i });
    }
    console.log("Maria User Found:", mariaUser);

    const req = {
      user: mariaUser,
      body: {
        courseCode: "CSE 113",
        courseTitle: "Data Structure and Algorithms",
        creditHours: 3,
        previousGrade: "F",
        previousGradePoint: 0.0,
        targetSession: "2023-24"
      },
      ip: "127.0.0.1",
      headers: {}
    };

    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log("RESPONSE Code:", this.statusCode, "Data:", data);
        return this;
      }
    };

    await academicCtrl.submitRetakeRequest(req, res);

  } catch (err) {
    console.error("CATCH ERROR:", err);
  } finally {
    await mongoose.disconnect();
  }
}

testSubmit();
