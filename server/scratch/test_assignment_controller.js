const assert = require("assert");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Mock socket.io and email
require("../socket").getIO = () => null;
require("../services/emailService").sendEmail = async () => {};

// Load models
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");

// Load controller
const assignmentController = require("../controllers/assignmentController");

// Mock filesystem methods
const originalExistsSync = fs.existsSync;
const originalReadFileSync = fs.readFileSync;

fs.existsSync = (p) => {
  if (p.includes("uploads")) return true;
  return originalExistsSync(p);
};

fs.readFileSync = (p, options) => {
  if (p.includes("uploads")) return Buffer.from("mocked assignment content");
  return originalReadFileSync(p, options);
};

async function testViewAssignmentBase64() {
  console.log("--- Testing viewAssignmentBase64 ---");

  // Test Case 1: Assignment not found
  {
    Assignment.findById = async () => null;
    const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };

    await assignmentController.viewAssignmentBase64(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.responseData.error, "Assignment not found");
    console.log("PASS: viewAssignmentBase64 returns 404 when assignment is not found.");
  }

  // Test Case 2: No file attached
  {
    Assignment.findById = async () => ({ fileURL: "" });
    const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };

    await assignmentController.viewAssignmentBase64(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.responseData.error, "No file attached to this assignment");
    console.log("PASS: viewAssignmentBase64 returns 404 when no file is attached.");
  }

  // Test Case 3: Success returns base64 string
  {
    const expectedBase64 = Buffer.from("mocked assignment content").toString("base64");
    Assignment.findById = async () => ({
      title: "Math Homework 1",
      fileURL: "/uploads/math_hw_1.pdf",
      fileType: "application/pdf"
    });
    const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };

    await assignmentController.viewAssignmentBase64(req, res);
    assert.strictEqual(res.responseData.success, true);
    assert.strictEqual(res.responseData.title, "Math Homework 1");
    assert.strictEqual(res.responseData.fileType, "application/pdf");
    assert.strictEqual(res.responseData.base64, expectedBase64);
    console.log("PASS: viewAssignmentBase64 returns correct base64 data.");
  }
}

async function testViewSubmissionBase64() {
  console.log("--- Testing viewSubmissionBase64 ---");

  // Test Case 1: Submission not found
  {
    Submission.findById = async () => null;
    const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };

    await assignmentController.viewSubmissionBase64(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.responseData.error, "Submission not found");
    console.log("PASS: viewSubmissionBase64 returns 404 when submission is not found.");
  }

  // Test Case 2: No file attached
  {
    Submission.findById = async () => ({ fileURL: "" });
    const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };

    await assignmentController.viewSubmissionBase64(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.responseData.error, "No file attached to this submission");
    console.log("PASS: viewSubmissionBase64 returns 404 when no file is attached.");
  }

  // Test Case 3: Success returns base64 string
  {
    const expectedBase64 = Buffer.from("mocked assignment content").toString("base64");
    Submission.findById = async () => ({
      originalName: "my_solution.pdf",
      fileURL: "/uploads/sub_123.pdf"
    });
    const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.responseData = data; return this; }
    };

    await assignmentController.viewSubmissionBase64(req, res);
    assert.strictEqual(res.responseData.success, true);
    assert.strictEqual(res.responseData.title, "my_solution.pdf");
    assert.strictEqual(res.responseData.fileType, "application/pdf");
    assert.strictEqual(res.responseData.base64, expectedBase64);
    console.log("PASS: viewSubmissionBase64 returns correct base64 data.");
  }
}

async function runAll() {
  try {
    await testViewAssignmentBase64();
    await testViewSubmissionBase64();
    console.log("\nAll unit tests passed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

runAll();
