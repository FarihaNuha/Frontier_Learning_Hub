const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  department: {
    type: String,
    required: true,
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
  selectedCourses: [
    {
      courseCode: { type: String, required: true },
      courseTitle: { type: String, required: true },
      creditHours: { type: Number, required: true },
      courseType: { type: String, default: "Theory" },
    },
  ],
  totalCredits: {
    type: Number,
    required: true,
  },
  registrationFee: {
    type: Number,
    default: 0,
  },
  additionalFees: {
    type: Number,
    default: 0,
  },
  totalPayable: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Pending Adviser Approval", "Approved", "Rejected"],
    default: "Pending Adviser Approval",
  },
  adviserEmail: {
    type: String,
    default: "",
  },
  rejectionReason: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Registration", registrationSchema);
