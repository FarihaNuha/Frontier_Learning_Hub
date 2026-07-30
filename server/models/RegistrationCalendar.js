const mongoose = require("mongoose");

const registrationCalendarSchema = new mongoose.Schema({
  session: {
    type: String,
    required: true,
  },
  department: {
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
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  maxCredits: {
    type: Number,
    default: 24,
  },
  minCredits: {
    type: Number,
    default: 9,
  },
  lateFinePerDay: {
    type: Number,
    default: 0,
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("RegistrationCalendar", registrationCalendarSchema);
