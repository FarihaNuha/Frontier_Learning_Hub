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
    default: "EDTE",
    set: function (val) {
      if (!val) return "EDTE";
      const s = String(val).trim();
      const lower = s.toLowerCase();
      if (lower.includes("gen")) return "General";
      if (lower.includes("edte")) return "EDTE";
      if (lower.includes("ire")) return "IRE";
      if (lower.includes("cyse") || lower.includes("cyber")) return "Cyber";
      if (lower.includes("dse") || lower.includes("data")) return "DataScience";
      if (lower.includes("swe") || lower.includes("soft")) return "Software";
      return s.toUpperCase();
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  theoryFormula: {
    type: String,
    default: "=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 3, 0)",
  },
  labFormula: {
    type: String,
    default: "=ROUNDUP((4 + 6 * (Percentage - 75) / 25) * 1, 0)",
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
