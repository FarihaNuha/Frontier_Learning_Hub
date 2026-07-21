const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Course = require("../models/Course");

// ==================== TEACHER FUNCTIONS ====================

// Get all courses for a teacher
exports.getTeacherCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      teacher: req.user.uid,
      isActive: true,
    }).select("name displayCode _id department theoryFormula labFormula theoryTotalClasses labTotalClasses");

    console.log("Teacher ID:", req.user.uid);
    console.log("Courses found:", courses.length);

    res.json({ courses });
  } catch (error) {
    console.error("Error in getTeacherCourses:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get students by course - ONLY STUDENTS (not teacher)
exports.getStudentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    const course = await Course.findOne({
      _id: courseId,
      teacher: req.user.uid,
    });

    if (!course) {
      return res.status(403).json({
        error: "You don't have access to this course",
      });
    }

    // IMPORTANT: Filter only students, not teachers
    const students = await User.find({
      _id: { $in: course.students },
      role: "student", // ← এই লাইনটি যোগ করুন - শুধু student দেখাবে
    }).select("name email studentId");

    // Sort students by studentId in ascending order (small to large)
    students.sort((a, b) => {
      const idA = a.studentId ? String(a.studentId).trim() : "";
      const idB = b.studentId ? String(b.studentId).trim() : "";
      
      const numA = parseInt(idA, 10);
      const numB = parseInt(idB, 10);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
    });

    console.log("Total students in course:", students.length);
    console.log(
      "Students:",
      students.map((s) => `${s.studentId}: ${s.name}`),
    );

    res.json({
      students,
      courseName: course.name,
      courseCode: course.displayCode,
    });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Mark attendance
exports.markAttendance = async (req, res) => {
  try {
    const { courseId, date, classType, records } = req.body;

    if (!courseId || !date || !records) {
      return res
        .status(400)
        .json({ error: "Please provide all required fields" });
    }

    const course = await Course.findOne({
      _id: courseId,
      teacher: req.user.uid,
    });

    if (!course) {
      return res.status(403).json({
        error: "You don't have permission for this course",
      });
    }

    const [year, month, day] = date.split("-").map(Number);
    const attendanceDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      courseId: courseId,
      date: attendanceDate,
      classType: classType || "theory",
    });

    if (attendance) {
      attendance.records = records;
      attendance.markedBy = req.user.uid;
      attendance.updatedAt = new Date();
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        course: course.name,
        courseId: courseId,
        department: course.department,
        date: attendanceDate,
        classType: classType || "theory",
        records,
        markedBy: req.user.uid,
      });
    }

    res.json({ message: "Attendance saved successfully", attendance });
  } catch (error) {
    console.error("Mark attendance error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== COMMON FUNCTIONS ====================

// Get attendance records
exports.getAttendance = async (req, res) => {
  try {
    const { courseId, date, classType } = req.query;
    const filter = {};

    if (courseId) {
      filter.courseId = courseId;
    }

    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const attendanceDate = new Date(y, m - 1, d, 0, 0, 0, 0);
      filter.date = attendanceDate;
    }

    let detectedClassType = classType;
    if (req.user.role === "student" && courseId && !detectedClassType) {
      const firstRecord = await Attendance.findOne({ courseId: courseId });
      detectedClassType = firstRecord ? firstRecord.classType : "theory";
    }

    if (detectedClassType) {
      filter.classType = detectedClassType;
    }

    // Student view
    if (req.user.role === "student") {
      const studentCourses = await Course.find({ students: req.user.uid });
      const courseIds = studentCourses.map((c) => c._id);

      if (courseId) {
        filter.courseId = courseId;
      } else {
        filter.courseId = { $in: courseIds };
      }

      const attendanceRecords = await Attendance.find(filter).sort({
        date: -1,
      });

      const studentAttendance = attendanceRecords.map((att) => {
        const myRecord = att.records.find(
          (r) => r.studentId.toString() === req.user.uid,
        );
        return {
          _id: att._id,
          course: att.course,
          courseId: att.courseId,
          department: att.department,
          date: att.date,
          classType: att.classType,
          status: myRecord ? myRecord.status : "not_marked",
        };
      });

      return res.json({ attendance: studentAttendance, role: "student" });
    }

    // Teacher view
    else {
      const attendance = await Attendance.find(filter)
        .populate("markedBy", "name")
        .sort({ date: -1 });
      return res.json({ attendance, role: "teacher" });
    }
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get attendance statistics
exports.getAttendanceStats = async (req, res) => {
  try {
    const studentId =
      req.user.role === "student" ? req.user.uid : req.query.studentId;
    const courseId = req.query.courseId;
    const { month, year, classType } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    if (!studentId) {
      return res.status(400).json({ error: "Student ID is required" });
    }

    let detectedClassType = classType;
    if (req.user.role === "student" && !detectedClassType) {
      const firstRecord = await Attendance.findOne({ courseId: courseId });
      detectedClassType = firstRecord ? firstRecord.classType : "theory";
    }

    const filter = { courseId: courseId, classType: detectedClassType || "theory" };
    let allAttendanceRecords = await Attendance.find(filter);

    // Disable month/year filtering for stats so they are always overall (cumulative) for the course
    // as requested by the user.

    let totalClasses = allAttendanceRecords.length;
    let present = 0;

    allAttendanceRecords.forEach((att) => {
      const record = att.records.find(
        (r) => r.studentId.toString() === studentId.toString(),
      );
      if (record && record.status === "present") {
        present++;
      }
    });

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const isLab = (detectedClassType || "theory") === "lab";
    const credit = isLab ? 1 : 3;
    const formulaString = isLab
      ? (course.labFormula || "=ROUND((4 + 6 * (Percentage - 75) / 25) * 1, 0)")
      : (course.theoryFormula || "=ROUND((4 + 6 * (Percentage - 75) / 25) * 3, 0)");

    const totalClassesForType = isLab
      ? (course.labTotalClasses !== undefined && course.labTotalClasses !== null ? course.labTotalClasses : 14)
      : (course.theoryTotalClasses !== undefined && course.theoryTotalClasses !== null ? course.theoryTotalClasses : 28);

    // Calculate percentage based on totalClassesForType (Present / Total Class Count) * 100
    const percentage = totalClassesForType > 0
      ? parseFloat(((present / totalClassesForType) * 100).toFixed(8))
      : 0;
    
    // Evaluate marks dynamically using the formulaString and totalClassesForType as the denominator
    const attendanceMarks = evaluateExcelFormula(formulaString, present, credit, totalClassesForType);
    const maxAttendanceMarks = 10 * credit;

    res.json({
      totalClasses: totalClassesForType,
      actualTotalClasses: totalClasses,
      present,
      absent: Math.max(0, totalClassesForType - present),
      percentage: parseFloat(percentage.toFixed(1)),
      maxAttendanceMarks,
      attendanceMarks,
      classType: detectedClassType || "theory",
      theoryFormula: course.theoryFormula,
      labFormula: course.labFormula,
      theoryTotalClasses: course.theoryTotalClasses || 28,
      labTotalClasses: course.labTotalClasses || 14,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== STUDENT FUNCTIONS ====================

// Get student's enrolled courses
exports.getStudentCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      students: req.user.uid,
      isActive: true,
    }).select("name displayCode _id department theoryFormula labFormula theoryTotalClasses labTotalClasses");

    res.json({ courses });
  } catch (error) {
    console.error("Error in getStudentCourses:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update course formulas
exports.updateCourseFormulas = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { theoryFormula, labFormula, theoryTotalClasses, labTotalClasses } = req.body;

    const updatePayload = {};
    if (theoryFormula !== undefined) updatePayload.theoryFormula = theoryFormula;
    if (labFormula !== undefined) updatePayload.labFormula = labFormula;
    if (theoryTotalClasses !== undefined) updatePayload.theoryTotalClasses = Number(theoryTotalClasses);
    if (labTotalClasses !== undefined) updatePayload.labTotalClasses = Number(labTotalClasses);

    const course = await Course.findOneAndUpdate(
      { _id: courseId, teacher: req.user.uid },
      updatePayload,
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ error: "Course not found or permission denied" });
    }

    res.json({ message: "Formulas updated successfully", course });
  } catch (error) {
    console.error("Update formulas error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== HELPER FUNCTIONS FOR FORMULA EVALUATION ====================

function evaluateExcelFormula(formula, present, credit, totalClasses) {
  try {
    let expr = (formula || "").trim();
    if (!expr) return 0;
    
    if (expr.startsWith("=")) {
      expr = expr.substring(1);
    }
    
    const totalCls = (totalClasses && totalClasses > 0) ? totalClasses : (credit === 1 ? 14 : 28);
    const percentage = (present / totalCls) * 100;
    
    // Replace variables (case-insensitive)
    expr = expr.replace(/E5|Percentage/gi, percentage);
    expr = expr.replace(/D5|Present/gi, present);
    expr = expr.replace(/Credit/gi, credit);
    
    let roundMatch;
    while ((roundMatch = expr.match(/ROUND\(([^,]+),\s*(\d+)\)/i)) !== null) {
      const fullMatch = roundMatch[0];
      const innerExpr = roundMatch[1];
      const decimals = parseInt(roundMatch[2], 10);
      
      const innerVal = evalArithmetic(innerExpr);
      const roundedVal = Math.round(innerVal * Math.pow(10, decimals)) / Math.pow(10, decimals);
      expr = expr.replace(fullMatch, roundedVal);
    }
    
    return evalArithmetic(expr);
  } catch (err) {
    console.error("Formula eval error:", err);
    return 0;
  }
}

function evalArithmetic(str) {
  const sanitized = str.replace(/[^0-9+\-*/().\s]/g, "");
  try {
    const val = Function(`"use strict"; return (${sanitized})`)();
    return isNaN(val) || !isFinite(val) ? 0 : val;
  } catch (e) {
    return 0;
  }
}
