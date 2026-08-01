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

    // 1b. Strict Teacher Course Assignment & Section Metadata Verification
    const Teacher = require("../models/Teacher");
    const TeacherImportBatch = require("../models/TeacherImportBatch");

    const teacherUser = await User.findById(req.user.uid);
    const teacherEmail = (teacherUser?.email || "").toLowerCase().trim();
    const teacherIdStr = String(teacherUser?.teacherId || "").trim();

    // Fetch teacher assignment from Teacher collection
    const teacherDoc = await Teacher.findOne({
      $or: [
        teacherEmail ? { email: teacherEmail } : null,
        teacherEmail ? { email: { $regex: new RegExp(`^${teacherEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } } : null,
        teacherIdStr ? { teacherId: teacherIdStr } : null,
      ].filter(Boolean)
    }).lean();

    // Fetch teacher assignment from TeacherImportBatch collection
    const teacherBatches = await TeacherImportBatch.find().lean();

    // Fetch teacher LMS courses
    const lmsCourses = await Course.find({ teacher: req.user.uid }).lean();

    // Fetch CourseImport documents for fallback Level & Term resolution
    const CourseImport = require("../models/CourseImport");
    const allCourseImports = await CourseImport.find().lean();

    const findImportDoc = (codeStr, titleStr) => {
      const cleanC = String(codeStr || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const cleanT = String(titleStr || "").trim().toLowerCase();
      return allCourseImports.find((ci) => {
        const ciC = String(ci.courseCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const ciT = String(ci.courseTitle || "").trim().toLowerCase();
        return (cleanC && ciC === cleanC) || (cleanT && ciT === cleanT);
      });
    };

    const resolveLevelTerm = (acObj, fallbackLTerm, codeStr, titleStr) => {
      if (acObj && acObj.levelTerm && acObj.levelTerm.trim()) return acObj.levelTerm.trim();
      if (acObj && (acObj.level || acObj.term)) {
        const l = String(acObj.level || "").replace(/\D/g, "");
        const t = String(acObj.term || "").replace(/\D/g, "");
        if (l && t) return `Level ${l} - Term ${t}`;
        if (l) return `Level ${l}`;
        if (t) return `Term ${t}`;
      }
      if (fallbackLTerm && fallbackLTerm.trim()) return fallbackLTerm.trim();

      const ci = findImportDoc(codeStr, titleStr);
      if (ci && (ci.level || ci.term)) {
        const l = String(ci.level || "").replace(/\D/g, "");
        const t = String(ci.term || "").replace(/\D/g, "");
        if (l && t) return `Level ${l} - Term ${t}`;
        if (l) return `Level ${l}`;
        if (t) return `Term ${t}`;
      }
      return "";
    };

    // Build validAssignments: each entry is a strict per-course triplet {code, session, levelTerm, department}
    const validAssignments = [];

    const normalizeSession = (s) =>
      String(s || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^0-9-]/g, "");

    const normalizeLvl = (s) => {
      const m = String(s || "").match(/(\d+)/);
      return m ? m[1] : "";
    };

    // Process Teacher collection
    if (teacherDoc && Array.isArray(teacherDoc.assignedCourses)) {
      teacherDoc.assignedCourses.forEach((ac) => {
        const codeClean = String(ac.courseCode || ac.courseName || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (!codeClean) return;

        const acSession = (ac.session || "").trim();
        const acLevelTerm = resolveLevelTerm(ac, teacherDoc.assignedLevelTerm, ac.courseCode || ac.courseName, ac.courseTitle || ac.courseName);
        const acDept = (ac.department || teacherDoc.department || "").trim().toUpperCase();

        validAssignments.push({
          code: codeClean,
          rawCode: ac.courseCode || ac.courseName || "",
          title: ac.courseTitle || ac.courseName || "",
          session: acSession,
          levelTerm: acLevelTerm,
          department: acDept,
        });
      });
    }

    // Process TeacherImportBatch
    if (Array.isArray(teacherBatches)) {
      teacherBatches.forEach((batch) => {
        if (!Array.isArray(batch.records)) return;
        batch.records.forEach((r) => {
          const rEmail = (r.email || "").toLowerCase().trim();
          const rId = String(r.teacherId || "").trim();
          const isMatch = (teacherEmail && rEmail === teacherEmail) || (teacherIdStr && rId === teacherIdStr);
          if (!isMatch || !Array.isArray(r.assignedCourses)) return;

          r.assignedCourses.forEach((ac) => {
            const acObj = typeof ac === "object" && ac !== null ? ac : {};
            const codeClean = String(acObj.courseCode || acObj.courseName || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            if (!codeClean) return;

            const acSession = (acObj.session || "").trim();
            const acLevelTerm = resolveLevelTerm(acObj, r.assignedLevelTerm, acObj.courseCode || acObj.courseName, acObj.courseTitle || acObj.courseName);
            const acDept = (acObj.department || r.department || "").trim().toUpperCase();

            validAssignments.push({
              code: codeClean,
              rawCode: acObj.courseCode || acObj.courseName || "",
              title: acObj.courseTitle || acObj.courseName || "",
              session: acSession,
              levelTerm: acLevelTerm,
              department: acDept,
            });
          });
        });
      });
    }

    // Process LMS Courses
    if (Array.isArray(lmsCourses)) {
      lmsCourses.forEach((c) => {
        const codeClean = String(c.displayCode || c.courseCode || c.name || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (!codeClean) return;

        let lt = (c.level || c.term) ? `Level ${c.level || "?"} - Term ${c.term || "?"}` : "";
        if (!lt) {
          lt = resolveLevelTerm({}, "", c.displayCode || c.courseCode || c.name, c.name);
        }

        validAssignments.push({
          code: codeClean,
          rawCode: c.displayCode || c.courseCode || c.name || "",
          title: c.name || "",
          session: (c.session || "").trim(),
          levelTerm: lt,
          department: (c.department || "").trim().toUpperCase(),
        });
      });
    }

    const uploadedCleanCode = String(courseCode).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const uploadedSessionNorm = normalizeSession(headerSession);
    const uploadedLevel = normalizeLvl(level);
    const uploadedTerm = normalizeLvl(term);

    if (req.user.role !== "admin") {
      if (validAssignments.length === 0) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({
          error: "⛔ UPLOAD BLOCKED: No course assignments found for your teacher account. Please contact system admin."
        });
      }

      // Step 1: Find all assignments where course code matches
      const matchingCodeAssignments = validAssignments.filter((a) => {
        if (!a.code) return false;
        return a.code === uploadedCleanCode ||
          a.code.includes(uploadedCleanCode) ||
          uploadedCleanCode.includes(a.code);
      });

      if (matchingCodeAssignments.length === 0) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        const uniqueAssignmentsMap = new Map();
        validAssignments.forEach((a) => {
          const key = `${a.rawCode || a.code}_${a.session}_${a.levelTerm}_${a.department}`;
          if (!uniqueAssignmentsMap.has(key)) {
            uniqueAssignmentsMap.set(key, a);
          }
        });
        const uniqueAssignments = Array.from(uniqueAssignmentsMap.values());

        const warningLines = [
          `⛔ UPLOAD BLOCKED: Unassigned Course Code!`,
          ``,
          `Uploaded Course Code: "${courseCode}"`,
          ``,
          `Your Assigned Courses:`,
          ...uniqueAssignments.map((a) =>
            `  • ${a.rawCode || a.code}${a.title ? ` (${a.title})` : ""}${a.session ? ` — Session: ${a.session}` : ""}${a.levelTerm ? `, ${a.levelTerm}` : ""}${a.department ? `, Dept: ${a.department}` : ""}`
          ),
        ];
        return res.status(400).json({ error: warningLines.join("\n") });
      }

      // Step 2: Strict parameter matching (Session, Level, Term, Department)
      let isStrictMatch = false;
      const mismatchReasons = [];

      const lmsCourseSessionMap = {};
      for (const lc of lmsCourses) {
        const lcCode = String(lc.displayCode || lc.courseCode || lc.name || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (lcCode && lc.session) {
          if (!lmsCourseSessionMap[lcCode]) lmsCourseSessionMap[lcCode] = [];
          lmsCourseSessionMap[lcCode].push({
            session: (lc.session || "").trim(),
            level: String(lc.level || ""),
            term: String(lc.term || ""),
          });
        }
      }

      for (const assignment of matchingCodeAssignments) {
        const reasons = [];

        // Authoritative Session check
        let authSession = normalizeSession(assignment.session);
        if (!authSession) {
          const lmsEntries = lmsCourseSessionMap[assignment.code] || [];
          if (lmsEntries.length > 0) {
            const lmsLevelMatch = lmsEntries.find((e) => {
              const eLvl = normalizeLvl(e.level);
              const eTrm = normalizeLvl(e.term);
              return (eLvl && uploadedLevel ? eLvl === uploadedLevel : true) &&
                     (eTrm && uploadedTerm ? eTrm === uploadedTerm : true);
            });
            if (lmsLevelMatch) {
              authSession = normalizeSession(lmsLevelMatch.session);
            } else {
              authSession = normalizeSession(lmsEntries[0].session);
            }
          }
        }

        if (authSession && uploadedSessionNorm) {
          if (authSession !== uploadedSessionNorm) {
            reasons.push(
              `Session mismatch: Excel has "${headerSession || "N/A"}" but this course (${assignment.rawCode || assignment.code}) requires Session "${assignment.session || authSession}"`
            );
          }
        } else if (authSession && !uploadedSessionNorm) {
          reasons.push(
            `Session not found in Excel header: This course requires Session "${assignment.session || authSession}". Please add "Session: XXXX-XX" in your Excel header.`
          );
        } else if (!authSession && uploadedSessionNorm) {
          reasons.push(
            `Session not configured for this assignment in the system. Please ask admin to set the session for course "${assignment.rawCode || assignment.code}".`
          );
        }

        // Strict Level & Term check
        const assLT = assignment.levelTerm || "";
        const assLvlMatch = assLT.match(/level\s*:?\s*(\d+)/i) || assLT.match(/L(\d+)/i);
        const assTrmMatch = assLT.match(/term\s*:?\s*(\d+)/i) || assLT.match(/T(\d+)/i);
        const assLvl = assLvlMatch ? assLvlMatch[1] : "";
        const assTrm = assTrmMatch ? assTrmMatch[1] : "";

        if (assLvl && uploadedLevel && assLvl !== uploadedLevel) {
          reasons.push(
            `Level mismatch: Excel header specifies "Level ${uploadedLevel}" but this course requires "Level ${assLvl}"`
          );
        } else if (assLvl && !uploadedLevel) {
          reasons.push(
            `Level missing in Excel header: This course requires "Level ${assLvl}". Please specify "Level: ${assLvl}" in your Excel header.`
          );
        }

        if (assTrm && uploadedTerm && assTrm !== uploadedTerm) {
          reasons.push(
            `Term mismatch: Excel header specifies "Term ${uploadedTerm}" but this course requires "Term ${assTrm}"`
          );
        } else if (assTrm && !uploadedTerm) {
          reasons.push(
            `Term missing in Excel header: This course requires "Term ${assTrm}". Please specify "Term: ${assTrm}" in your Excel header.`
          );
        }

        // Department check
        if (assignment.department && department) {
          if (assignment.department.toUpperCase() !== department.toUpperCase()) {
            reasons.push(
              `Department mismatch: Excel header specifies "${department}" but this course requires "${assignment.department}"`
            );
          }
        }

        if (reasons.length === 0) {
          isStrictMatch = true;
          break;
        } else {
          mismatchReasons.push(
            `  [Course: ${assignment.rawCode || assignment.code} | Section: Session ${assignment.session || authSession || "?"}, ${assignment.levelTerm || "Level/Term unspecified"}]\n` +
            reasons.map((r) => `    ❌ ${r}`).join("\n")
          );
        }
      }

      if (!isStrictMatch) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}

        const warningLines = [
          `⛔ UPLOAD BLOCKED: Marksheet Parameters Do Not Match Your Assignment!`,
          ``,
          `You uploaded an Excel file for Course "${courseCode}" with these parameters:`,
          headerSession ? `  • Session      : ${headerSession}` : `  • Session      : Not specified in Excel`,
          (level || term) ? `  • Level & Term : Level ${level || "?"} - Term ${term || "?"}` : `  • Level & Term : Not specified in Excel`,
          department ? `  • Department   : ${department}` : null,
          ``,
          `But this course is assigned to you ONLY for these specific section(s):`,
          ...matchingCodeAssignments.map((a) =>
            `  ✅ Session: ${a.session || "Any"} | ${a.levelTerm || "Level/Term unspecified"}${a.department ? ` | Dept: ${a.department}` : ""}`
          ),
          ``,
          `Detected Mismatch Reasons:`,
          ...mismatchReasons,
          ``,
          `Please correct Session / Level / Term in your Excel file header to match your assigned section and re-upload.`,
        ].filter((l) => l !== null);

        return res.status(400).json({ error: warningLines.join("\n") });
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

    // Overwrite behavior: Only delete previous assessment records if ALL parameters match
    // (courseCode, session, level, term, department, courseTitle, courseType, creditHour)
    // If ANY parameter differs, keep previous record so a new separate section is created!
    const targetCleanCourseCode = courseCode.trim();
    const cleanRegex = new RegExp(targetCleanCourseCode.replace(/[^a-zA-Z0-9]/g, ""), "i");
    const targetSession = (headerSession || "").trim();

    const deleteFilter = {
      $or: [
        { courseCode: targetCleanCourseCode },
        { courseCode: { $regex: cleanRegex } }
      ]
    };
    if (targetSession) deleteFilter.session = targetSession;
    if (level) deleteFilter.level = level;
    if (term) deleteFilter.term = term;
    if (department) deleteFilter.department = department;

    await Assessment.deleteMany(deleteFilter);

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

    const studentIdStr = student.studentId || "";
    const studentObjId = student._id;

    const Registration = require("../models/Registration");
    const Student = require("../models/Student");
    const studentProfile = await Student.findOne({
      $or: [
        { universityEmail: student.email },
        { universityEmail: { $regex: new RegExp(`^${(student.email || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
      ]
    }).lean();

    const effStudentId = studentProfile?.studentId || studentIdStr;

    // Fetch student's APPROVED registrations ONLY
    const approvedRegs = await Registration.find({
      $or: [
        { user: studentObjId },
        ...(effStudentId ? [{ studentId: effStudentId }] : [])
      ],
      status: "Approved"
    }).lean();

    const approvedLevelTerms = new Set();
    const approvedCourseCodes = new Set();

    approvedRegs.forEach((reg) => {
      const lDigit = (reg.level || "").replace(/\D/g, "");
      const tDigit = (reg.term || "").replace(/\D/g, "");
      if (lDigit && tDigit) {
        approvedLevelTerms.add(`Level ${lDigit} - Term ${tDigit}`);
        approvedLevelTerms.add(`Level ${lDigit} Term ${tDigit}`);
        approvedLevelTerms.add(`L${lDigit}T${tDigit}`);
        approvedLevelTerms.add(`${lDigit}-${tDigit}`);
        approvedLevelTerms.add(`${lDigit}_${tDigit}`);
      }
      (reg.selectedCourses || []).forEach((sc) => {
        const codeClean = (sc.courseCode || sc.code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (codeClean) approvedCourseCodes.add(codeClean);
      });
    });

    const rawAssessments = await Assessment.find({
      $or: [
        { studentIdNumber: effStudentId },
        { studentIdNumber: studentIdStr },
        { studentId: studentObjId }
      ]
    })
      .populate("uploadedBy", "name email")
      .sort({ courseCode: 1 })
      .lean();

    // STRICT FILTER: If student has no approved registration for a course / Level-Term, DO NOT SHOW assessment marks!
    const filteredAssessments = rawAssessments.filter((asm) => {
      if (approvedRegs.length === 0) return false;

      const codeClean = (asm.courseCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const asmLDigit = (asm.level || "").replace(/\D/g, "");
      const asmTDigit = (asm.term || "").replace(/\D/g, "");

      if (codeClean && approvedCourseCodes.has(codeClean)) return true;

      if (asmLDigit && asmTDigit) {
        const asmLTKey = `Level ${asmLDigit} - Term ${asmTDigit}`;
        if (approvedLevelTerms.has(asmLTKey)) return true;
      }

      return false;
    });

    res.json({ assessments: filteredAssessments });
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
