const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Course name is required"],
  },
  session: {
    type: String,
    default: "",
  },
  displayCode: {
    type: String,
    required: [true, "Course code is required"],
    uppercase: true,
  },
  joinCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  department: {
    type: String,
    enum: ["EDTE", "IRE", "Software", "Cyber", "DataScience", "General"],
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  theoryFormula: {
    type: String,
    default: "=ROUND((4 + 6 * (Percentage - 75) / 25) * 3, 0)",
  },
  labFormula: {
    type: String,
    default: "=ROUND((4 + 6 * (Percentage - 75) / 25) * 1, 0)",
  },
  theoryTotalClasses: {
    type: Number,
    default: 28,
  },
  labTotalClasses: {
    type: Number,
    default: 14,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// REMOVED pre-save hook

module.exports = mongoose.model("Course", courseSchema);
