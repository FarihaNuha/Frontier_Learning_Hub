const mongoose = require("mongoose");

const academicCalendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  eventType: {
    type: String,
    enum: ["Semester", "Registration", "Mid Exam", "Final Exam", "Holiday", "Events"],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  session: {
    type: String,
    default: "2023-24",
  },
  levelTerm: {
    type: String,
    default: "All Level-Terms",
  },
  isImportant: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

academicCalendarEventSchema.index({ startDate: 1, eventType: 1 });

module.exports = mongoose.model("AcademicCalendarEvent", academicCalendarEventSchema);
