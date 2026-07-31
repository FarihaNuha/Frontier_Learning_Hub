const RegistrationPayment = require("../models/RegistrationPayment");
const Registration = require("../models/Registration");
const Student = require("../models/Student");
const User = require("../models/User");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const paymentGatewayService = require("../services/paymentGatewayService");
const { queueEmail } = require("../services/emailService");
const { getIO } = require("../socket");
const mongoose = require("mongoose");

const createAuditLog = async (req, userObj, action, details) => {
  try {
    const user = userObj || req?.user;
    await AuditLog.create({
      user: user?._id || user?.id || user?.uid || null,
      userName: user?.name || "System",
      userEmail: user?.email || "",
      role: user?.role || "system",
      action,
      details,
      ipAddress: req?.ip || req?.headers?.["x-forwarded-for"] || "",
    });
  } catch (err) {
    console.error("Error creating audit log:", err);
  }
};

const FIXED_REGISTRATION_FEES = [
  { name: "BNCC/Rover Scout/Ranger Fee", amount: 150 },
  { name: "Celebration of National and Other Days", amount: 50 },
  { name: "Cultural Fee", amount: 100 },
  { name: "Departmental Seminar Fee", amount: 200 },
  { name: "Exam Fee", amount: 500 },
  { name: "Laboratory Fee", amount: 200 },
  { name: "Medical Fee", amount: 100 },
  { name: "Online Service Fee", amount: 300 },
  { name: "Professional Organization Fees", amount: 100 },
  { name: "Session Fee", amount: 1250 },
  { name: "Society/Club Fee", amount: 50 },
  { name: "Sports Fee", amount: 100 },
  { name: "Deposit•SSLBKash Mobile Banking BKASH-BKash•BGT74852026061462966+", amount: 0 },
];

const FIXED_FEES_TOTAL = FIXED_REGISTRATION_FEES.reduce((acc, f) => acc + f.amount, 0); // 3100

// 1. Dynamic Registration Fee Calculation Helper
const calculateRegistrationFee = (courses = []) => {
  let theoryCount = 0;
  let labCount = 0;

  const coursesWithFee = courses.map((c) => {
    const credits = Number(c.creditHours) || 3;
    const typeStr = (c.courseType || c.type || "").toLowerCase();

    const isLab =
      credits <= 1.5 ||
      typeStr.includes("sessional") ||
      typeStr.includes("lab");

    if (isLab) {
      labCount++;
    } else {
      theoryCount++;
    }

    const fee = isLab ? 100 : 300;
    return {
      courseCode: c.courseCode || c.code || "",
      courseTitle: c.courseTitle || c.title || c.name || "",
      creditHours: credits,
      courseType: isLab ? "Sessional" : "Theory",
      fee,
    };
  });

  const courseSubtotal = theoryCount * 300 + labCount * 100;
  const totalAmount = courseSubtotal + FIXED_FEES_TOTAL;

  return {
    theoryCount,
    labCount,
    courseSubtotal,
    fixedFeesTotal: FIXED_FEES_TOTAL,
    totalAmount,
    coursesWithFee,
    fixedFees: FIXED_REGISTRATION_FEES,
  };
};

exports.calculateRegistrationFee = calculateRegistrationFee;
exports.FIXED_REGISTRATION_FEES = FIXED_REGISTRATION_FEES;


