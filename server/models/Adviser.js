const mongoose = require("mongoose");

const adviserSchema = new mongoose.Schema({
  teacherEmail: {
    type: String,
    required: true,
    lowercase: true,
  },
  department: {
    type: String,
    required: true,
  },
  program: {
    type: String,
    required: true,
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
