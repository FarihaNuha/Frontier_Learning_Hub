const assert = require("assert");
const mongoose = require("mongoose");

// Load the models so Node.js require cache gets them
const Exam = require("../models/Exam");
const ExamSubmission = require("../models/ExamSubmission");
const Course = require("../models/Course");
const User = require("../models/User");
const Notification = require("../models/Notification");

// Mock socket.io getter to avoid errors
const socketModule = require("../socket");
socketModule.getIO = () => null;

// Mock email service
const emailService = require("../services/emailService");
emailService.sendEmail = async () => {};

// Mock Course and User queries to avoid DB calls in createExam notifications
Course.findById = async () => null;
User.find = async () => [];
Notification.create = async () => {};

// Load controller
const examController = require("../controllers/examController");

async function testCreateExam() {
  console.log("--- Testing createExam Validation ---");

  // Test Case 1: Missing scheduledAt should fail validation
  {
    const req = {
      body: {
        title: "Test Exam",
        course: "Test Course",
        department: "Software",
        duration: 60,
        deadline: "2026-06-25T18:00:00.000Z",
        questions: [{ type: "mcq", question: "Q1", marks: 1, options: ["A"], correctAnswer: "A" }]
      },
      user: { uid: new mongoose.Types.ObjectId() }
    };
    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };

    await examController.createExam(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.responseData.error, "Please provide all required fields");
    console.log("PASS: createExam validation fails when scheduledAt is missing.");
  }

  // Test Case 2: Deadline <= scheduledAt should fail validation
  {
    const req = {
      body: {
        title: "Test Exam",
        course: "Test Course",
        department: "Software",
        duration: 60,
        scheduledAt: "2026-06-25T19:00:00.000Z",
        deadline: "2026-06-25T18:00:00.000Z",
        questions: [{ type: "mcq", question: "Q1", marks: 1, options: ["A"], correctAnswer: "A" }]
      },
      user: { uid: new mongoose.Types.ObjectId() }
    };
    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };

    await examController.createExam(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.responseData.error, "Deadline must be after scheduled start time");
    console.log("PASS: createExam validation fails when deadline is before scheduledAt.");
  }

  // Test Case 3: Valid exam fields and publishMode should pass and create exam
  {
    let createdExamData = null;
    Exam.create = async function(data) {
      createdExamData = data;
      return { _id: new mongoose.Types.ObjectId(), ...data };
    };

    const req = {
      body: {
        title: "Test Exam",
        course: "Test Course",
        department: "Software",
        duration: 60,
        scheduledAt: "2026-06-25T18:00:00.000Z",
        deadline: "2026-06-25T19:00:00.000Z",
        publishMode: "manual",
        questions: [{ type: "mcq", question: "Q1", marks: 1, options: ["A"], correctAnswer: "A" }]
      },
      user: { uid: new mongoose.Types.ObjectId() }
    };
    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };

    await examController.createExam(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.responseData.message, "Exam created successfully");
    assert.ok(createdExamData);
    assert.strictEqual(createdExamData.publishMode, "manual");
    assert.strictEqual(createdExamData.scheduledAt.toISOString(), new Date(req.body.scheduledAt).toISOString());
    console.log("PASS: createExam successfully creates exam with publishMode and scheduledAt.");
  }
}

