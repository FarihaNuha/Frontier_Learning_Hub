const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const CourseImport = require("../models/CourseImport");
const Adviser = require("../models/Adviser");
const Registration = require("../models/Registration");
const Enrollment = require("../models/Enrollment");
const Payment = require("../models/Payment");
const RegistrationCalendar = require("../models/RegistrationCalendar");

// Helper: safely create notification + socket emit + non-blocking email dispatch
const createNotification = async (userId, title, message) => {
  try {
    const Notification = require("../models/Notification");
    const User = require("../models/User");
    const { queueEmail } = require("../services/emailService");
    const { getIO } = require("../socket");

    const notif = await Notification.create({ userId, title, message, type: "general" });

    // Live socket notification
    try {
      const io = getIO();
      if (io) {
        io.emit("new_notification", { userId: userId.toString(), notif });
      }
    } catch (sErr) {}

    // Non-blocking background email dispatch
    try {
      const recipient = await User.findById(userId).lean();
      if (recipient && recipient.email) {
        queueEmail(
          recipient.email,
          title,
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 16px 20px; border-radius: 8px 8px 0 0; color: #ffffff;">
              <h2 style="margin: 0; font-size: 20px;">${title}</h2>
            </div>
            <div style="padding: 20px; color: #2C4B66;">
              <p style="font-size: 15px; margin-top: 0;">Hello <strong>${recipient.name || "User"}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.6; color: #4A5568;">${message}</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
              <p style="font-size: 12px; color: #718096; margin: 0; text-align: center;">UFTB Moodle Academic Registration System</p>
            </div>
          </div>
          `
        );
      }
    } catch (eErr) {
      console.error("Email notice error:", eErr.message);
    }
  } catch (e) {
    console.error("Notification create error (non-fatal):", e.message);
  }
};



// Helper for flexible Department & Program matching
const isDepartmentAndProgramMatch = (courseDept, courseProg, studentDept, studentProg) => {
  const cDept = String(courseDept || "").trim();
  const sDept = String(studentDept || "").trim();

  const getDeptKey = (dStr) => {
    const clean = dStr.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (!clean) return "";
    if (clean.includes("edte") || clean.includes("educationaltechnology")) return "edte";
    if (clean.includes("cse") || clean.includes("computerscience")) return "cse";
    if (clean.includes("swe") || clean.includes("softwareengineering")) return "swe";
    if (clean.includes("eee") || clean.includes("electrical")) return "eee";
    if (clean.includes("ce") || clean.includes("civil")) return "ce";
    if (clean.includes("bba") || clean.includes("business")) return "bba";
    if (clean.includes("english")) return "eng";
    return clean;
  };

  const cKey = getDeptKey(cDept);
  const sKey = getDeptKey(sDept);

  if (cKey && sKey && cKey !== sKey) {
    return false;
  }

  const cProg = String(courseProg || "").toLowerCase();
  const sProg = String(studentProg || "").toLowerCase();

  const isMscCourse = cProg.includes("m.sc") || cProg.includes("msc") || cProg.includes("master");
  const isMscStudent = sProg.includes("m.sc") || sProg.includes("msc") || sProg.includes("master");

  if (isMscCourse !== isMscStudent) {
    return false;
  }

  return true;
};

// Helper to find matching registration calendar rule for a student's Session, Department, Level & Term
const findRegistrationCalendarRule = async (studentObj, levelString, termString) => {
  const sessStr = (studentObj.session || "").trim();
  const sessDigits = sessStr.match(/\d+/g);
  const sessRegex = sessDigits && sessDigits.length >= 2
    ? new RegExp(`${sessDigits[0]}.*${sessDigits[1]}`, "i")
    : new RegExp(sessStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");

  const levelDigits = (levelString || "").replace(/[^0-9]/g, "");
  const termDigits = (termString || "").replace(/[^0-9]/g, "");

  const levelRegex = levelDigits ? new RegExp(`level[\\s-]*${levelDigits}`, "i") : new RegExp((levelString || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
  const termRegex = termDigits ? new RegExp(`term[\\s-]*${termDigits}`, "i") : new RegExp((termString || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");

  // Fetch all calendar rules for Level & Term
  const allCalendars = await RegistrationCalendar.find({
    $and: [
      {
        $or: [
          { session: { $regex: sessRegex } },
          { session: "All Sessions" },
          { session: { $regex: new RegExp(sessStr.replace("-", "[-\\s]?"), "i") } }
        ]
      },
      { level: { $regex: levelRegex } },
      { term: { $regex: termRegex } },
    ]
  }).lean();

  if (!allCalendars || allCalendars.length === 0) {
    const fallbackCalendars = await RegistrationCalendar.find({
      level: { $regex: levelRegex },
      term: { $regex: termRegex },
    }).lean();

    if (fallbackCalendars && fallbackCalendars.length > 0) {
      for (const cal of fallbackCalendars) {
        if (
          (cal.session === "All Sessions" || (cal.session && cal.session.includes(sessStr))) &&
          (cal.department === "All Departments" || isDepartmentAndProgramMatch(cal.department, cal.program, studentObj.department, studentObj.program))
        ) {
          return cal;
        }
      }
    }
    return null;
  }

  for (const cal of allCalendars) {
    if (
      cal.department === "All Departments" ||
      isDepartmentAndProgramMatch(cal.department, cal.program, studentObj.department, studentObj.program)
    ) {
      return cal;
    }
  }

  return allCalendars[0] || null;
};

// Fetch available courses for student based on Dept, Level, and Term
exports.getAvailableCourses = async (req, res) => {
  try {
    const student = await Student.findOne({ universityEmail: req.user.email });
    if (!student) {
      return res.status(404).json({ error: "Student record not found." });
    }

    const levelStr = req.query.level || `Level-${student.currentLevel}`;
    const termStr = req.query.term || `Term-${student.currentTerm}`;

    const levelDigits = levelStr.replace(/[^0-9]/g, "");
    const termDigits = termStr.replace(/[^0-9]/g, "");

    const levelRegex = levelDigits ? new RegExp(`level[\\s-]*${levelDigits}`, "i") : new RegExp(levelStr.replace("-", "[-\\s]?"), "i");
    const termRegex = termDigits ? new RegExp(`term[\\s-]*${termDigits}`, "i") : new RegExp(termStr.replace("-", "[-\\s]?"), "i");

    // Fetch candidate courses for requested Level & Term
    const candidateCourses = await CourseImport.find({
      level: { $regex: levelRegex },
      term: { $regex: termRegex },
    }).lean();

    // Strictly filter courses matching student's assigned Department and Program
    const courses = candidateCourses.filter((c) =>
      isDepartmentAndProgramMatch(c.department, c.program, student.department, student.program)
    );

    // Check calendar window for this student's specific session
    const calendarDoc = await findRegistrationCalendarRule(student, levelStr, termStr);

    let isCalendarOpen = false;
    let calendarMessage = "";

    if (calendarDoc) {
      const now = new Date();
      const startValid = !calendarDoc.startDate || now >= new Date(calendarDoc.startDate);
      const endValid = !calendarDoc.endDate || now <= new Date(calendarDoc.endDate);
      if (calendarDoc.isOpen && startValid && endValid) {
        isCalendarOpen = true;
      } else {
        isCalendarOpen = false;
        calendarMessage = `Registration window for Session ${student.session} (${levelStr} ${termStr}) is currently closed or expired.`;
      }
    } else {
      isCalendarOpen = false;
      calendarMessage = `Registration is CLOSED. UMS Admin has not opened a registration window for Session ${student.session} (${levelStr} ${termStr}).`;
    }

    res.json({
      student,
      level: levelStr,
      term: termStr,
      courses,
      calendar: {
        isOpen: isCalendarOpen,
        message: calendarMessage,
        maxCredits: calendarDoc?.maxCredits || 24,
        minCredits: calendarDoc?.minCredits || 9,
        startDate: calendarDoc?.startDate || null,
        endDate: calendarDoc?.endDate || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Submit course registration
exports.submitRegistration = async (req, res) => {
  try {
    const { selectedCourseIds } = req.body;
    if (!Array.isArray(selectedCourseIds) || selectedCourseIds.length === 0) {
      return res.status(400).json({ error: "Please select at least one course." });
    }

    const student = await Student.findOne({ universityEmail: req.user.email });
    if (!student) {
      return res.status(404).json({ error: "Student profile record not found." });
    }

    const levelStr = `Level-${student.currentLevel}`;
    const termStr = `Term-${student.currentTerm}`;

    // Strictly validate active calendar window for this student's Session & Level/Term
    const calendarDoc = await findRegistrationCalendarRule(student, levelStr, termStr);

    if (!calendarDoc) {
      return res.status(400).json({
        error: `Registration Blocked: Registration is currently CLOSED for Session ${student.session} (${levelStr} ${termStr}). UMS Admin has only opened registration for active session rules.`
      });
    }

    const now = new Date();
    const startValid = !calendarDoc.startDate || now >= new Date(calendarDoc.startDate);
    const endValid = !calendarDoc.endDate || now <= new Date(calendarDoc.endDate);

    if (!calendarDoc.isOpen || !startValid || !endValid) {
      return res.status(400).json({
        error: `Registration Blocked: Registration period for Session ${student.session} (${levelStr} ${termStr}) is closed or expired.`
      });
    }

    if (calendarDoc.program) {
      const isRuleMsc = calendarDoc.program.toLowerCase().includes("m.sc");
      const isStudMsc = (student.program || "").toLowerCase().includes("m.sc");
      if (isRuleMsc !== isStudMsc) {
        return res.status(400).json({ error: `Registration Blocked: Registration Rule (${calendarDoc.program}) does not match your assigned program (${student.program || "B.Sc."}).` });
      }
    }

    // Fetch full course objects
    const courses = await CourseImport.find({ _id: { $in: selectedCourseIds } });

    // Scope Check: Ensure all courses strictly match the student's assigned Department & Program
    for (const c of courses) {
      if (!isDepartmentAndProgramMatch(c.department, c.program, student.department, student.program)) {
        return res.status(400).json({
          error: `Registration Blocked: Course ${c.courseCode} (${c.courseTitle}) belongs to ${c.department || "another department"}. You can only register for courses in your assigned department (${student.department}).`
        });
      }
    }

    const selectedCoursesData = courses.map((c) => ({
      courseCode: c.courseCode,
      courseTitle: c.courseTitle,
      creditHours: c.creditHours,
      courseType: c.courseType,
    }));

    const totalCredits = selectedCoursesData.reduce((acc, curr) => acc + curr.creditHours, 0);

    const minCred = calendarDoc ? calendarDoc.minCredits : 9;
    const maxCred = calendarDoc ? calendarDoc.maxCredits : 25;

    if (totalCredits < minCred || totalCredits > maxCred) {
      return res.status(400).json({
        error: `Total selected credits (${totalCredits}) must be between ${minCred} and ${maxCred} credits.`,
      });
    }

    // Find assigned adviser cleanly matching session & batch or department
    const Teacher = require("../models/Teacher");
    let adviserMatch = await Adviser.findOne({
      $or: [
        { session: student.session, assignedBatch: student.batch },
        { session: student.session, department: student.department },
        { session: student.session }
      ]
    }).lean();

    let resolvedAdviserEmail = adviserMatch?.teacherEmail || "";

    // Sync with real Teacher model email if available
    if (adviserMatch) {
      const realTeacher = await Teacher.findOne({
        $or: [
          { email: adviserMatch.teacherEmail },
          { teacherId: adviserMatch.teacherId },
          ...(adviserMatch.teacherName ? [{ name: { $regex: new RegExp(adviserMatch.teacherName.trim(), "i") } }] : []),
          { adviserSession: student.session },
          { assignedSession: student.session }
        ]
      }).lean();
      if (realTeacher?.email) {
        resolvedAdviserEmail = realTeacher.email.toLowerCase().trim();
      }
    } else {
      const fallbackTeacher = await Teacher.findOne({
        $or: [
          { adviserSession: student.session },
          { assignedSession: student.session }
        ]
      }).lean();
      if (fallbackTeacher?.email) {
        resolvedAdviserEmail = fallbackTeacher.email.toLowerCase().trim();
      }
    }

    const { calculateRegistrationFee } = require("./registrationPaymentController");
    const feeCalc = calculateRegistrationFee(selectedCoursesData);
    const totalPayable = feeCalc.totalAmount;

    // Create or update registration
    const registration = await Registration.findOneAndUpdate(
      {
        studentId: student.studentId,
        level: levelStr,
        term: termStr,
      },
      {
        user: req.user.id,
        department: student.department,
        session: student.session,
        selectedCourses: selectedCoursesData,
        totalCredits,
        registrationFee: totalPayable,
        totalPayable,
        status: "Pending Adviser Approval",
        adviserEmail: resolvedAdviserEmail,
        rejectionReason: "",
      },
      { upsert: true, new: true }
    );

    // Create Payment Record (Pending)
    await Payment.findOneAndUpdate(
      {
        studentId: student.studentId,
        level: levelStr,
        term: termStr,
      },
      {
        user: req.user.id,
        session: student.session,
        totalAmount: totalPayable,
        paidAmount: 0,
        dueAmount: totalPayable,
        paymentStatus: "Pending",
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Create Notification Event for Student
    await createNotification(
      req.user.id,
      "Registration Submitted",
      `Your registration request for ${levelStr} ${termStr} (${totalCredits} credits) has been submitted and is pending adviser approval.`
    );

    // Notify Adviser Teacher
    if (adviserMatch && adviserMatch.teacherEmail) {
      const teacherUser = await User.findOne({ email: adviserMatch.teacherEmail });
      if (teacherUser) {
        await createNotification(
          teacherUser._id,
          "New Registration Request 📋",
          `Student ${student.name} (${student.studentId}) submitted course registration for ${levelStr} ${termStr} (${totalCredits} credits).`
        );
      }
    }

    res.json({ message: "Registration submitted successfully.", registration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper: Ensure real LMS Course document exists for approved course registration
// SESSION-ISOLATED: each (courseCode + session) pair gets its own unique LMS Course card.
// A course card created for session 2024-25 will NEVER be reused for session 2025-26.
const linkOrCreateLmsCourse = async (courseItem, reg, studentDept) => {
  try {
    const Course = require("../models/Course");
    const User = require("../models/User");

    const codeStr = (courseItem.courseCode || courseItem.code || "COURSE").toUpperCase().trim();
    const sessionStr = (reg.session || "").trim();

    // FIXED: Always filter by session so each academic session gets its own course card
    const courseQuery = { displayCode: codeStr };
    if (sessionStr) courseQuery.session = sessionStr;
    let lmsCourse = await Course.findOne(courseQuery);

    if (!lmsCourse) {
      let teacherId = null;
      if (reg.adviserEmail) {
        const advTeacher = await User.findOne({
          email: { $regex: new RegExp(`^${reg.adviserEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
        });
        if (advTeacher) teacherId = advTeacher._id;
      }
      if (!teacherId) {
        const anyTeacher = await User.findOne({ role: "teacher" });
        teacherId = anyTeacher ? anyTeacher._id : reg.user;
      }

      // Normalize department enum for Course model
      let normalizedDept = "EDTE";
      const rawDept = String(studentDept || reg.department || "").toUpperCase();
      if (rawDept.includes("IRE")) normalizedDept = "IRE";
      else if (rawDept.includes("SOFTWARE")) normalizedDept = "Software";
      else if (rawDept.includes("CYBER")) normalizedDept = "Cyber";
      else if (rawDept.includes("DATA")) normalizedDept = "DataScience";
      else if (rawDept.includes("GENERAL")) normalizedDept = "General";

      const joinCode = Math.floor(100000 + Math.random() * 900000).toString();
      lmsCourse = await Course.create({
        name: courseItem.courseTitle || courseItem.title || courseItem.name || codeStr,
        displayCode: codeStr,
        session: reg.session || "2023-24",
        department: normalizedDept,
        teacher: teacherId,
        joinCode,
        students: [reg.user]
      });
    } else {
      if (!lmsCourse.students.some(s => s.toString() === reg.user.toString())) {
        lmsCourse.students.push(reg.user);
        await lmsCourse.save();
      }
    }
    return lmsCourse;
  } catch (err) {
    console.error("Non-fatal error in linkOrCreateLmsCourse:", err.message);
    return null;
  }
};

