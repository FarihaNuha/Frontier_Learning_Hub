const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Student = require("../models/Student");
const Adviser = require("../models/Adviser");
const RetakeRequest = require("../models/RetakeRequest");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const academicCtrl = require("../controllers/academicController");
const courseCtrl = require("../controllers/courseController");

async function testFullFlow() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/uftb_moodle");
    console.log("Connected to DB");

    // 1. Find Maria
    let mariaUser = await User.findOne({ name: /maria/i });
    if (!mariaUser) {
      mariaUser = await User.findOne({ email: /maria/i });
    }
    console.log("Maria User ID:", mariaUser._id);

    // 2. Find Maria's Retake Request for CSE 113
    let retake = await RetakeRequest.findOne({ student: mariaUser._id, courseCode: "CSE 113" });
    if (!retake) {
      console.log("No retake request found for Maria CSE 113, creating approved test retake...");
      retake = await RetakeRequest.create({
        student: mariaUser._id,
        studentId: "2202030",
        studentName: "Maria",
        department: "EDTE",
        courseCode: "CSE 113",
        courseTitle: "Data Structure and Algorithms",
        creditHours: 3,
        previousGrade: "F",
        previousGradePoint: 0.0,
        targetSession: "2023-24",
        level: "Level 1",
        term: "Term 2",
        adviserEmail: "farihanuha356@gmail.com",
        status: "Approved",
        paymentStatus: "Unpaid",
        amount: 300,
      });
    } else {
      retake.status = "Approved";
      retake.paymentStatus = "Unpaid";
      await retake.save();
    }
    console.log("Retake Record BEFORE Payment:", { status: retake.status, paymentStatus: retake.paymentStatus, amount: retake.amount });

    // 3. Test payRetakeFee controller
    const reqPay = {
      params: { id: retake._id.toString() },
      user: {
        _id: mariaUser._id,
        id: mariaUser._id.toString(),
        uid: mariaUser._id.toString(),
        email: mariaUser.email,
        role: "student",
        name: mariaUser.name,
        department: mariaUser.department,
        studentId: "2202030"
      },
      ip: "127.0.0.1",
      headers: {}
    };

    const resPay = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log("PAYMENT RESPONSE Code:", this.statusCode, "Data:", data);
        return this;
      }
    };

    await academicCtrl.payRetakeFee(reqPay, resPay);

    // 4. Verify Retake record in DB
    const updatedRetake = await RetakeRequest.findById(retake._id);
    console.log("Retake Record AFTER Payment:", { status: updatedRetake.status, paymentStatus: updatedRetake.paymentStatus, transactionId: updatedRetake.transactionId });

    // 5. Verify LMS Course card in target session 2023-24
    const targetCourse = await Course.findOne({ displayCode: "CSE 113", session: "2023-24" });
    console.log("Target Session 2023-24 Course Card:", {
      _id: targetCourse?._id,
      displayCode: targetCourse?.displayCode,
      session: targetCourse?.session,
      studentEnrolled: targetCourse?.students?.some(s => s.toString() === mariaUser._id.toString())
    });

    // 6. Test getMyCourses for Maria
    const reqCourses = {
      user: reqPay.user,
      ip: "127.0.0.1",
      headers: {}
    };
    const resCourses = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        const arr = data.courses || data;
        console.log("getMyCourses returned course cards count:", arr?.length);
        console.log("Course Cards:", arr?.map ? arr.map(c => ({ name: c.name, displayCode: c.displayCode, session: c.session, level: c.level, term: c.term })) : data);
        return this;
      }
    };

    await courseCtrl.getMyCourses(reqCourses, resCourses);

  } catch (err) {
    console.error("FLOW TEST ERROR:", err);
  } finally {
    await mongoose.disconnect();
  }
}

testFullFlow();
