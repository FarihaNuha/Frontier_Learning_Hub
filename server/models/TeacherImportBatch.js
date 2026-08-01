const mongoose = require("mongoose");

const teacherImportBatchSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  totalTeachersCount: {
    type: Number,
    default: 0,
  },
  totalCoursesCount: {
    type: Number,
    default: 0,
  },
  records: [
    {
      teacherId: String,
      name: String,
      email: String,
      department: String,
      program: String,
      assignedLevelTerm: String,
      assignedSession: String,
      assignedCourses: Array,
      adviserSession: String,
    },
  ],
});

module.exports = mongoose.model("TeacherImportBatch", teacherImportBatchSchema);
