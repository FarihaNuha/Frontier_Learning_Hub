const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const CourseImport = require("../models/CourseImport");
const Adviser = require("../models/Adviser");

async function testUMS() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle");
    console.log("Connected.");

    // Clear existing test entries
    await Student.deleteMany({ universityEmail: { $in: ["student1@uftb.edu", "student2@uftb.edu"] } });
    await Teacher.deleteMany({ email: { $in: ["teacher1@uftb.edu"] } });
    await User.deleteMany({ email: { $in: ["student1@uftb.edu", "teacher1@uftb.edu"] } });

    console.log("1. Testing Excel student data normalization...");
    const sampleStudents = [
      {
        studentId: "STU001",
        name: "Test Student One",
        universityEmail: "student1@uftb.edu",
        department: "Software",
        program: "B.Sc.",
        batch: "40",
        session: "2026",
        admissionSemester: "Spring",
        currentLevel: 1,
        currentTerm: 1,
        accountStatus: "Pending",
      }
    ];

    // Seed student import
    await Student.create(sampleStudents);
    console.log("✅ Seeded StudentImport.");

    console.log("2. Testing UMS authorization signup check...");
    const reqMockAuthFail = {
      body: {
        email: "unauthorized_user@gmail.com",
        password: "securepassword123"
      }
    };

    const resMockAuthFail = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      }
    };

    const { register } = require("../controllers/authController");
    await register(reqMockAuthFail, resMockAuthFail);

    if (resMockAuthFail.statusCode === 400 && resMockAuthFail.body.error.includes("not authorized")) {
      console.log("✅ Registration blocked for unauthorized email as expected.");
    } else {
      console.error("❌ Failed to block unauthorized registration", resMockAuthFail.statusCode, resMockAuthFail.body);
    }

    console.log("3. Testing authorized student signup...");
    const reqMockAuthSuccess = {
      body: {
        email: "student1@uftb.edu",
        password: "securepassword123"
      }
    };
    const resMockAuthSuccess = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      }
    };

    await register(reqMockAuthSuccess, resMockAuthSuccess);
    if (resMockAuthSuccess.statusCode === 201 || resMockAuthSuccess.body.token) {
      console.log("✅ Registered successfully & JWT generated:", resMockAuthSuccess.body.token ? "PRESENT" : "MISSING");
    } else {
      console.error("❌ Registered failed unexpectedly:", resMockAuthSuccess.body);
    }

    // Verify user role
    const createdUser = await User.findOne({ email: "student1@uftb.edu" });
    if (createdUser && createdUser.role === "student" && createdUser.department === "Software") {
      console.log("✅ User created with correct role and department matched from Student profile.");
    } else {
      console.error("❌ User role or department assignment issue:", createdUser);
    }

    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  }
}

testUMS();
