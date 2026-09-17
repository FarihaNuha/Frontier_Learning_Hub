const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const academicCtrl = require("../controllers/academicController");
const User = require("../models/User");

async function testFees() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
    const mariaUser = await User.findOne({ name: /maria/i });

    // Test 3 credit theory course (CSE 113)
    const req3 = {
      user: mariaUser,
      body: {
        courseCode: "TEST 301",
        courseTitle: "Theory Course",
        creditHours: 3,
        previousGrade: "F",
        previousGradePoint: 0.0,
        targetSession: "2023-24"
      },
      ip: "127.0.0.1",
      headers: {}
    };

    let fee3 = null;
    const res3 = {
      status: function(code) { return this; },
      json: function(data) {
        fee3 = data.retake?.amount;
        console.log("3 Credit Course Fee Calculated:", fee3, "BDT");
        return this;
      }
    };
    await academicCtrl.submitRetakeRequest(req3, res3);

    // Test 1 credit sessional course (TEST 101)
    const req1 = {
      user: mariaUser,
      body: {
        courseCode: "TEST 101",
        courseTitle: "Sessional Lab Course",
        creditHours: 1,
        previousGrade: "F",
        previousGradePoint: 0.0,
        targetSession: "2023-24"
      },
      ip: "127.0.0.1",
      headers: {}
    };

    let fee1 = null;
    const res1 = {
      status: function(code) { return this; },
      json: function(data) {
        fee1 = data.retake?.amount;
        console.log("1 Credit Sessional Course Fee Calculated:", fee1, "BDT");
        return this;
      }
    };
    await academicCtrl.submitRetakeRequest(req1, res1);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

testFees();
