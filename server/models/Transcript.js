const mongoose = require("mongoose");

const transcriptSchema = new mongoose.Schema({
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
  issueDate: {
    type: Date,
    default: Date.now,
  },
  issuedBy: {
    type: String,
    default: "System Registrar",
  },
  cgpaSnapshot: {
    type: Number,
    required: true,
  },
  totalCreditsEarned: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    default: "Official",
  },
});

module.exports = mongoose.model("Transcript", transcriptSchema);
