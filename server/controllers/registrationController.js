const User = require("../models/User");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const CourseImport = require("../models/CourseImport");
const Adviser = require("../models/Adviser");
const Registration = require("../models/Registration");
const Enrollment = require("../models/Enrollment");
const Payment = require("../models/Payment");
const RegistrationCalendar = require("../models/RegistrationCalendar");

// Helper: safely create notification + socket emit + email dispatch
const createNotification = async (userId, title, message) => {
  try {
    const Notification = require("../models/Notification");
    const User = require("../models/User");
    const { sendEmail } = require("../services/emailService");
    const { getIO } = require("../socket");

    const notif = await Notification.create({ userId, title, message, type: "general" });

    // Live socket notification
    try {
      const io = getIO();
      if (io) {
        io.emit("new_notification", { userId: userId.toString(), notif });
      }
    } catch (sErr) {}

    // Email notification
    try {
      const recipient = await User.findById(userId);
      if (recipient && recipient.email) {
        await sendEmail(
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



// Fetch available courses for student based on Dept, Level, and Term
exports.getAvailableCourses = async (req, res) => {
  try {
    const student = await Student.findOne({ universityEmail: req.user.email });
    if (!student) {
      return res.status(404).json({ error: "Student record not found." });
    }

    const levelStr = req.query.level || `Level-${student.currentLevel}`;
    const termStr = req.query.term || `Term-${student.currentTerm}`;

    // Flexible department matching: 
    // student.department might be "EDTE", "EdTE", "Educational Technology and Engineering", etc.
    // Build a regex that matches any of those variations
    const dept = student.department || "";
    // Build a flexible regex: match exact OR partial (e.g., "EDTE" matches "EdTE" or "Educational Technology...")
    const deptKeywords = dept.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    
    // Try to find courses with flexible department matching
    let courses = await CourseImport.find({
      $and: [
        {
          $or: [
            { department: { $regex: new RegExp(dept, "i") } },
            { department: { $regex: new RegExp(deptKeywords.slice(0, 4), "i") } }, // first 4 chars like "EDTE"→"edte"
          ]
        },
        { level: { $regex: new RegExp(levelStr.replace("-", "[-\\s]?"), "i") } },
        { term: { $regex: new RegExp(termStr.replace("-", "[-\\s]?"), "i") } },
      ]
    });

    // If still no courses, try even broader match (by level+term only, same program)
    if (courses.length === 0) {
      courses = await CourseImport.find({
        level: { $regex: new RegExp(levelStr.replace("-", "[-\\s]?"), "i") },
        term: { $regex: new RegExp(termStr.replace("-", "[-\\s]?"), "i") },
      });
    }

    // Check calendar window
    const calendar = await RegistrationCalendar.findOne({
      $and: [
        {
          $or: [
            { department: { $regex: new RegExp(dept, "i") } },
            { department: { $regex: new RegExp(deptKeywords.slice(0, 4), "i") } },
          ]
        },
        { level: { $regex: new RegExp(levelStr, "i") } },
        { term: { $regex: new RegExp(termStr, "i") } },
      ]
    });

    res.json({
      student,
      level: levelStr,
      term: termStr,
      courses,
      calendar: calendar || {
        isOpen: true,
        maxCredits: 25,
        minCredits: 9,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

    // Fetch calendar constraints
    const calendar = await RegistrationCalendar.findOne({
      department: student.department,
      level: { $regex: new RegExp(levelStr, "i") },
      term: { $regex: new RegExp(termStr, "i") },
    });

    if (calendar) {
      const now = new Date();
      if (!calendar.isOpen || now < new Date(calendar.startDate) || now > new Date(calendar.endDate)) {
        return res.status(400).json({ error: "Registration period is currently closed for your semester." });
      }
    }

    // Fetch full course objects
    const courses = await CourseImport.find({ _id: { $in: selectedCourseIds } });
    const selectedCoursesData = courses.map((c) => ({
      courseCode: c.courseCode,
      courseTitle: c.courseTitle,
      creditHours: c.creditHours,
      courseType: c.courseType,
    }));

    const totalCredits = selectedCoursesData.reduce((acc, curr) => acc + curr.creditHours, 0);

    const minCred = calendar ? calendar.minCredits : 9;
    const maxCred = calendar ? calendar.maxCredits : 25;

    if (totalCredits < minCred || totalCredits > maxCred) {
      return res.status(400).json({
        error: `Total selected credits (${totalCredits}) must be between ${minCred} and ${maxCred} credits.`,
      });
    }

    // Find assigned adviser
    const adviserMatch = await Adviser.findOne({
      session: student.session,
      assignedBatch: student.batch,
    });

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
        adviserEmail: adviserMatch ? adviserMatch.teacherEmail : "",
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
const linkOrCreateLmsCourse = async (courseItem, reg, studentDept) => {
  const Course = require("../models/Course");
  const User = require("../models/User");
  
  let lmsCourse = await Course.findOne({ displayCode: (courseItem.courseCode || "").toUpperCase() });
  if (!lmsCourse) {
    let teacherId = null;
    if (reg.adviserEmail) {
      const advTeacher = await User.findOne({ email: reg.adviserEmail });
      if (advTeacher) teacherId = advTeacher._id;
    }
    if (!teacherId) {
      const anyTeacher = await User.findOne({ role: "teacher" });
      teacherId = anyTeacher ? anyTeacher._id : reg.user;
    }
    const joinCode = Math.floor(100000 + Math.random() * 900000).toString();
    lmsCourse = await Course.create({
      name: courseItem.courseTitle,
      displayCode: (courseItem.courseCode || "").toUpperCase(),
      session: reg.session || "",
      department: studentDept || "EDTE",
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
    // Find all adviser pairings for logged in teacher
    const adviserRecords = await Adviser.find({ teacherEmail: req.user.email });
    if (adviserRecords.length === 0) {
      return res.json([]);
    }

    const batches = adviserRecords.map((a) => a.assignedBatch);
    const sessions = adviserRecords.map((a) => a.session);

    const students = await Student.find({
      batch: { $in: batches },
      session: { $in: sessions },
    });

    const studentIds = students.map((s) => s.studentId);

    const RegistrationPayment = require("../models/RegistrationPayment");

    const pendingRegs = await Registration.find({
      studentId: { $in: studentIds },
      status: "Pending Adviser Approval",
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

        reg.paymentStatus = payDoc ? payDoc.paymentStatus : "Pending";
        reg.totalAmount = realTotal;
        reg.paidAmount = payDoc && payDoc.paymentStatus === "Paid" ? realTotal : 0;
        reg.dueAmount = reg.paymentStatus === "Paid" ? 0 : realTotal;
        reg.transactionId = payDoc ? payDoc.transactionId : "";
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

    const student = await Student.findOne({ studentId: reg.studentId });

    // Automatically create Enrollment records and real LMS Courses
    for (const courseItem of reg.selectedCourses) {
      const lmsCourse = await linkOrCreateLmsCourse(courseItem, reg, student?.department);
      
      await Enrollment.findOneAndUpdate(
        {
          student: reg.user,
          courseCode: courseItem.courseCode,
        },
        {
          studentId: reg.studentId,
          course: lmsCourse._id,
          courseTitle: courseItem.courseTitle,
          session: reg.session,
          level: reg.level,
          term: reg.term,
        },
        { upsert: true, new: true }
      );
    }

    // Create Notification Event
    await createNotification(
      reg.user,
      "Registration Approved! 🎉",
      `Your registration for ${reg.level} ${reg.term} has been approved by your Adviser. LMS course access is now active.`
    );

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
    const adviserRecords = await Adviser.find({ teacherEmail: req.user.email });
    const batches = adviserRecords.map((a) => a.assignedBatch);
    const sessions = adviserRecords.map((a) => a.session);

    const students = await Student.find({ batch: { $in: batches }, session: { $in: sessions } });
    const studentIds = students.map((s) => s.studentId);

    const pendingRegs = await Registration.find({
      studentId: { $in: studentIds },
      status: "Pending Adviser Approval",
    });

    for (const reg of pendingRegs) {
      reg.status = "Approved";
      await reg.save();

      const student = await Student.findOne({ studentId: reg.studentId });

      for (const courseItem of reg.selectedCourses) {
        const lmsCourse = await linkOrCreateLmsCourse(courseItem, reg, student?.department);
        await Enrollment.findOneAndUpdate(
          { student: reg.user, courseCode: courseItem.courseCode },
          {
            studentId: reg.studentId,
            course: lmsCourse._id,
            courseTitle: courseItem.courseTitle,
            session: reg.session,
            level: reg.level,
            term: reg.term,
          },
          { upsert: true, new: true }
        );
      }

      await createNotification(
        reg.user,
        "Registration Approved! 🎉",
        `Your registration for ${reg.level} ${reg.term} has been approved by your Adviser.`
      );
    }

    res.json({ message: `Successfully approved ${pendingRegs.length} registration requests.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
