const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  course: {
    type: String,
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  department: {
    type: String,
    enum: ["EDTE", "IRE", "Software", "Cyber", "DataScience", "General"],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  classType: {
    type: String,
    enum: ["theory", "lab"],
    default: "theory",
  },
  records: [
    {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      studentName: {
        type: String,
        required: true,
      },
      studentEmail: String,
      studentIdNumber: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: ["present", "absent"],
        default: "present",
      },
    },
  ],
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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

// Compound index for unique attendance per course per day per classType (Theory vs Lab)
attendanceSchema.index({ courseId: 1, date: 1, classType: 1 }, { unique: true });

// Index for faster queries
attendanceSchema.index({ courseId: 1, studentId: 1 });
attendanceSchema.index({ studentId: 1, date: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
