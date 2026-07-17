const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Lecture title is required"],
  },
  course: {
    type: String,
    default: "",
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    default: null,
  },
  topic: {
    type: String,
    default: "",
  },
  week: {
    type: Number,
    default: null,
  },
  department: {
    type: String,
    enum: ["EDTE", "IRE", "Software", "Cyber", "DataScience", "General"],
    required: true,
  },
  fileURL: {
    type: String,
    required: true,
  },
  originalName: String,
  fileType: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Lecture", lectureSchema);
