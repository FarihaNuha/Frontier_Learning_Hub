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

    // 1. Automatic Course Code Detection (from first 5 rows)
    let courseCode = "";
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const row = rows[r];
      if (!row) continue;
      for (const cell of row) {
        if (cell && typeof cell === "string" && cell.toLowerCase().includes("course code:")) {
          courseCode = cell.split(/course code:\s*/i)[1]?.trim();
          break;
        }
      }
      if (courseCode) break;
    }

    if (!courseCode) {
      // Clean up uploaded file
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({
        error: "Course code not detected in the marksheet. Please ensure it contains a cell with 'Course Code: XXX'."
      });
    }

    // Retrieve courseId from Course model for notification link
    const courseDoc = await Course.findOne({ displayCode: courseCode.trim().toUpperCase() });
    const courseId = courseDoc ? courseDoc._id : null;

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

      // 5. Duplicate Record Detection
      const existingRecord = await Assessment.findOne({ studentIdNumber, courseCode });
      if (existingRecord) {
        duplicateRecords.push({ studentIdNumber, courseCode });
        continue;
      }

      // Find matching User model object
      const studentUser = await User.findOne({ studentId: studentIdNumber, role: "student" });
      const studentId = studentUser ? studentUser._id : null;

      // 6. Save Assessment record
      const record = await Assessment.create({
        studentIdNumber,
        studentId,
        courseCode,
        attendance,
        quiz,
        assignment,
        presentation,
        totalMarks,
        uploadedBy: req.user.uid,
      });

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
    }).sort({ courseCode: 1 });

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

// Delete all assessment records for a specific course uploaded by the logged-in teacher
exports.deleteCourseAssessment = async (req, res) => {
  try {
    const { courseCode } = req.params;
    if (!courseCode) {
      return res.status(400).json({ error: "Course code is required" });
    }

    const assessmentsToDelete = await Assessment.find({
      courseCode,
      uploadedBy: req.user.uid
    });
    const studentIds = assessmentsToDelete.map(a => a.studentId).filter(Boolean);

    const result = await Assessment.deleteMany({
      courseCode,
      uploadedBy: req.user.uid
    });

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
