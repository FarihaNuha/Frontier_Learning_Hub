const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema({
  studentIdNumber: {
    type: String,
    required: [true, "Student ID Number is required"],
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  courseCode: {
    type: String,
    required: [true, "Course code is required"],
  },
  level: {
    type: String,
    default: "",
  },
  term: {
    type: String,
    default: "",
  },
  session: {
    type: String,
    default: "",
  },
  department: {
    type: String,
    default: "",
  },
  attendance: {
    type: Number,
    default: 0,
  },
  quiz: {
    type: Number,
    default: 0,
  },
  assignment: {
    type: Number,
    default: 0,
  },
  presentation: {
    type: Number,
    default: 0,
  },
  totalMarks: {
    type: Number,
    default: 0,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for student assessment records per course, level, term, session, and department
assessmentSchema.index({ studentIdNumber: 1, courseCode: 1, level: 1, term: 1, session: 1, department: 1 });

const Assessment = mongoose.model("Assessment", assessmentSchema);

// Drop old legacy unique index if it still exists in MongoDB database collection
Assessment.collection.dropIndex("studentIdNumber_1_courseCode_1").catch(() => {
  // Index already dropped or doesn't exist
});

module.exports = Assessment;
