const mongoose = require("mongoose");
const Exam = require("../models/Exam");

async function testModel() {
  console.log("Testing Exam model validation...");

  // Test Case 1: Missing scheduledAt should fail validation
  try {
    const examNoScheduledAt = new Exam({
      title: "Math Final",
      course: "Math 101",
      department: "Software",
      duration: 60,
      deadline: new Date(),
      createdBy: new mongoose.Types.ObjectId(),
      questions: [{ type: "mcq", question: "1+1?", marks: 1, options: ["2"], correctAnswer: "2" }]
    });

    await examNoScheduledAt.validate();
    console.error("FAIL: Exam without scheduledAt passed validation!");
    process.exit(1);
  } catch (err) {
    if (err.errors && err.errors.scheduledAt) {
      console.log("PASS: Exam without scheduledAt correctly failed validation with error:", err.errors.scheduledAt.message);
    } else {
      console.error("FAIL: Exam validation failed but not for scheduledAt:", err);
      process.exit(1);
    }
  }

  // Test Case 2: Valid exam defaults publishMode to "auto"
  try {
    const examDefaultPublish = new Exam({
      title: "Math Final",
      course: "Math 101",
      department: "Software",
      duration: 60,
      scheduledAt: new Date(),
      deadline: new Date(),
      createdBy: new mongoose.Types.ObjectId(),
      questions: [{ type: "mcq", question: "1+1?", marks: 1, options: ["2"], correctAnswer: "2" }]
    });

    await examDefaultPublish.validate();
    if (examDefaultPublish.publishMode === "auto") {
      console.log("PASS: Exam publishMode defaulted to 'auto'.");
    } else {
      console.error("FAIL: Exam publishMode default is not 'auto', got:", examDefaultPublish.publishMode);
      process.exit(1);
    }
  } catch (err) {
    console.error("FAIL: Valid exam defaulted publishMode failed validation:", err);
    process.exit(1);
  }

  // Test Case 3: Invalid publishMode should fail validation
  try {
    const examInvalidPublish = new Exam({
      title: "Math Final",
      course: "Math 101",
      department: "Software",
      duration: 60,
      scheduledAt: new Date(),
      deadline: new Date(),
      publishMode: "invalid_mode",
      createdBy: new mongoose.Types.ObjectId(),
      questions: [{ type: "mcq", question: "1+1?", marks: 1, options: ["2"], correctAnswer: "2" }]
    });

    await examInvalidPublish.validate();
    console.error("FAIL: Exam with invalid publishMode passed validation!");
    process.exit(1);
  } catch (err) {
    if (err.errors && err.errors.publishMode) {
      console.log("PASS: Exam with invalid publishMode correctly failed validation with error:", err.errors.publishMode.message);
    } else {
      console.error("FAIL: Exam validation failed but not for publishMode:", err);
      process.exit(1);
    }
  }

  // Test Case 4: Explicit publishMode manual should pass
  try {
    const examManualPublish = new Exam({
      title: "Math Final",
      course: "Math 101",
      department: "Software",
      duration: 60,
      scheduledAt: new Date(),
      deadline: new Date(),
      publishMode: "manual",
      createdBy: new mongoose.Types.ObjectId(),
      questions: [{ type: "mcq", question: "1+1?", marks: 1, options: ["2"], correctAnswer: "2" }]
    });

    await examManualPublish.validate();
    if (examManualPublish.publishMode === "manual") {
      console.log("PASS: Exam with explicit 'manual' publishMode passed validation.");
    } else {
      console.error("FAIL: Exam publishMode is not 'manual', got:", examManualPublish.publishMode);
      process.exit(1);
    }
  } catch (err) {
    console.error("FAIL: Exam with explicit 'manual' publishMode failed validation:", err);
    process.exit(1);
  }

  console.log("All tests passed successfully!");
  process.exit(0);
}

testModel();
