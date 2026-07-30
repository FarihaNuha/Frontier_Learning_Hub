const mongoose = require("mongoose");

const cgpaRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  studentId: {
    type: String,
    required: true,
    uppercase: true,
  },
  session: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    required: true,
  },
  term: {
    type: String,
    required: true,
  },
  semesterGPA: {
    type: Number,
    required: true,
  },
  semesterCredits: {
    type: Number,
    required: true,
  },
  cumulativeCGPA: {
    type: Number,
    required: true,
  },
  totalCumulativeCredits: {
    type: Number,
    required: true,
  },
  calculatedAt: {
    type: Date,
    default: Date.now,
  },
});

cgpaRecordSchema.index({ studentId: 1, level: 1, term: 1 });

module.exports = mongoose.model("CGPARecord", cgpaRecordSchema);
