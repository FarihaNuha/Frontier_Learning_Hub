const Assessment = require("../models/Assessment");
const User = require("../models/User");
const XLSX = require("xlsx");
const fs = require("fs");
const Notification = require("../models/Notification");
const { getIO } = require("../socket");
const { sendEmail, emailTemplates, queueEmail } = require("../services/emailService");
const Course = require("../models/Course");

// Upload and parse Assessment Marksheet
exports.uploadMarksheet = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an Excel or CSV file" });
    }

    // Read the Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (!rows || rows.length === 0) {
      // Clean up uploaded file
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: "The uploaded sheet is empty" });
    }

    // 1. Automatic Metadata Detection (Course Code, Level, Term, Department from first 10 rows)
    let courseCode = "";
    let level = "";
    let term = "";
    let department = "";
    let headerSession = "";

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;

      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell === undefined || cell === null) continue;
        const cellStr = String(cell).trim();
        const cellLower = cellStr.toLowerCase();

        // 1. Course Code Detection
        if (!courseCode && cellLower.includes("course code")) {
          if (cellLower.includes("course code:")) {
            const afterCodeTag = cellStr.split(/course code:\s*/i)[1] || "";
            const cleanCodePart = afterCodeTag.split(/course title|course type|credit|level|term|dept|[\n,;]/i)[0]?.trim();
            if (cleanCodePart) courseCode = cleanCodePart;
          }
          if (!courseCode && row[c + 1] !== undefined && row[c + 1] !== null) {
            const nextVal = String(row[c + 1]).trim();
            const cleanNextVal = nextVal.split(/course title|course type|credit|level|term|dept|[\n,;]/i)[0]?.trim();
            if (cleanNextVal && !cleanNextVal.toLowerCase().includes("level") && !cleanNextVal.toLowerCase().includes("term") && !cleanNextVal.toLowerCase().includes("dept")) {
              courseCode = cleanNextVal;
            }
          }
        }

        // 2. Level Detection
        if (!level && cellLower.includes("level")) {
          const match = cellStr.match(/level\s*:?\s*(\d+)/i);
          if (match) {
            level = match[1];
          } else if (row[c + 1] !== undefined && row[c + 1] !== null) {
            const nextMatch = String(row[c + 1]).match(/level\s*:?\s*(\d+)/i) || String(row[c + 1]).match(/(\d+)/);
            if (nextMatch) level = nextMatch[1] || nextMatch[0];
          }
        }

        // 3. Term Detection
        if (!term && cellLower.includes("term")) {
          const match = cellStr.match(/term\s*:?\s*(\d+)/i);
          if (match) {
            term = match[1];
          } else if (row[c + 1] !== undefined && row[c + 1] !== null) {
            const nextMatch = String(row[c + 1]).match(/term\s*:?\s*(\d+)/i) || String(row[c + 1]).match(/(\d+)/);
            if (nextMatch) term = nextMatch[1] || nextMatch[0];
          }
        }

        // 4. Department Detection
        if (!department && (cellLower.includes("dept") || cellLower.includes("department"))) {
          const match = cellStr.match(/(?:dept|department)\s*:?\s*([a-zA-Z]+)/i);
          if (match) {
            department = match[1].toUpperCase();
          } else if (row[c + 1] !== undefined && row[c + 1] !== null) {
            const nextVal = String(row[c + 1]).trim().toUpperCase();
            if (nextVal && ["EDTE", "IRE", "CYSE", "DSE", "SWE"].includes(nextVal)) {
              department = nextVal;
            }
          }
        }

        // 5. Session Header Detection
        if (!headerSession && cellLower.includes("session")) {
          const match = cellStr.match(/session\s*:?\s*(\d{4}[-\s]\d{2,4})/i);
          if (match) {
            headerSession = match[1];
          } else if (row[c + 1] !== undefined && row[c + 1] !== null) {
            const nextMatch = String(row[c + 1]).match(/(\d{4}[-\s]\d{2,4})/);
            if (nextMatch) headerSession = nextMatch[1];
          }
        }
      }
    }

    if (!courseCode) {
      // Clean up uploaded file
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({
        error: "Course code not detected in the marksheet. Please ensure it contains a cell with 'Course Code: XXX'."
      });
    }

    // 1b. Teacher Course Assignment Verification
    const teacherUser = await User.findById(req.user.uid);
    const teacherEmail = (teacherUser?.email || "").toLowerCase().trim();

    const Teacher = require("../models/Teacher");
    const teacherDoc = await Teacher.findOne({
      $or: [
        { email: teacherEmail },
        { email: { $regex: new RegExp(`^${teacherEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
      ]
    }).lean();

    const lmsCourses = await Course.find({ teacher: req.user.uid }).lean();

    const assignedCoursesList = [];
    const assignedCodesSet = new Set();

    if (teacherDoc && Array.isArray(teacherDoc.assignedCourses)) {
      teacherDoc.assignedCourses.forEach((c) => {
        const code = String(c.courseCode || c.courseName || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const sess = (c.session || teacherDoc.assignedSession || "").trim();
        const lTerm = (c.levelTerm || teacherDoc.assignedLevelTerm || "").trim();
        if (code) {
          assignedCodesSet.add(code);
          const desc = `${c.courseCode || code}${c.courseName ? ` (${c.courseName})` : ""}${sess ? ` — Session: ${sess}` : ""}${lTerm ? `, ${lTerm}` : ""}`;
          if (!assignedCoursesList.includes(desc)) {
            assignedCoursesList.push(desc);
          }
        }
      });
    }

    if (Array.isArray(lmsCourses)) {
      lmsCourses.forEach((c) => {
        const code = String(c.displayCode || c.name || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const sess = (c.session || "").trim();
        if (code) {
          assignedCodesSet.add(code);
          const desc = `${c.displayCode || c.name || code}${sess ? ` — Session: ${sess}` : ""}`;
          if (!assignedCoursesList.includes(desc)) {
            assignedCoursesList.push(desc);
          }
        }
      });
    }

    const cleanCourseCode = String(courseCode).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    if (req.user.role !== "admin" && assignedCoursesList.length > 0) {
      const isAssigned = assignedCodesSet.has(cleanCourseCode) ||
        Array.from(assignedCodesSet).some(k => k.includes(cleanCourseCode) || cleanCourseCode.includes(k));

      if (!isAssigned) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        
        let warningLines = [];
        warningLines.push(`Upload blocked — The uploaded Excel sheet does not match your assigned courses.`);
        warningLines.push(``);
        warningLines.push(`Your Excel file details:`);
        warningLines.push(`  • Course Code : ${courseCode}`);
        if (headerSession) warningLines.push(`  • Session     : ${headerSession}`);
        if (level)         warningLines.push(`  • Level       : ${level}`);
        if (term)          warningLines.push(`  • Term        : ${term}`);
        if (department)    warningLines.push(`  • Department  : ${department}`);
        warningLines.push(``);
        warningLines.push(`Your assigned courses (one must match):`);
        assignedCoursesList.forEach((ac) => warningLines.push(`  - ${ac}`));

        return res.status(400).json({
          error: warningLines.join("\n")
        });
      }
    }

    // Retrieve Course model doc for notification link and fallbacks
    const courseDoc = await Course.findOne({ displayCode: courseCode.trim().toUpperCase() });
    const courseId = courseDoc ? courseDoc._id : null;
    if (!department && courseDoc?.department) {
      department = courseDoc.department;
    }

    // 2. Find the header row (has 'ID of the Student' or 'Student ID' or 'ID')
    let headerRowIndex = -1;
    let studentIdColIndex = -1;
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row) continue;
      const studentIdIdx = row.findIndex(c => c && typeof c === "string" && (
        c.toLowerCase().includes("id of the student") || 
        c.toLowerCase().includes("student id") || 
        c.toLowerCase() === "id"
      ));
      if (studentIdIdx !== -1) {
        headerRowIndex = r;
        studentIdColIndex = studentIdIdx;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Clean up uploaded file
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({
        error: "Student ID column not found in the marksheet. Make sure there is a header named 'ID of the Student' or 'Student ID'."
      });
    }

    // 3. Dynamically map column indexes from header row
    const headerRow = rows[headerRowIndex];
    const sessionColIndex = headerRow.findIndex(c => c && typeof c === "string" && c.toLowerCase().includes("session"));
    const attendanceColIndex = headerRow.findIndex(c => c && typeof c === "string" && c.toLowerCase().includes("attendance"));
    const quizColIndex = headerRow.findIndex(c => c && typeof c === "string" && (
      c.toLowerCase().includes("quiz") || 
      c.toLowerCase().includes("class test") || 
      c.toLowerCase().includes("test/quiz")
    ));
    const assignmentColIndex = headerRow.findIndex(c => c && typeof c === "string" && c.toLowerCase().includes("assignment"));
    const presentationColIndex = headerRow.findIndex(c => c && typeof c === "string" && c.toLowerCase().includes("presentation"));
    const totalColIndex = headerRow.findIndex(c => c && typeof c === "string" && c.toLowerCase().includes("total"));

    const savedRecords = [];
    const duplicateRecords = [];

    // Overwrite behavior: Delete any previous assessment records for this courseCode
    // so only the newly uploaded file's data remains in the database.
    const targetCleanCourseCode = courseCode.trim();
    const cleanRegex = new RegExp(targetCleanCourseCode.replace(/[^a-zA-Z0-9]/g, ""), "i");
    await Assessment.deleteMany({
      $or: [
        { courseCode: targetCleanCourseCode },
        { courseCode: { $regex: cleanRegex } }
      ]
    });

    // 4. Parse student rows
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;

      const studentIdNumberVal = row[studentIdColIndex];
      if (studentIdNumberVal === undefined || studentIdNumberVal === null || studentIdNumberVal === "") {
        continue; // skip empty Student ID rows
      }

      const studentIdNumber = String(studentIdNumberVal).trim();
      if (!studentIdNumber || studentIdNumber.toLowerCase() === "sl" || studentIdNumber.toLowerCase() === "id") {
        continue; // skip headers or SL numbers misread as student ID
      }

      // Per-student Session column extraction or header fallback
      const studentSession = (sessionColIndex !== -1 && row[sessionColIndex] !== undefined && row[sessionColIndex] !== null && String(row[sessionColIndex]).trim())
        ? String(row[sessionColIndex]).trim()
        : (headerSession || "");

      // Helper to parse cell as number
      const getNum = (colIndex) => {
        if (colIndex === -1 || colIndex === undefined) return 0;
        const val = row[colIndex];
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };

      const attendance = getNum(attendanceColIndex);
      const quiz = getNum(quizColIndex);
      const assignment = getNum(assignmentColIndex);
      const presentation = getNum(presentationColIndex);
      const totalMarks = getNum(totalColIndex);

      // Find matching User model object
      const studentUser = await User.findOne({ studentId: studentIdNumber, role: "student" });
      const studentId = studentUser ? studentUser._id : null;

      // Try dropping legacy unique index if still present in MongoDB
      try {
        await Assessment.collection.dropIndex("studentIdNumber_1_courseCode_1");
      } catch (e) {}

      // 6. Save Assessment record
      let record;
      try {
        record = await Assessment.create({
          studentIdNumber,
          studentId,
          courseCode,
          level,
          term,
          department,
          session: studentSession,
          attendance,
          quiz,
          assignment,
          presentation,
          totalMarks,
          uploadedBy: req.user.uid,
        });
      } catch (err) {
        if (err.code === 11000) {
          duplicateRecords.push({ studentIdNumber, courseCode, level, term, department, session: studentSession });
          continue;
        }
        throw err;
      }

      if (studentId) {
        // Delete any existing marksheet notifications for this course to avoid duplicates
        await Notification.deleteMany({
          userId: studentId,
          type: "marksheet_upload",
          message: { $regex: courseCode, $options: "i" }
        });

        await Notification.create({
          userId: studentId,
          title: "New Assessment Marks Uploaded",
          message: `Your assessment marks for ${courseCode} have been uploaded. Total Marks: ${totalMarks}`,
          type: "marksheet_upload",
          link: courseId ? `/student/assessment/${courseId}` : `/student/assessment`,
        });

        const io = getIO();
        if (io) {
          io.to(`user_${studentId}`).emit("newNotification", {
            title: "New Assessment Marks Uploaded",
            message: `Your assessment marks for ${courseCode} have been uploaded. Total Marks: ${totalMarks}`,
            type: "marksheet_upload",
            link: courseId ? `/student/assessment/${courseId}` : `/student/assessment`,
          });
        }
      }

      savedRecords.push(record);
    }

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    // Send emails in the background (non-blocking)
    if (savedRecords.length > 0) {
      (async () => {
        const emailPromises = savedRecords.map(async (rec) => {
          if (rec.studentId) {
            try {
              const student = await User.findById(rec.studentId);
              if (student && student.email) {
                const { subject, html } = emailTemplates.marksheetUploaded(
                  student.name || "Student",
                  rec.courseCode,
                  rec.totalMarks,
                  rec.attendance,
                  rec.quiz,
                  rec.assignment,
                  rec.presentation,
                );
                queueEmail(student.email, subject, html);
              }
            } catch (err) {
              console.error("Background marksheet email error:", err);
            }
          }
        });
        await Promise.all(emailPromises);
      })();
    }

    res.json({
      success: true,
      courseCode,
      level,
      term,
      department,
      totalProcessed: savedRecords.length + duplicateRecords.length,
      savedCount: savedRecords.length,
      duplicateCount: duplicateRecords.length,
      duplicates: duplicateRecords,
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    console.error("Marksheet upload error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get assessment marks for logged-in Student
exports.getStudentAssessments = async (req, res) => {
  try {
    const student = await User.findById(req.user.uid);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const assessments = await Assessment.find({
      $or: [
        { studentIdNumber: student.studentId },
        { studentId: student._id }
      ]
    })
      .populate("uploadedBy", "name email")
      .sort({ courseCode: 1 });

    res.json({ assessments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get assessment marks uploaded by logged-in Teacher
exports.getTeacherAssessments = async (req, res) => {
  try {
    const filter = { uploadedBy: req.user.uid };
    if (req.query.courseCode) {
      filter.courseCode = req.query.courseCode;
    }

    const assessments = await Assessment.find(filter)
      .populate("studentId", "name email")
      .sort({ courseCode: 1, studentIdNumber: 1 });

    res.json({ assessments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete all assessment records for a specific course + level + term + department uploaded by logged-in teacher
exports.deleteCourseAssessment = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { level, term, department } = req.query;
    if (!courseCode) {
      return res.status(400).json({ error: "Course code is required" });
    }

    const query = {
      courseCode: { $regex: new RegExp(`^${courseCode.trim()}$`, "i") },
      uploadedBy: req.user.uid
    };

    const conditions = [];

    if (level && level !== "undefined" && level !== "null") {
      conditions.push({ level });
    } else {
      conditions.push({ $or: [{ level: "" }, { level: null }, { level: { $exists: false } }] });
    }

    if (term && term !== "undefined" && term !== "null") {
      conditions.push({ term });
    } else {
      conditions.push({ $or: [{ term: "" }, { term: null }, { term: { $exists: false } }] });
    }

    if (department && department !== "undefined" && department !== "null") {
      conditions.push({ department: { $regex: new RegExp(`^${department.trim()}$`, "i") } });
    }

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    const assessmentsToDelete = await Assessment.find(query);
    const studentIds = assessmentsToDelete.map(a => a.studentId).filter(Boolean);

    const result = await Assessment.deleteMany(query);

    if (studentIds.length > 0) {
      await Notification.deleteMany({
        userId: { $in: studentIds },
        type: "marksheet_upload",
        message: { $regex: courseCode, $options: "i" }
      });
    }

    res.json({
      success: true,
      message: `Successfully deleted marksheet for course ${courseCode}.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a single student's assessment record
exports.deleteSingleAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Assessment.findById(id);

    if (!record) {
      return res.status(404).json({ error: "Assessment record not found" });
    }

    // Check authorization
    if (record.uploadedBy.toString() !== req.user.uid && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized to delete this record" });
    }

    await Assessment.findByIdAndDelete(id);

    if (record.studentId) {
      await Notification.deleteMany({
        userId: record.studentId,
        type: "marksheet_upload",
        message: { $regex: record.courseCode, $options: "i" }
      });
    }

    res.json({
      success: true,
      message: "Assessment record deleted successfully."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Set or update correction deadline for assessment marksheet
exports.setAssessmentCorrectionDeadline = async (req, res) => {
  try {
    const { courseCode, level, term, department, correctionWindowEnd, isCorrectionClosed } = req.body;
    if (!courseCode) {
      return res.status(400).json({ error: "Course code is required" });
    }

    const query = {
      courseCode: { $regex: new RegExp(`^${courseCode.trim()}$`, "i") },
    };

    if (req.user.role !== "admin") {
      query.uploadedBy = req.user.uid;
    }

    const updateData = {};
    if (correctionWindowEnd !== undefined) {
      updateData.correctionWindowEnd = correctionWindowEnd ? new Date(correctionWindowEnd) : null;
    }
    if (isCorrectionClosed !== undefined) {
      updateData.isCorrectionClosed = Boolean(isCorrectionClosed);
    }

    await Assessment.updateMany(query, { $set: updateData });

    res.json({
      success: true,
      message: "Assessment correction request deadline updated successfully.",
      correctionWindowEnd: updateData.correctionWindowEnd,
      isCorrectionClosed: updateData.isCorrectionClosed,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
