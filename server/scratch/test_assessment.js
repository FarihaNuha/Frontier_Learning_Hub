const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");

async function testAssessmentModel() {
  console.log("Testing Assessment model validation...");

  // Test Case 1: Missing studentIdNumber should fail validation
  try {
    const assessmentNoStudentId = new Assessment({
      courseCode: "Eng 205",
      attendance: 10,
      quiz: 15,
      assignment: 15,
      presentation: 8,
      totalMarks: 48,
      uploadedBy: new mongoose.Types.ObjectId()
    });

    await assessmentNoStudentId.validate();
    console.error("FAIL: Assessment without studentIdNumber passed validation!");
    process.exit(1);
  } catch (err) {
    if (err.errors && err.errors.studentIdNumber) {
      console.log("PASS: Assessment without studentIdNumber correctly failed validation with error:", err.errors.studentIdNumber.message);
    } else {
      console.error("FAIL: Assessment validation failed but not for studentIdNumber:", err);
      process.exit(1);
    }
  }

  // Test Case 2: Missing courseCode should fail validation
  try {
    const assessmentNoCourseCode = new Assessment({
      studentIdNumber: "2202001",
      attendance: 10,
      quiz: 15,
      assignment: 15,
      presentation: 8,
      totalMarks: 48,
      uploadedBy: new mongoose.Types.ObjectId()
    });

    await assessmentNoCourseCode.validate();
    console.error("FAIL: Assessment without courseCode passed validation!");
    process.exit(1);
  } catch (err) {
    if (err.errors && err.errors.courseCode) {
      console.log("PASS: Assessment without courseCode correctly failed validation with error:", err.errors.courseCode.message);
    } else {
      console.error("FAIL: Assessment validation failed but not for courseCode:", err);
      process.exit(1);
    }
  }

  // Test Case 3: Missing uploadedBy should fail validation
  try {
    const assessmentNoUploadedBy = new Assessment({
      studentIdNumber: "2202001",
      courseCode: "Eng 205",
      attendance: 10,
      quiz: 15,
      assignment: 15,
      presentation: 8,
      totalMarks: 48
    });

    await assessmentNoUploadedBy.validate();
    console.error("FAIL: Assessment without uploadedBy passed validation!");
    process.exit(1);
  } catch (err) {
    if (err.errors && err.errors.uploadedBy) {
      console.log("PASS: Assessment without uploadedBy correctly failed validation with error:", err.errors.uploadedBy.message);
    } else {
      console.error("FAIL: Assessment validation failed but not for uploadedBy:", err);
      process.exit(1);
    }
  }

  // Test Case 4: Valid assessment should pass validation
  try {
    const validAssessment = new Assessment({
      studentIdNumber: "2202001",
      courseCode: "Eng 205",
      attendance: 10,
      quiz: 15,
      assignment: 15,
      presentation: 8,
      totalMarks: 48,
      uploadedBy: new mongoose.Types.ObjectId()
    });

    await validAssessment.validate();
    console.log("PASS: Valid Assessment model passed validation successfully.");
  } catch (err) {
    console.error("FAIL: Valid Assessment model failed validation:", err);
    process.exit(1);
  }

  console.log("All Assessment model tests passed successfully!");
  process.exit(0);
}

testAssessmentModel();
