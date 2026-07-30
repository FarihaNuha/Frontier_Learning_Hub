const mongoose = require("mongoose");

const courseImportSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    uppercase: true,
  },
  courseTitle: {
    type: String,
    required: true,
  },
  courseType: {
    type: String,
    required: true,
  },
  creditHours: {
    type: Number,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  program: {
    type: String,
    default: "",
  },
  level: {
    type: String,
    required: true,
  },
  term: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("CourseImport", courseImportSchema);
