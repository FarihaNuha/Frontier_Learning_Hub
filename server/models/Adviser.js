const mongoose = require("mongoose");

const adviserSchema = new mongoose.Schema({
  teacherId: {
    type: String,
    default: "",
  },
  teacherName: {
    type: String,
    default: "",
  },
  teacherEmail: {
    type: String,
    required: true,
    lowercase: true,
  },
  department: {
    type: String,
    default: "",
  },
  program: {
    type: String,
    default: "",
  },
  session: {
    type: String,
    required: true,
  },
  assignedBatch: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Adviser", adviserSchema);
