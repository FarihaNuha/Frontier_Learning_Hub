const mongoose = require("mongoose");

const publishedCalendarSchema = new mongoose.Schema({
  title: {
    type: String,
    default: "B.Sc. Academic Calendar for the Semester: January 2026 and July 2026",
  },
  session: {
    type: String,
    default: "Session: 2020-2021, 2021-2022, 2022-2023",
  },
  termHeader: {
    type: String,
    default: "Term: January 2026",
  },
  fileUrl: {
    type: String,
    default: "",
  },
  fileType: {
    type: String,
    enum: ["image", "pdf", "custom"],
    default: "image",
  },
  events: [
    {
      date: String,
      duration: String,
      activity: String,
    },
  ],
  importantDates: [
    {
      date: String,
      duration: String,
      activity: String,
    },
  ],
  holidays: [
    {
      date: String,
      days: String,
      event: String,
    },
  ],
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  publishedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PublishedCalendar", publishedCalendarSchema);
