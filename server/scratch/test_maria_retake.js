const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Student = require("../models/Student");
const Adviser = require("../models/Adviser");
const RetakeRequest = require("../models/RetakeRequest");
const Result = require("../models/Result");

async function checkMaria() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle";
    await mongoose.connect(mongoUri);
    console.log("Connected to DB:", mongoUri);

    // 1. Maria User
    const mariaUser = await User.findOne({ email: /maria/i }).lean();
    console.log("Maria User:", mariaUser);

    if (!mariaUser) {
      console.log("No user matching maria found!");
      process.exit(1);
    }

    // 2. Maria Student Profile
    const mariaStudent = await Student.findOne({
      $or: [
        { universityEmail: { $regex: new RegExp(`^${mariaUser.email}$`, "i") } },
        { studentId: mariaUser.studentId || "NONE" }
      ]
    }).lean();
    console.log("Maria Student Profile:", mariaStudent);

    // 3. Advisers
    const advisers = await Adviser.find({}).lean();
    console.log("Advisers list:", advisers);

    // 4. Existing Retake Requests for Maria
    const existingRetakes = await RetakeRequest.find({
      $or: [
        { student: mariaUser._id },
        { studentId: mariaStudent?.studentId || "NONE" }
      ]
    }).lean();
    console.log("Existing Retake Requests for Maria:", existingRetakes);

    // 5. Results for Maria
    const results = await Result.find({
      $or: [
        { student: mariaUser._id },
        { studentId: mariaStudent?.studentId || "NONE" },
        { studentEmail: mariaUser.email }
      ]
    }).lean();
    console.log("Results for Maria:", results.map(r => ({ courseCode: r.courseCode, letterGrade: r.letterGrade, status: r.status, resultType: r.resultType })));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

checkMaria();
