const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Course = require("../models/Course");
const CourseImport = require("../models/CourseImport");
const Notice = require("../models/Notice");
const Assignment = require("../models/Assignment");
const Result = require("../models/Result");

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({
        query: "",
        students: [],
        teachers: [],
        courses: [],
        notices: [],
        assignments: [],
        results: [],
        totalMatches: 0,
      });
    }

    const queryStr = q.trim();
    const regex = new RegExp(queryStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    // 1. Search Students
    const studentUsers = await User.find({
      role: "student",
      $or: [{ name: regex }, { email: regex }, { studentId: regex }, { department: regex }],
    })
      .select("name email studentId department profilePicture")
      .limit(10)
      .lean();

    // 2. Search Teachers
    const teacherUsers = await User.find({
      role: "teacher",
      $or: [{ name: regex }, { email: regex }, { studentId: regex }, { department: regex }],
    })
      .select("name email studentId department profilePicture")
      .limit(10)
      .lean();

    // 3. Search Courses
    const courses = await Course.find({
      $or: [{ name: regex }, { displayCode: regex }, { department: regex }, { session: regex }],
    })
      .populate("teacher", "name email")
      .limit(10)
      .lean();

    // 4. Search Notices
    const notices = await Notice.find({
      status: "Published",
      $or: [{ title: regex }, { content: regex }, { category: regex }],
    })
      .limit(10)
      .lean();

    // 5. Search Assignments
    const assignments = await Assignment.find({
      $or: [{ title: regex }, { description: regex }],
    })
      .populate("course", "displayCode name")
      .limit(10)
      .lean();

    // 6. Search Results (Published)
    const results = await Result.find({
      status: "Published",
      $or: [{ courseCode: regex }, { courseTitle: regex }, { studentId: regex }, { studentName: regex }],
    })
      .limit(10)
      .lean();

    const totalMatches =
      studentUsers.length +
      teacherUsers.length +
      courses.length +
      notices.length +
      assignments.length +
      results.length;

    res.json({
      query: queryStr,
      students: studentUsers,
      teachers: teacherUsers,
      courses,
      notices,
      assignments,
      results,
      totalMatches,
    });
  } catch (error) {
    console.error("Global search error:", error);
    res.status(500).json({ error: error.message });
  }
};