// Get current student registration status
exports.getMyRegistrations = async (req, res) => {
  try {
    const student = await Student.findOne({ universityEmail: req.user.email });
    if (!student) {
      return res.json({ registrations: [], currentLevel: 1, currentTerm: 1 });
    }

    const registrations = await Registration.find({ studentId: student.studentId });
    res.json({
      student,
      currentLevel: student.currentLevel,
      currentTerm: student.currentTerm,
      registrations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ADVISER: Get pending registration requests
exports.getPendingRegistrationsForAdviser = async (req, res) => {
  try {
    const Teacher = require("../models/Teacher");
    const teacherEmailClean = (req.user.email || "").toLowerCase().trim();

    const teacherDoc = await Teacher.findOne({
      $or: [
        { email: teacherEmailClean },
        { email: { $regex: new RegExp(`^${teacherEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
      ]
    }).lean();

    // Find all adviser pairings matching this teacher by email OR teacherId OR teacherName
    const searchCriteria = [
      { teacherEmail: { $regex: new RegExp(`^${teacherEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
    ];
    if (teacherDoc?.teacherId) {
      searchCriteria.push({ teacherId: String(teacherDoc.teacherId).trim() });
    }
    if (teacherDoc?.name) {
      searchCriteria.push({ teacherName: { $regex: new RegExp(teacherDoc.name.trim(), "i") } });
    }

    const adviserRecords = await Adviser.find({ $or: searchCriteria }).lean();

    const batches = adviserRecords.map((a) => a.assignedBatch).filter(Boolean);
    const sessions = adviserRecords.map((a) => a.session).filter(Boolean);

    if (teacherDoc?.assignedSession && !sessions.includes(teacherDoc.assignedSession)) {
      sessions.push(teacherDoc.assignedSession);
    }
    if (teacherDoc?.adviserSession && !sessions.includes(teacherDoc.adviserSession)) {
      sessions.push(teacherDoc.adviserSession);
    }

    // Find students matching batch & session assigned to this teacher
    const studentQueryCriteria = [];
    if (batches.length > 0) studentQueryCriteria.push({ batch: { $in: batches } });
    if (sessions.length > 0) studentQueryCriteria.push({ session: { $in: sessions } });

    const students = studentQueryCriteria.length > 0 ? await Student.find({ $or: studentQueryCriteria }).lean() : [];
    const studentIds = students.map((s) => s.studentId);

    // Ensure registrations match THIS teacher's adviserEmail OR match THIS teacher's assigned batch/session/department
    const regOrCriteria = [
      { adviserEmail: { $regex: new RegExp(`^${teacherEmailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
    ];

    if (studentIds.length > 0) {
      regOrCriteria.push({ studentId: { $in: studentIds } });
    }

    if (sessions.length > 0) {
      regOrCriteria.push({ session: { $in: sessions } });
    }

    if (teacherDoc?.department) {
      const deptClean = String(teacherDoc.department || "").trim();
      if (deptClean && deptClean.length >= 3) {
        regOrCriteria.push({ department: { $regex: new RegExp(deptClean, "i") } });
      }
    }

    const RegistrationPayment = require("../models/RegistrationPayment");

    const pendingRegs = await Registration.find({
      status: "Pending Adviser Approval",
      $or: regOrCriteria,
    }).populate("user", "name email");

    const { calculateRegistrationFee } = require("./registrationPaymentController");

    const pendingWithPayment = await Promise.all(
      pendingRegs.map(async (rDoc) => {
        const reg = rDoc.toObject();
        const payDoc = await RegistrationPayment.findOne({
          studentId: reg.studentId,
          session: reg.session,
          level: reg.level,
          term: reg.term,
        }).lean();

        const feeCalc = calculateRegistrationFee(reg.selectedCourses || []);
        const realTotal = payDoc ? payDoc.totalAmount : feeCalc.totalAmount;

        reg.paymentStatus = payDoc ? payDoc.paymentStatus : (reg.paymentStatus || "Pending");
        reg.totalAmount = realTotal;
        reg.paidAmount = reg.paymentStatus === "Paid" ? realTotal : 0;
        reg.dueAmount = reg.paymentStatus === "Paid" ? 0 : realTotal;
        reg.transactionId = payDoc ? payDoc.transactionId : "";

        // Calculate previous unpaid semester dues for Adviser review
        const parseLevelTermScore = (lvlStr, trmStr) => {
          const l = Number(String(lvlStr || "").replace(/[^0-9]/g, "")) || 1;
          const t = Number(String(trmStr || "").replace(/[^0-9]/g, "")) || 1;
          return l * 10 + t;
        };

        const currentRegScore = parseLevelTermScore(reg.level, reg.term);

        const allStudentRegs = await Registration.find({ studentId: reg.studentId }).lean();
        const allStudentPays = await RegistrationPayment.find({ studentId: reg.studentId }).lean();

        const previousUnpaidSemesters = [];
        let totalPreviousDues = 0;

        for (let l = 1; l <= 4; l++) {
          for (let t = 1; t <= 2; t++) {
            const semScore = l * 10 + t;
            if (semScore >= currentRegScore) continue;

            const levelPattern = new RegExp(`level[\\s-]*${l}`, "i");
            const termPattern = new RegExp(`term[\\s-]*${t}`, "i");

            const matchingPaidPay = allStudentPays.find(
              (p) => levelPattern.test(p.level || "") && termPattern.test(p.term || "") && p.paymentStatus === "Paid"
            );
            const matchingPaidReg = allStudentRegs.find(
              (r) => levelPattern.test(r.level || "") && termPattern.test(r.term || "") && r.paymentStatus === "Paid"
            );

            if (!matchingPaidPay && !matchingPaidReg) {
              const matchingUnpaidReg = allStudentRegs.find(
                (r) => levelPattern.test(r.level || "") && termPattern.test(r.term || "")
              );

              let dueAmount = 0;
              if (matchingUnpaidReg && matchingUnpaidReg.totalPayable) {
                dueAmount = matchingUnpaidReg.totalPayable;
              } else if (matchingUnpaidReg && matchingUnpaidReg.selectedCourses?.length > 0) {
                dueAmount = calculateRegistrationFee(matchingUnpaidReg.selectedCourses).totalAmount;
              } else {
                const CourseImport = require("../models/CourseImport");
                const levelCourses = await CourseImport.find({
                  level: { $regex: new RegExp(`level[\\s-]*${l}`, "i") },
                  term: { $regex: new RegExp(`term[\\s-]*${t}`, "i") },
                  ...(reg.department ? { department: { $regex: new RegExp(reg.department.slice(0, 4), "i") } } : {})
                }).lean();

                if (levelCourses.length > 0) {
                  dueAmount = calculateRegistrationFee(levelCourses).totalAmount;
                } else {
                  dueAmount = calculateRegistrationFee([
                    { creditHours: 3, courseType: "Theory" },
                    { creditHours: 3, courseType: "Theory" },
                    { creditHours: 3, courseType: "Theory" },
                    { creditHours: 3, courseType: "Theory" },
                    { creditHours: 3, courseType: "Theory" },
                    { creditHours: 1, courseType: "Sessional" },
                    { creditHours: 1, courseType: "Sessional" },
                    { creditHours: 1, courseType: "Sessional" }
                  ]).totalAmount;
                }
              }

              previousUnpaidSemesters.push({
                level: `Level ${l}`,
                term: `Term ${t}`,
                session: matchingUnpaidReg?.session || reg.session || "2023-24",
                dueAmount,
                status: "Previous Dues Pending",
              });
              totalPreviousDues += dueAmount;
            }
          }
        }

        reg.previousUnpaidSemesters = previousUnpaidSemesters;
        reg.totalPreviousDues = totalPreviousDues;
        reg.hasPreviousDues = previousUnpaidSemesters.length > 0;

        return reg;
      })
    );

    res.json(pendingWithPayment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ADVISER: Approve single registration
exports.approveRegistration = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) {
      return res.status(404).json({ error: "Registration record not found." });
    }

    reg.status = "Approved";
    await reg.save();

    const student = await Student.findOne({ studentId: reg.studentId }).lean();

    // Automatically create Enrollment records and real LMS Courses in parallel
    await Promise.all(
      (reg.selectedCourses || []).map(async (courseItem) => {
        try {
          const lmsCourse = await linkOrCreateLmsCourse(courseItem, reg, student?.department);

          // FIXED: Include session in upsert filter so each session gets its own Enrollment record
          await Enrollment.findOneAndUpdate(
            {
              student: reg.user,
              courseCode: courseItem.courseCode,
              session: reg.session,
            },
            {
              studentId: reg.studentId,
              ...(lmsCourse ? { course: lmsCourse._id } : {}),
              courseTitle: courseItem.courseTitle,
              session: reg.session,
              level: reg.level,
              term: reg.term,
            },
            { upsert: true, returnDocument: "after" }
          );
        } catch (eErr) {
          console.error("Non-fatal enrollment error:", eErr.message);
        }
      })
    );

    // Create Notification Event
    try {
      await createNotification(
        reg.user,
        "Registration Approved! 🎉",
        `Your registration for ${reg.level} ${reg.term} has been approved by your Adviser. LMS course access is now active.`
      );
    } catch (nErr) {
      console.error("Non-fatal notification error:", nErr.message);
    }

    res.json({ message: "Registration approved and LMS enrollments created.", registration: reg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ADVISER: Reject single registration
exports.rejectRegistration = async (req, res) => {
  try {
    const { reason } = req.body;
    const reg = await Registration.findById(req.params.id);
    if (!reg) {
      return res.status(404).json({ error: "Registration record not found." });
    }

    reg.status = "Rejected";
    reg.rejectionReason = reason || "Registration details rejected by adviser.";
    await reg.save();

    // Create Notification Event
    await createNotification(
      reg.user,
      "Registration Rejected ⚠️",
      `Your registration for ${reg.level} ${reg.term} was rejected. Reason: ${reg.rejectionReason}`
    );

    res.json({ message: "Registration rejected.", registration: reg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ADVISER: Approve All pending
exports.approveAllPendingRegistrations = async (req, res) => {
  try {
    const adviserRecords = await Adviser.find({ teacherEmail: req.user.email }).lean();
    const batches = adviserRecords.map((a) => a.assignedBatch);
    const sessions = adviserRecords.map((a) => a.session);

    const students = await Student.find({ batch: { $in: batches }, session: { $in: sessions } }).lean();
    const studentIds = students.map((s) => s.studentId);

    const pendingRegs = await Registration.find({
      studentId: { $in: studentIds },
      status: "Pending Adviser Approval",
    });

    await Promise.all(
      pendingRegs.map(async (reg) => {
        reg.status = "Approved";
        await reg.save();

        const student = students.find((s) => s.studentId === reg.studentId);

        await Promise.all(
          (reg.selectedCourses || []).map(async (courseItem) => {
            const lmsCourse = await linkOrCreateLmsCourse(courseItem, reg, student?.department);
            // FIXED: Include session in upsert filter so each session gets its own Enrollment record
            await Enrollment.findOneAndUpdate(
              { student: reg.user, courseCode: courseItem.courseCode, session: reg.session },
              {
                studentId: reg.studentId,
                course: lmsCourse ? lmsCourse._id : undefined,
                courseTitle: courseItem.courseTitle,
                session: reg.session,
                level: reg.level,
                term: reg.term,
              },
              { upsert: true, returnDocument: "after" }
            );
          })
        );

        await createNotification(
          reg.user,
          "Registration Approved! 🎉",
          `Your registration for ${reg.level} ${reg.term} has been approved by your Adviser.`
        );
      })
    );

    res.json({ message: `Successfully approved ${pendingRegs.length} registration requests.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