async function testGetMySubmissions() {
  console.log("\n--- Testing getMySubmissions Correct Answer Sanitization ---");

  const userId = new mongoose.Types.ObjectId();

  const baseQuestions = [
    { type: "mcq", question: "1+1?", marks: 1, options: ["2"], correctAnswer: "2" },
    { type: "short", question: "Explain logic.", marks: 5, correctAnswer: "Logic answer" }
  ];

  const now = new Date();
  const pastDeadline = new Date(now.getTime() - 10000); // 10 seconds ago
  const futureDeadline = new Date(now.getTime() + 10000); // 10 seconds from now

  const mockSubmissions = [
    // Sub 1: Manual release, resultsPublished = true (should show all correct answers)
    {
      _id: new mongoose.Types.ObjectId(),
      studentId: userId,
      examId: {
        title: "Exam 1",
        deadline: pastDeadline,
        publishMode: "manual",
        resultsPublished: true,
        questions: JSON.parse(JSON.stringify(baseQuestions)),
        toObject: function() { return JSON.parse(JSON.stringify(this)); }
      },
      toObject: function() {
        return {
          _id: this._id,
          studentId: this.studentId,
          examId: this.examId.toObject()
        };
      }
    },
    // Sub 2: Auto release, resultsPublished = false, deadlinePassed = true (should show MCQ correct answers, hide short answers)
    {
      _id: new mongoose.Types.ObjectId(),
      studentId: userId,
      examId: {
        title: "Exam 2",
        deadline: pastDeadline,
        publishMode: "auto",
        resultsPublished: false,
        questions: JSON.parse(JSON.stringify(baseQuestions)),
        toObject: function() { return JSON.parse(JSON.stringify(this)); }
      },
      toObject: function() {
        return {
          _id: this._id,
          studentId: this.studentId,
          examId: this.examId.toObject()
        };
      }
    },
    // Sub 3: Auto release, resultsPublished = false, deadlinePassed = false (should hide all correct answers)
    {
      _id: new mongoose.Types.ObjectId(),
      studentId: userId,
      examId: {
        title: "Exam 3",
        deadline: futureDeadline,
        publishMode: "auto",
        resultsPublished: false,
        questions: JSON.parse(JSON.stringify(baseQuestions)),
        toObject: function() { return JSON.parse(JSON.stringify(this)); }
      },
      toObject: function() {
        return {
          _id: this._id,
          studentId: this.studentId,
          examId: this.examId.toObject()
        };
      }
    },
    // Sub 4: Manual release, resultsPublished = false, deadlinePassed = true (should hide all correct answers)
    {
      _id: new mongoose.Types.ObjectId(),
      studentId: userId,
      examId: {
        title: "Exam 4",
        deadline: pastDeadline,
        publishMode: "manual",
        resultsPublished: false,
        questions: JSON.parse(JSON.stringify(baseQuestions)),
        toObject: function() { return JSON.parse(JSON.stringify(this)); }
      },
      toObject: function() {
        return {
          _id: this._id,
          studentId: this.studentId,
          examId: this.examId.toObject()
        };
      }
    }
  ];

  // Mock Mongoose ExamSubmission.find query chain
  const mockQuery = {
    populate: function() { return this; },
    sort: function() { return this; },
    then: function(resolve, reject) {
      resolve(mockSubmissions);
    }
  };
  ExamSubmission.find = () => mockQuery;

  const req = {
    user: { uid: userId }
  };
  const res = {
    json: function(data) {
      this.responseData = data;
      return this;
    }
  };

  await examController.getMySubmissions(req, res);

  const processed = res.responseData.submissions;
  assert.strictEqual(processed.length, 4);

  // Check Sub 1 (Manual release, resultsPublished = true -> Show all correct answers)
  {
    const sub1 = processed[0];
    assert.strictEqual(sub1.isResultsPublished, true);
    assert.strictEqual(sub1.isMCQAutoPublished, false);
    assert.strictEqual(sub1.examId.questions[0].correctAnswer, "2");
    assert.strictEqual(sub1.examId.questions[1].correctAnswer, "Logic answer");
    console.log("PASS: Sub 1 (resultsPublished = true) includes all correct answers.");
  }

  // Check Sub 2 (Auto release, resultsPublished = false, deadlinePassed = true -> Show MCQ correct answers, hide short answers)
  {
    const sub2 = processed[1];
    assert.strictEqual(sub2.isResultsPublished, false);
    assert.strictEqual(sub2.isMCQAutoPublished, true);
    assert.strictEqual(sub2.examId.questions[0].correctAnswer, "2"); // MCQ
    assert.strictEqual(sub2.examId.questions[1].correctAnswer, undefined); // Short answer (should be deleted)
    console.log("PASS: Sub 2 (auto release, deadline passed) includes MCQ correct answers and hides short answers.");
  }

  // Check Sub 3 (Auto release, resultsPublished = false, deadlinePassed = false -> Hide all correct answers)
  {
    const sub3 = processed[2];
    assert.strictEqual(sub3.isResultsPublished, false);
    assert.strictEqual(sub3.isMCQAutoPublished, false);
    assert.strictEqual(sub3.examId.questions[0].correctAnswer, undefined); // MCQ (should be deleted)
    assert.strictEqual(sub3.examId.questions[1].correctAnswer, undefined); // Short answer (should be deleted)
    console.log("PASS: Sub 3 (auto release, deadline not passed) hides all correct answers.");
  }

  // Check Sub 4 (Manual release, resultsPublished = false, deadlinePassed = true -> Hide all correct answers)
  {
    const sub4 = processed[3];
    assert.strictEqual(sub4.isResultsPublished, false);
    assert.strictEqual(sub4.isMCQAutoPublished, false);
    assert.strictEqual(sub4.examId.questions[0].correctAnswer, undefined); // MCQ (should be deleted)
    assert.strictEqual(sub4.examId.questions[1].correctAnswer, undefined); // Short answer (should be deleted)
    console.log("PASS: Sub 4 (manual release, deadline passed, resultsPublished=false) hides all correct answers.");
  }
}

async function testUpdateOverallFeedback() {
  console.log("\n--- Testing updateOverallFeedback ---");

  let savedSubmission = null;
  const mockSub = {
    _id: new mongoose.Types.ObjectId(),
    feedback: "",
    save: async function() {
      savedSubmission = this;
    }
  };

  ExamSubmission.findById = async (id) => {
    if (id.toString() === mockSub._id.toString()) return mockSub;
    return null;
  };

  const req = {
    params: { id: mockSub._id.toString() },
    body: { feedback: "Great work!" }
  };
  const res = {
    json: function(data) {
      this.responseData = data;
      return this;
    }
  };

  await examController.updateOverallFeedback(req, res);
  assert.ok(savedSubmission);
  assert.strictEqual(savedSubmission.feedback, "Great work!");
  assert.strictEqual(res.responseData.message, "Overall feedback saved successfully");
  console.log("PASS: updateOverallFeedback successfully updates and saves feedback.");
}

async function runTests() {
  try {
    await testCreateExam();
    await testGetMySubmissions();
    await testUpdateOverallFeedback();
    console.log("\nAll backend controller unit tests passed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Test failure:", error);
    process.exit(1);
  }
}

runTests();