// 2. Initiate or Fetch Registration Payment Record
exports.initiateOrGetPaymentRecord = async (req, res) => {
  try {
    const { registrationId, selectedCourses, session, level, term } = req.body;
    const studentUser = req.user;
    const studentUserId = studentUser.id || studentUser.uid || studentUser._id;

    const studentProfile = await Student.findOne({
      $or: [
        { universityEmail: studentUser.email },
        { universityEmail: { $regex: new RegExp(`^${(studentUser.email || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
        ...(studentUser.studentId ? [{ studentId: studentUser.studentId }] : []),
      ],
    }).lean();

    const studentIdStr = studentProfile?.studentId || studentUser.studentId || "STD_001";

    let regDoc = null;
    if (registrationId) {
      regDoc = await Registration.findById(registrationId);
    }
    if (!regDoc && studentIdStr) {
      const levelFilter = level ? { level: { $regex: new RegExp(level.replace(/[^0-9]/g, ""), "i") } } : {};
      const termFilter = term ? { term: { $regex: new RegExp(term.replace(/[^0-9]/g, ""), "i") } } : {};
      regDoc = await Registration.findOne({
        studentId: studentIdStr,
        ...(session ? { session } : {}),
        ...levelFilter,
        ...termFilter,
      }).sort({ createdAt: -1 });
    }
    if (!regDoc && studentIdStr) {
      regDoc = await Registration.findOne({ studentId: studentIdStr }).sort({ createdAt: -1 });
    }

    const resolvedSession = session || regDoc?.session || studentProfile?.session || "2023-24";
    const resolvedLevel = level || regDoc?.level || (studentProfile?.currentLevel ? `Level-${studentProfile.currentLevel}` : "Level-1");
    const resolvedTerm = term || regDoc?.term || (studentProfile?.currentTerm ? `Term-${studentProfile.currentTerm}` : "Term-1");

    const coursesToCalculate = selectedCourses || regDoc?.selectedCourses || [];
    const feeCalculation = calculateRegistrationFee(coursesToCalculate);

    const paymentIdStr = `REG_PAY_${studentIdStr}_${Date.now().toString(36).toUpperCase()}`;

    const levelRegexp = new RegExp((resolvedLevel || "").replace(/[^0-9]/g, ""), "i");
    const termRegexp = new RegExp((resolvedTerm || "").replace(/[^0-9]/g, ""), "i");

    let paymentDoc = await RegistrationPayment.findOne({
      studentId: studentIdStr,
      session: resolvedSession,
      level: { $regex: levelRegexp },
      term: { $regex: termRegexp },
    });

    if (!paymentDoc) {
      paymentDoc = await RegistrationPayment.create({
        paymentId: paymentIdStr,
        student: studentUserId,
        studentId: studentIdStr,
        studentName: studentUser.name || studentProfile?.name || "Student",
        registration: regDoc ? regDoc._id : null,
        department: studentProfile?.department || studentUser.department || "EDTE",
        session: resolvedSession,
        level: resolvedLevel,
        term: resolvedTerm,
        selectedCourses: feeCalculation.coursesWithFee,
        theoryCount: feeCalculation.theoryCount,
        labCount: feeCalculation.labCount,
        totalAmount: feeCalculation.totalAmount,
        gatewayName: paymentGatewayService.activeGateway,
        paymentStatus: "Pending",
      });
    } else {
      paymentDoc.selectedCourses = feeCalculation.coursesWithFee;
      paymentDoc.theoryCount = feeCalculation.theoryCount;
      paymentDoc.labCount = feeCalculation.labCount;
      paymentDoc.totalAmount = feeCalculation.totalAmount;
      paymentDoc.level = resolvedLevel;
      paymentDoc.term = resolvedTerm;
      if (regDoc) paymentDoc.registration = regDoc._id;
      paymentDoc.updatedAt = new Date();
      await paymentDoc.save();
    }

    const gatewaySession = await paymentGatewayService.initiatePaymentSession({
      paymentId: paymentDoc.paymentId,
      totalAmount: paymentDoc.totalAmount,
      studentInfo: { studentId: studentIdStr, name: studentUser.name },
      courses: paymentDoc.selectedCourses,
    });

    res.json({
      payment: paymentDoc,
      feeBreakdown: {
        theoryCount: feeCalculation.theoryCount,
        labCount: feeCalculation.labCount,
        theoryRate: 300,
        labRate: 100,
        totalAmount: feeCalculation.totalAmount,
      },
      gatewaySession,
    });
  } catch (error) {
    console.error("initiateOrGetPaymentRecord error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 3. Process Online Payment Completion (Simulated Gateway Callback)
exports.processOnlinePayment = async (req, res) => {
  try {
    const { paymentId, registrationId, session, level, term, status } = req.body;
    let paymentDoc = null;

    if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) {
      paymentDoc = await RegistrationPayment.findById(paymentId);
    }
    if (!paymentDoc && paymentId) {
      paymentDoc = await RegistrationPayment.findOne({ paymentId });
    }
    if (!paymentDoc && registrationId) {
      paymentDoc = await RegistrationPayment.findOne({ registration: registrationId });
    }

    const studentUserId = req.user._id || req.user.id || req.user.uid;
    const studentUser = await User.findById(studentUserId).lean();
    const studentProfile = await Student.findOne({
      $or: [
        { universityEmail: req.user.email },
        { universityEmail: { $regex: new RegExp(`^${(req.user.email || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }
      ]
    }).lean();
    const studentIdStr = studentProfile?.studentId || studentUser?.studentId || req.user?.studentId;

    if (!paymentDoc && studentIdStr) {
      const levelDigit = (level || "").replace(/[^0-9]/g, "");
      const termDigit = (term || "").replace(/[^0-9]/g, "");

      const levelFilter = levelDigit ? { level: { $regex: new RegExp(levelDigit, "i") } } : {};
      const termFilter = termDigit ? { term: { $regex: new RegExp(termDigit, "i") } } : {};

      paymentDoc = await RegistrationPayment.findOne({
        $or: [{ student: studentUserId }, { studentId: studentIdStr }],
        ...levelFilter,
        ...termFilter,
      }).sort({ createdAt: -1 });
    }

    if (!paymentDoc) {
      let regDoc = null;
      if (registrationId) regDoc = await Registration.findById(registrationId);
      if (!regDoc && studentIdStr) {
        const levelFilter = level ? { level: { $regex: new RegExp((level).replace(/[^0-9]/g, ""), "i") } } : {};
        regDoc = await Registration.findOne({
          $or: [{ user: studentUserId }, { studentId: studentIdStr }],
          ...levelFilter,
        }).sort({ createdAt: -1 });
      }

      const resolvedSession = session || regDoc?.session || studentProfile?.session || "2023-24";
      const resolvedLevel = level || regDoc?.level || (studentProfile?.currentLevel ? `Level-${studentProfile.currentLevel}` : "Level-1");
      const resolvedTerm = term || regDoc?.term || (studentProfile?.currentTerm ? `Term-${studentProfile.currentTerm}` : "Term-1");
      const feeCalculation = calculateRegistrationFee(regDoc?.selectedCourses || []);

      const generatedPaymentId = `REG_PAY_${studentIdStr || "STD"}_${Date.now().toString(36).toUpperCase()}`;

      paymentDoc = await RegistrationPayment.create({
        paymentId: generatedPaymentId,
        student: studentUserId,
        studentId: studentIdStr || "STD",
        studentName: studentUser?.name || studentProfile?.name || "Student",
        registration: regDoc ? regDoc._id : null,
        department: studentProfile?.department || "EDTE",
        session: resolvedSession,
        level: resolvedLevel,
        term: resolvedTerm,
        selectedCourses: feeCalculation.coursesWithFee,
        theoryCount: feeCalculation.theoryCount,
        labCount: feeCalculation.labCount,
        totalAmount: feeCalculation.totalAmount,
        gatewayName: paymentGatewayService.activeGateway,
        paymentStatus: "Pending",
      });
    }

    const verification = await paymentGatewayService.verifyPaymentCallback(
      paymentDoc.transactionId || paymentGatewayService.generateTransactionId(),
      status || "SUCCESS"
    );

    if (verification.isSuccessful) {
      paymentDoc.paymentStatus = "Paid";
      paymentDoc.transactionId = verification.transactionId;
      paymentDoc.paymentDate = verification.paymentDate;
      paymentDoc.updatedAt = new Date();
      await paymentDoc.save();

      // Realtime sync to Registration model
      if (paymentDoc.registration) {
        await Registration.findByIdAndUpdate(paymentDoc.registration, {
          paymentStatus: "Paid",
          totalPayable: paymentDoc.totalAmount,
        });
      }

      const levelDigit = (paymentDoc.level || "").replace(/[^0-9]/g, "");
      const termDigit = (paymentDoc.term || "").replace(/[^0-9]/g, "");
      const levelRegex = levelDigit ? new RegExp(`level[\\s-]*${levelDigit}`, "i") : /.*/;
      const termRegex = termDigit ? new RegExp(`term[\\s-]*${termDigit}`, "i") : /.*/;

      await Registration.updateMany(
        {
          $or: [
            { studentId: paymentDoc.studentId },
            { user: paymentDoc.student }
          ],
          level: { $regex: levelRegex },
          term: { $regex: termRegex },
        },
        { paymentStatus: "Paid", totalPayable: paymentDoc.totalAmount }
      );

      await createAuditLog(
        req,
        req.user,
        "Registration Payment Completed",
        `Paid ${paymentDoc.totalAmount} BDT online for registration ${paymentDoc.level}-${paymentDoc.term}`
      );

      // Notify Student
      try {
        const notif = await Notification.create({
          userId: paymentDoc.student,
          title: "💳 Payment Successful",
          message: `Your registration fee payment of ${paymentDoc.totalAmount} BDT (Txn: ${paymentDoc.transactionId}) was successful!`,
          type: "general",
        });

        const io = getIO();
        if (io) io.emit("new_notification", { userId: paymentDoc.student.toString(), notif });
      } catch (ioErr) {}

      // Notify Admins
      const adminUsers = await User.find({ role: "admin" }).lean();
      for (const admin of adminUsers) {
        try {
          const aNotif = await Notification.create({
            userId: admin._id,
            title: `Payment Received: ${paymentDoc.studentId}`,
            message: `Student ${paymentDoc.studentName} (${paymentDoc.studentId}) paid ${paymentDoc.totalAmount} BDT for ${paymentDoc.level} ${paymentDoc.term}.`,
            type: "general",
          });
          const io = getIO();
          if (io) io.emit("new_notification", { userId: admin._id.toString(), notif: aNotif });
        } catch (err) {}
      }

      queueEmail(
        req.user.email,
        `💳 Registration Payment Receipt: ${paymentDoc.transactionId}`,
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 16px 20px; border-radius: 8px 8px 0 0; color: #ffffff;">
            <h3 style="margin: 0;">Payment Receipt - University of Frontier Technology, Bangladesh</h3>
          </div>
          <div style="padding: 20px; color: #2C4B66;">
            <p style="font-size: 15px;">Hello <strong>${paymentDoc.studentName}</strong>,</p>
            <p style="font-size: 14px; color: #4A5568;">Your registration fee payment for <strong>${paymentDoc.level} ${paymentDoc.term} (${paymentDoc.session})</strong> has been received successfully.</p>
            <div style="background: #f8fafc; border-left: 4px solid #16a34a; padding: 14px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Student ID:</strong> ${paymentDoc.studentId}</p>
              <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${paymentDoc.transactionId}</p>
              <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ${paymentDoc.totalAmount} BDT</p>
              <p style="margin: 4px 0;"><strong>Payment Date:</strong> ${new Date(paymentDoc.paymentDate).toLocaleString()}</p>
            </div>
          </div>
        </div>
        `
      );
    } else {
      paymentDoc.paymentStatus = verification.paymentStatus || "Failed";
      paymentDoc.updatedAt = new Date();
      await paymentDoc.save();
    }

    res.json({ message: `Payment processed: ${paymentDoc.paymentStatus}`, payment: paymentDoc });
  } catch (error) {
    console.error("processOnlinePayment error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 4. Retry Failed or Cancelled Payment
exports.retryPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const paymentDoc = await RegistrationPayment.findById(paymentId);
    if (!paymentDoc) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    paymentDoc.paymentStatus = "Pending";
    paymentDoc.transactionId = paymentGatewayService.generateTransactionId();
    paymentDoc.updatedAt = new Date();
    await paymentDoc.save();

    res.json({ message: "Payment session reset for retry.", payment: paymentDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Get Student Payment History
exports.getStudentPaymentHistory = async (req, res) => {
  try {
    const studentUser = req.user;
    const studentUserId = studentUser.id || studentUser.uid || studentUser._id;

    const studentProfile = await Student.findOne({
      $or: [
        { universityEmail: studentUser.email },
        { universityEmail: { $regex: new RegExp(`^${(studentUser.email || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } },
        ...(studentUser.studentId ? [{ studentId: studentUser.studentId }] : []),
      ],
    }).lean();

    const studentIdStr = studentProfile?.studentId || studentUser.studentId || "";

    const existingPayments = await RegistrationPayment.find({
      $or: [
        { student: studentUserId },
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const registrations = await Registration.find({
      $or: [
        { user: studentUserId },
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const paymentMap = new Map();

    // Map existing payments
    existingPayments.forEach((p) => {
      const key = `${p.session || ""}-${p.level || ""}-${p.term || ""}`;
      if (!paymentMap.has(key) || p.paymentStatus === "Paid") {
        paymentMap.set(key, p);
      }
    });

    // Merge registered courses without existing payment
    for (const reg of registrations) {
      const key = `${reg.session || ""}-${reg.level || ""}-${reg.term || ""}`;
      const feeCalc = calculateRegistrationFee(reg.selectedCourses || []);
      const grandTotal = feeCalc.totalAmount + (reg.additionalFees || 0);
      const isPaid = reg.paymentStatus === "Paid";

      if (!paymentMap.has(key)) {
        paymentMap.set(key, {
          _id: reg._id,
          paymentId: `PAY-${reg.studentId}-${reg._id}`,
          student: reg.user,
          studentId: reg.studentId,
          studentName: studentProfile?.name || studentUser.name || "Student",
          registration: reg._id,
          department: reg.department,
          session: reg.session,
          level: reg.level,
          term: reg.term,
          selectedCourses: feeCalc.coursesWithFee,
          theoryCount: feeCalc.theoryCount,
          labCount: feeCalc.labCount,
          totalAmount: grandTotal,
          paymentStatus: isPaid ? "Paid" : "Pending",
          transactionId: isPaid ? `TXN_${reg._id}` : "N/A",
          gatewayName: isPaid ? "Online Gateway" : "Pending",
          createdAt: reg.createdAt,
        });
      } else {
        const existing = paymentMap.get(key);
        if (isPaid && existing.paymentStatus !== "Paid") {
          existing.paymentStatus = "Paid";
        }
      }
    }

    const synthesizedList = Array.from(paymentMap.values());

    const CourseImport = require("../models/CourseImport");
    const allImports = await CourseImport.find().lean();
    const allStudentRegistrations = await Registration.find({
      $or: [
        { user: studentUserId },
        ...(studentIdStr ? [{ studentId: studentIdStr }] : []),
      ],
    }).lean();

    // Attach previous dues history to each synthesized payment item
    for (const item of synthesizedList) {
      const sId = String(item.studentId || studentIdStr).trim();
      const currentLevelNum = parseInt((item.level || "").replace(/[^0-9]/g, ""), 10) || 1;
      const currentTermNum = parseInt((item.term || "").replace(/[^0-9]/g, ""), 10) || 1;

      const historyList = [];
      let totalUnpaidAmount = 0;

      for (let l = 1; l <= 4; l++) {
        for (let t = 1; t <= 2; t++) {
          if (l > currentLevelNum || (l === currentLevelNum && t >= currentTermNum)) {
            continue;
          }

          const levelStr = `Level-${l}`;
          const termStr = `Term-${t}`;

          const levelRegexp = new RegExp(`level[\\s-]*${l}`, "i");
          const termRegexp = new RegExp(`term[\\s-]*${t}`, "i");

          const matchingReg = allStudentRegistrations.find(
            (r) => levelRegexp.test(r.level || "") && termRegexp.test(r.term || "")
          );

          let pStatus = "Unpaid";
          let dueAmount = 0;

          if (matchingReg && matchingReg.paymentStatus === "Paid") {
            pStatus = "Paid";
            dueAmount = 0;
          } else if (matchingReg) {
            pStatus = "Unpaid";
            dueAmount = calculateRegistrationFee(matchingReg.selectedCourses || []).totalAmount;
          } else {
            pStatus = "Unpaid";
            const levelCourses = allImports.filter(
              (c) => levelRegexp.test(c.level || "") && termRegexp.test(c.term || "")
            );
            if (levelCourses.length > 0) {
              dueAmount = calculateRegistrationFee(levelCourses).totalAmount;
            } else {
              dueAmount = 4900;
            }
          }

          if (pStatus === "Unpaid") {
            totalUnpaidAmount += dueAmount;
          }

          historyList.push({
            levelTerm: `${levelStr} ${termStr}`,
            level: levelStr,
            term: termStr,
            status: pStatus,
            dueAmount,
          });
        }
      }

      item.previousDuesInfo = {
        hasUnpaidPreviousSemesters: totalUnpaidAmount > 0,
        totalUnpaidAmount,
        historyList,
      };
    }

    const payments = synthesizedList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Admin Get All Registration Payments (Including Unpaid Students)
exports.getAdminRegistrationPayments = async (req, res) => {
  try {
    const { status, session, department, search } = req.query;

    // Fetch existing payment records
    const existingPayments = await RegistrationPayment.find({}).sort({ createdAt: -1 }).lean();

    // Fetch all submitted/active registrations
    const allRegistrations = await Registration.find({}).sort({ createdAt: -1 }).lean();

    // Fetch student profiles for name/dept lookup
    const allStudents = await Student.find({}).lean();
    const studentMap = new Map();
    allStudents.forEach(s => studentMap.set(String(s.studentId || "").trim(), s));

    const paymentMap = new Map();

    // 1. First add real payment records
    existingPayments.forEach((p) => {
      const sId = String(p.studentId || "").trim();
      const key = `${sId}_${p.session || ""}_${p.level || ""}_${p.term || ""}`;
      paymentMap.set(key, {
        ...p,
        paymentStatus: p.paymentStatus === "Paid" ? "Paid" : "Unpaid",
      });
    });

    // 2. Add course registrations ONLY for students who actually registered
    allRegistrations.forEach((reg) => {
      const sId = String(reg.studentId || "").trim();
      if (!sId) return;
      const key = `${sId}_${reg.session || ""}_${reg.level || ""}_${reg.term || ""}`;

      if (!paymentMap.has(key)) {
        const std = studentMap.get(sId);
        const feeCalc = calculateRegistrationFee(reg.selectedCourses || []);
        const totalAmount = feeCalc.totalAmount + (reg.additionalFees || 0);

        paymentMap.set(key, {
          _id: `REG-UNPAID-${reg._id}`,
          studentId: reg.studentId,
          studentName: std?.name || reg.studentName || "Student",
          department: reg.department || std?.department || "EDTE",
          level: reg.level || (std?.currentLevel ? `Level-${std.currentLevel}` : "Level-1"),
          term: reg.term || (std?.currentTerm ? `Term-${std.currentTerm}` : "Term-1"),
          session: reg.session || std?.session || "2023-24",
          totalAmount: reg.paymentStatus === "Paid" ? (reg.totalPayable || totalAmount) : totalAmount,
          paymentStatus: reg.paymentStatus === "Paid" ? "Paid" : "Unpaid",
          transactionId: reg.paymentStatus === "Paid" ? `TXN_${reg._id}` : "-",
          paymentDate: reg.paymentStatus === "Paid" ? reg.updatedAt : null,
          createdAt: reg.createdAt || new Date(),
        });
      } else if (reg.paymentStatus === "Paid") {
        const existing = paymentMap.get(key);
        existing.paymentStatus = "Paid";
        if (existing.transactionId === "-") existing.transactionId = `TXN_${reg._id}`;
      }
    });

    const synthesizedList = Array.from(paymentMap.values());

    const CourseImport = require("../models/CourseImport");
    const allImports = await CourseImport.find().lean();

    // Attach previous dues history to each synthesized payment item
    for (const item of synthesizedList) {
      const sId = String(item.studentId || "").trim();
      const currentLevelNum = parseInt((item.level || "").replace(/[^0-9]/g, ""), 10) || 1;
      const currentTermNum = parseInt((item.term || "").replace(/[^0-9]/g, ""), 10) || 1;

      // Find all registrations for this student
      const studentRegs = allRegistrations.filter(r => String(r.studentId || "").trim() === sId);

      const historyList = [];
      let totalUnpaidAmount = 0;

      for (let l = 1; l <= 4; l++) {
        for (let t = 1; t <= 2; t++) {
          if (l > currentLevelNum || (l === currentLevelNum && t >= currentTermNum)) {
            continue;
          }

          const levelStr = `Level-${l}`;
          const termStr = `Term-${t}`;

          const levelRegexp = new RegExp(`level[\\s-]*${l}`, "i");
          const termRegexp = new RegExp(`term[\\s-]*${t}`, "i");

          const matchingReg = studentRegs.find(
            (r) => levelRegexp.test(r.level || "") && termRegexp.test(r.term || "")
          );

          let pStatus = "Unpaid";
          let dueAmount = 0;

          if (matchingReg && matchingReg.paymentStatus === "Paid") {
            pStatus = "Paid";
            dueAmount = 0;
          } else if (matchingReg) {
            pStatus = "Unpaid";
            dueAmount = calculateRegistrationFee(matchingReg.selectedCourses || []).totalAmount;
          } else {
            pStatus = "Unpaid";
            const levelCourses = allImports.filter(
              (c) => levelRegexp.test(c.level || "") && termRegexp.test(c.term || "")
            );
            if (levelCourses.length > 0) {
              dueAmount = calculateRegistrationFee(levelCourses).totalAmount;
            } else {
              dueAmount = 4900;
            }
          }

          if (pStatus === "Unpaid") {
            totalUnpaidAmount += dueAmount;
          }

          historyList.push({
            levelTerm: `${levelStr} ${termStr}`,
            level: levelStr,
            term: termStr,
            status: pStatus,
            dueAmount,
          });
        }
      }

      item.previousDuesInfo = {
        hasUnpaidPreviousSemesters: totalUnpaidAmount > 0,
        totalUnpaidAmount,
        historyList,
      };
    }

    // Filter by status (Paid vs Unpaid)
    let filtered = synthesizedList;
    if (status && status !== "all") {
      filtered = filtered.filter((p) => p.paymentStatus === status);
    }

    // Filter by session
    if (session && session !== "all") {
      filtered = filtered.filter((p) => p.session === session);
    }

    // Filter by department
    if (department && department !== "all") {
      filtered = filtered.filter((p) => p.department === department);
    }

    // Filter by search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((p) =>
        String(p.studentId || "").toLowerCase().includes(q) ||
        String(p.studentName || "").toLowerCase().includes(q) ||
        String(p.transactionId || "").toLowerCase().includes(q)
      );
    }

    res.json({ payments: filtered });
  } catch (error) {
    console.error("getAdminRegistrationPayments error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 7. Get Money Receipt
exports.getMoneyReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    let paymentDoc = null;
    if (mongoose.Types.ObjectId.isValid(paymentId)) {
      paymentDoc = await RegistrationPayment.findById(paymentId);
    }
    if (!paymentDoc) {
      paymentDoc = await RegistrationPayment.findOne({ paymentId });
    }

    if (!paymentDoc) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    const courseSubtotal = (paymentDoc.selectedCourses || []).reduce(
      (sum, c) => {
        const credits = Number(c.creditHours) || 3;
        const typeStr = (c.courseType || c.type || "").toLowerCase();
        const isLab = credits <= 1.5 || typeStr.includes("sessional") || typeStr.includes("lab");
        return sum + (c.fee || (isLab ? 100 : 300));
      },
      0
    );

    const receipt = {
      receiptNo: `REC-${paymentDoc.transactionId || paymentDoc._id}`,
      universityName: "University of Frontier Technology, Bangladesh",
      studentName: paymentDoc.studentName,
      studentId: paymentDoc.studentId,
      department: paymentDoc.department,
      levelTerm: `${paymentDoc.level} ${paymentDoc.term}`,
      session: paymentDoc.session,
      selectedCourses: paymentDoc.selectedCourses,
      theoryCount: paymentDoc.theoryCount,
      labCount: paymentDoc.labCount,
      courseSubtotal,
      fixedFees: FIXED_REGISTRATION_FEES,
      fixedFeesTotal: FIXED_FEES_TOTAL,
      totalAmount: paymentDoc.totalAmount,
      paymentStatus: paymentDoc.paymentStatus,
      transactionId: paymentDoc.transactionId || "N/A",
      gatewayName: paymentDoc.gatewayName,
      paymentDate: paymentDoc.paymentDate ? new Date(paymentDoc.paymentDate).toLocaleString() : "Pending",
    };

    res.json({ receipt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPaymentReceiptData = exports.getMoneyReceipt;

// 8. Get Official Registration Invoice Data
exports.getRegistrationInvoiceData = async (req, res) => {
  try {
    const { registrationId } = req.params;
    let regDoc = null;
    if (mongoose.Types.ObjectId.isValid(registrationId)) {
      regDoc = await Registration.findById(registrationId).lean();
    }
    if (!regDoc) {
      regDoc = await Registration.findOne({ studentId: registrationId }).sort({ createdAt: -1 }).lean();
    }

    if (!regDoc && req.user) {
      const studentProfile = await Student.findOne({ universityEmail: req.user.email }).lean();
      if (studentProfile) {
        regDoc = await Registration.findOne({ studentId: studentProfile.studentId }).sort({ createdAt: -1 }).lean();
      }
    }

    if (!regDoc) {
      return res.status(404).json({ error: "Registration record not found for invoice." });
    }

    const studentProfile = await Student.findOne({ studentId: regDoc.studentId }).lean();
    const userDoc = await User.findById(regDoc.user).lean();

    // Check payment record across multiple criteria
    const payDoc = await RegistrationPayment.findOne({
      $or: [
        { registration: regDoc._id },
        {
          studentId: regDoc.studentId,
          session: regDoc.session,
          level: regDoc.level,
          term: regDoc.term,
          paymentStatus: "Paid",
        },
        {
          studentId: regDoc.studentId,
          session: regDoc.session,
          level: regDoc.level,
          term: regDoc.term,
        },
      ],
    }).sort({ updatedAt: -1 }).lean();

    const RegistrationCalendar = require("../models/RegistrationCalendar");
    const calDoc = await RegistrationCalendar.findOne({
      session: regDoc.session,
      level: regDoc.level,
      term: regDoc.term,
    }).lean();

    let additionalFine = regDoc.additionalFees || 0;
    if (calDoc && calDoc.endDate && regDoc.createdAt && new Date(regDoc.createdAt) > new Date(calDoc.endDate)) {
      const daysLate = Math.ceil((new Date(regDoc.createdAt) - new Date(calDoc.endDate)) / (1000 * 60 * 60 * 24));
      const fineRate = calDoc.lateFinePerDay || 100;
      if (daysLate > 0) {
        additionalFine = Math.max(additionalFine, daysLate * fineRate);
      }
    }

    const feeCalc = calculateRegistrationFee(regDoc.selectedCourses || []);
    const fixedFeesList = [...FIXED_REGISTRATION_FEES];
    let fixedFeesTotal = FIXED_FEES_TOTAL;

    if (additionalFine > 0) {
      fixedFeesList.push({
        name: `Late Registration Fine / Admin Additional Fee (${calDoc?.lateFinePerDay ? `৳${calDoc.lateFinePerDay}/day` : "Late Fee"})`,
        amount: additionalFine,
      });
      fixedFeesTotal += additionalFine;
    }

    const isPaid = (payDoc && payDoc.paymentStatus === "Paid") || regDoc.paymentStatus === "Paid";
    const grandTotal = feeCalc.courseSubtotal + fixedFeesTotal;
    const paidAmount = isPaid ? grandTotal : 0;
    const dueAmount = isPaid ? 0 : grandTotal;

    // Calculate previous unpaid semester dues
    const currentLevelNum = parseInt((regDoc.level || "").replace(/[^0-9]/g, ""), 10) || 1;
    const currentTermNum = parseInt((regDoc.term || "").replace(/[^0-9]/g, ""), 10) || 1;

    const CourseImport = require("../models/CourseImport");
    const allImports = await CourseImport.find().lean();
    const allStudentRegistrations = await Registration.find({ studentId: regDoc.studentId }).lean();
    const allStudentPayments = await RegistrationPayment.find({ studentId: regDoc.studentId }).lean();

    const historyList = [];
    let totalUnpaidAmount = 0;

    for (let l = 1; l <= 4; l++) {
      for (let t = 1; t <= 2; t++) {
        if (l > currentLevelNum || (l === currentLevelNum && t >= currentTermNum)) {
          continue;
        }

        const levelStr = `Level-${l}`;
        const termStr = `Term-${t}`;

        const levelRegexp = new RegExp(`level[\\s-]*${l}`, "i");
        const termRegexp = new RegExp(`term[\\s-]*${t}`, "i");

        const matchingPay = allStudentPayments.find(
          (p) => levelRegexp.test(p.level || "") && termRegexp.test(p.term || "") && p.paymentStatus === "Paid"
        );
        const matchingReg = allStudentRegistrations.find(
          (r) => levelRegexp.test(r.level || "") && termRegexp.test(r.term || "") && r.paymentStatus === "Paid"
        );

        let pStatus = "Unpaid";
        let dueAmt = 0;

        if (matchingPay || matchingReg) {
          pStatus = "Paid";
          dueAmt = 0;
        } else {
          pStatus = "Unpaid";
          const matchingUnpaidReg = allStudentRegistrations.find(
            (r) => levelRegexp.test(r.level || "") && termRegexp.test(r.term || "")
          );
          if (matchingUnpaidReg) {
            dueAmt = calculateRegistrationFee(matchingUnpaidReg.selectedCourses || []).totalAmount;
          } else {
            const levelCourses = allImports.filter(
              (c) => levelRegexp.test(c.level || "") && termRegexp.test(c.term || "")
            );
            dueAmt = levelCourses.length > 0 ? calculateRegistrationFee(levelCourses).totalAmount : 4900;
          }
        }

        if (pStatus === "Unpaid") {
          totalUnpaidAmount += dueAmt;
        }

        historyList.push({
          levelTerm: `${levelStr} ${termStr}`,
          status: pStatus,
          dueAmount: dueAmt,
        });
      }
    }

    const previousDuesInfo = {
      hasUnpaidPreviousSemesters: totalUnpaidAmount > 0,
      totalUnpaidAmount,
      historyList,
    };

    const invoice = {
      invoiceNo: `INV-${regDoc.studentId}-${(regDoc.session || "2023-24").replace(/[^0-9]/g, "")}-${(regDoc.level || "L1").replace(/[^0-9L]/g, "")}${(regDoc.term || "T1").replace(/[^0-9T]/g, "")}`,
      registrationId: regDoc._id,
      universityName: "UNIVERSITY OF FRONTIER TECHNOLOGY, BANGLADESH",
      departmentName: studentProfile?.department || regDoc.department || "EDTE",
      studentName: studentProfile?.name || userDoc?.name || req.user?.name || "Student",
      studentId: regDoc.studentId,
      studentEmail: studentProfile?.universityEmail || userDoc?.email || req.user?.email,
      session: regDoc.session,
      level: regDoc.level,
      term: regDoc.term,
      registrationStatus: regDoc.status,
      submittedDate: regDoc.createdAt ? new Date(regDoc.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
      
      // Payment Info
      isPaid,
      paymentStatus: isPaid ? "Paid" : "Unpaid / Pending",
      grandTotal,
      paidAmount,
      dueAmount,
      transactionId: payDoc?.transactionId || "N/A",
      gatewayName: payDoc?.gatewayName || (isPaid ? "Online Gateway" : "Pending"),
      paymentDate: payDoc?.paymentDate ? new Date(payDoc.paymentDate).toLocaleString() : (isPaid ? new Date().toLocaleDateString() : "Not Paid Yet"),

      // Detailed Fees
      coursesWithFee: feeCalc.coursesWithFee,
      courseSubtotal: feeCalc.courseSubtotal,
      theoryCount: feeCalc.theoryCount,
      labCount: feeCalc.labCount,
      fixedFees: fixedFeesList,
      fixedFeesTotal,
      previousDuesInfo,
    };

    res.json({ invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
