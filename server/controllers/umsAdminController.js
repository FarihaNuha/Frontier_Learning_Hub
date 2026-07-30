const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const CourseImport = require("../models/CourseImport");
const Adviser = require("../models/Adviser");
const RegistrationCalendar = require("../models/RegistrationCalendar");
const Payment = require("../models/Payment");
const Registration = require("../models/Registration");

exports.getStats = async (req, res) => {
  try {
    const studentCount = await Student.countDocuments();
    const teacherCount = await Teacher.countDocuments();
    const courseCount = await CourseImport.countDocuments();
    const adviserCount = await Adviser.countDocuments();

    res.json({
      students: studentCount,
      teachers: teacherCount,
      courses: courseCount,
      advisers: adviserCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importStudents = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of students." });
    }

    for (const record of students) {
      const {
        studentId,
        name,
        universityEmail,
        department,
        program,
        batch,
        session,
        admissionSemester,
        currentLevel,
        currentTerm,
        accountStatus,
      } = record;

      if (!studentId || !name || !universityEmail) {
        continue; // skip invalid row
      }

      await Student.findOneAndUpdate(
        { studentId: String(studentId).trim() },
        {
          name: String(name).trim(),
          universityEmail: String(universityEmail).trim().toLowerCase(),
          department: String(department !== undefined && department !== null ? department : "").trim(),
          program: String(program !== undefined && program !== null ? program : "").trim(),
          batch: String(batch !== undefined && batch !== null ? batch : "").trim(),
          session: String(session !== undefined && session !== null ? session : "").trim(),
          admissionSemester: String(admissionSemester !== undefined && admissionSemester !== null ? admissionSemester : "").trim(),
          currentLevel: currentLevel ? Number(currentLevel) : 0,
          currentTerm: currentTerm ? Number(currentTerm) : 0,
          accountStatus: String(accountStatus !== undefined && accountStatus !== null ? accountStatus : "").trim(),
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Students imported successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importTeachers = async (req, res) => {
  try {
    const { teachers } = req.body;
    if (!Array.isArray(teachers)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of teachers." });
    }

    // Group rows by Teacher ID / Email to support multi-line course assignments in Excel
    const groupedTeachers = {};

    let currentTeacherId = "";
    let currentName = "";
    let currentEmail = "";
    let currentDept = "";
    let currentAdviserSession = "";

    for (const record of teachers) {
      if (record.teacherId !== undefined && record.teacherId !== null) currentTeacherId = String(record.teacherId).trim();
      if (record.name !== undefined && record.name !== null) currentName = String(record.name).trim();
      if (record.email !== undefined && record.email !== null) currentEmail = String(record.email).trim().toLowerCase();
      if (record.department !== undefined && record.department !== null) currentDept = String(record.department).trim();
      if (record.adviserSession !== undefined && record.adviserSession !== null) currentAdviserSession = String(record.adviserSession).trim();

      const key = currentTeacherId || currentEmail;
      if (!key) continue;

      if (!groupedTeachers[key]) {
        groupedTeachers[key] = {
          teacherId: currentTeacherId,
          name: currentName,
          email: currentEmail,
          department: currentDept,
          assignedLevelTerm: String(record.assignedLevelTerm || "").trim(),
          assignedSession: String(record.assignedSession || "").trim(),
          assignedCourses: [],
          adviserSession: currentAdviserSession,
        };
      }

      // Add course assignment detail if course name is present
      const courseName = String(record.assignedCourses || "").trim();
      if (courseName) {
        const levelTerm = String(record.assignedLevelTerm || groupedTeachers[key].assignedLevelTerm || "").trim();
        const session = String(record.assignedSession || groupedTeachers[key].assignedSession || "").trim();

        // Avoid exact duplicate course entries
        const exists = groupedTeachers[key].assignedCourses.some(
          (c) => c.courseName === courseName && c.levelTerm === levelTerm && c.session === session
        );
        if (!exists) {
          groupedTeachers[key].assignedCourses.push({
            courseName,
            levelTerm,
            session,
          });
        }
      }
    }

    for (const key of Object.keys(groupedTeachers)) {
      const t = groupedTeachers[key];
      const savedTeacher = await Teacher.findOneAndUpdate(
        { teacherId: t.teacherId },
        {
          name: t.name,
          email: t.email,
          department: t.department,
          assignedLevelTerm: t.assignedLevelTerm,
          assignedSession: t.assignedSession,
          assignedCourses: t.assignedCourses,
          adviserSession: t.adviserSession,
        },
        { upsert: true, new: true }
      );

      // Sync teacher assignment to real LMS Course documents in MongoDB
      if (savedTeacher) {
        await syncTeacherCourseAssignments(savedTeacher);
      }
    }

    res.json({ message: "Teachers imported and courses synced successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const syncTeacherCourseAssignments = async (teacherDoc) => {
  try {
    if (!teacherDoc || !teacherDoc.email) return;

    const User = require("../models/User");
    const Course = require("../models/Course");
    const CourseImport = require("../models/CourseImport");
    const bcrypt = require("bcryptjs");

    const email = teacherDoc.email.trim().toLowerCase();
    let userDoc = await User.findOne({ email });

    if (!userDoc) {
      const hashedPassword = await bcrypt.hash("111111", 10);
      userDoc = await User.create({
        name: teacherDoc.name,
        email,
        password: hashedPassword,
        role: "teacher",
        department: teacherDoc.department || "",
        studentId: teacherDoc.teacherId || "",
      });
    } else {
      if (userDoc.name !== teacherDoc.name) {
        userDoc.name = teacherDoc.name;
        await userDoc.save();
      }
    }

    if (!userDoc) return;

    const assigned = teacherDoc.assignedCourses || [];
    for (const item of assigned) {
      const code = (item.courseCode || "").trim().toUpperCase();
      const name = (item.courseName || "").trim();

      if (!code && !name) continue;

      const orConditions = [];
      if (code) orConditions.push({ displayCode: code });
      if (name) orConditions.push({ name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } });

      let existingCourses = await Course.find({ $or: orConditions });

      if (existingCourses.length > 0) {
        // Link teacher to existing LMS courses
        await Course.updateMany(
          { $or: orConditions },
          { teacher: userDoc._id, session: item.session || teacherDoc.assignedSession || "" }
        );
      } else {
        // Auto-create LMS Course document if missing in Course collection
        const importMatch = await CourseImport.findOne({
          $or: [
            ...(code ? [{ courseCode: code }] : []),
            ...(name ? [{ courseTitle: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } }] : [])
          ]
        }).lean();

        const joinCode = Math.floor(100000 + Math.random() * 900000).toString();
        await Course.create({
          name: name || importMatch?.courseTitle || "New Course",
          displayCode: (code || importMatch?.courseCode || "COURSE").toUpperCase(),
          session: item.session || teacherDoc.assignedSession || "",
          department: teacherDoc.department || importMatch?.department || "",
          teacher: userDoc._id,
          joinCode: joinCode,
          students: [],
        });
      }
    }
  } catch (err) {
    console.error("Error in syncTeacherCourseAssignments:", err);
  }
};
exports.syncTeacherCourseAssignments = syncTeacherCourseAssignments;

exports.importCourses = async (req, res) => {
  try {
    const { courses } = req.body;
    if (!Array.isArray(courses)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of courses." });
    }

    // Delete existing imported courses to ensure clean fresh roster without old stale defaults
    await CourseImport.deleteMany({});

    for (const record of courses) {
      const {
        courseCode,
        courseTitle,
        courseType,
        creditHours,
        department,
        program,
        level,
        term,
      } = record;

      if (!courseCode || !courseTitle) {
        continue;
      }

      await CourseImport.create({
        courseCode: String(courseCode).trim().toUpperCase(),
        courseTitle: String(courseTitle).trim(),
        courseType: String(courseType !== undefined && courseType !== null ? courseType : "").trim(),
        creditHours: Number(creditHours) || 0,
        department: String(department !== undefined && department !== null ? department : "").trim(),
        program: String(program !== undefined && program !== null ? program : "").trim(),
        level: String(level !== undefined && level !== null ? level : "").trim(),
        term: String(term !== undefined && term !== null ? term : "").trim(),
      });
    }

    res.json({ message: "Courses imported successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importAdvisers = async (req, res) => {
  try {
    const { advisers } = req.body;
    if (!Array.isArray(advisers)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of advisers." });
    }

    for (const record of advisers) {
      const {
        teacherEmail,
        department,
        program,
        session,
        assignedBatch,
      } = record;

      if (!teacherEmail || !session || !assignedBatch) {
        continue;
      }

      await Adviser.findOneAndUpdate(
        {
          teacherEmail: String(teacherEmail).trim().toLowerCase(),
          session: String(session).trim(),
          assignedBatch: String(assignedBatch).trim(),
        },
        {
          department: String(department !== undefined && department !== null ? department : "").trim(),
          program: String(program !== undefined && program !== null ? program : "").trim(),
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Advisers imported successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ studentId: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().lean();
    teachers.sort((a, b) => {
      const idA = String(a.teacherId || "");
      const idB = String(b.teacherId || "");
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
    });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const courses = await CourseImport.find();

    // Sort by Level (1 to 4), then Term (1 to 2), preserving course code numerical order
    courses.sort((a, b) => {
      const parseNum = (str) => {
        const numbers = String(str).match(/\d+/g);
        return numbers ? parseInt(numbers[0], 10) : 0;
      };

      const levelA = parseNum(a.level);
      const levelB = parseNum(b.level);
      if (levelA !== levelB) return levelA - levelB;

      const termA = parseNum(a.term);
      const termB = parseNum(b.term);
      if (termA !== termB) return termA - termB;

      return 0; // preserve insertion order for same level & term
    });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdvisers = async (req, res) => {
  try {
    const advisers = await Adviser.find().sort({ createdAt: -1 });
    res.json(advisers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== MANUAL EDIT & DELETE HANDLERS ====================
exports.updateStudent = async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Student record deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const updated = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updated) {
      await syncTeacherCourseAssignments(updated);
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ message: "Teacher record deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const updated = await CourseImport.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    await CourseImport.findByIdAndDelete(req.params.id);
    res.json({ message: "Course record deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAdviser = async (req, res) => {
  try {
    const updated = await Adviser.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAdviser = async (req, res) => {
  try {
    await Adviser.findByIdAndDelete(req.params.id);
    res.json({ message: "Adviser assignment record deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==================== REGISTRATION CALENDAR & PAYMENTS ====================
exports.getRegistrationCalendars = async (req, res) => {
  try {
    const calendars = await RegistrationCalendar.find().sort({ createdAt: -1 });
    res.json(calendars);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.upsertRegistrationCalendar = async (req, res) => {
  try {
    const { session, department, level, term, startDate, endDate, maxCredits, minCredits, lateFinePerDay, isOpen } = req.body;
    const calendar = await RegistrationCalendar.findOneAndUpdate(
      { session, department, level, term },
      { startDate, endDate, maxCredits, minCredits, lateFinePerDay, isOpen },
      { upsert: true, new: true }
    );
    res.json(calendar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateRegistrationCalendar = async (req, res) => {
  try {
    const { id } = req.params;
    const calendar = await RegistrationCalendar.findByIdAndUpdate(id, req.body, { new: true });
    if (!calendar) return res.status(404).json({ error: "Calendar rule not found." });
    res.json(calendar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteRegistrationCalendar = async (req, res) => {
  try {
    const { id } = req.params;
    await RegistrationCalendar.findByIdAndDelete(id);
    res.json({ message: "Registration calendar rule deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdminPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate("user", "name email").sort({ updatedAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paidAmount, paymentStatus, fineAmount } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    if (paidAmount !== undefined) payment.paidAmount = Number(paidAmount);
    if (fineAmount !== undefined) payment.fineAmount = Number(fineAmount);

    payment.dueAmount = Math.max(0, payment.totalAmount + payment.fineAmount - payment.paidAmount);

    if (paymentStatus) {
      payment.paymentStatus = paymentStatus;
    } else if (payment.dueAmount === 0) {
      payment.paymentStatus = "Paid";
    } else if (payment.paidAmount > 0) {
      payment.paymentStatus = "Partial";
    } else {
      payment.paymentStatus = "Pending";
    }

    payment.updatedAt = new Date();
    await payment.save();

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllRegistrationsAdmin = async (req, res) => {
  try {
    const registrations = await Registration.find().populate("user", "name email").sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin Feature: Assign/Reassign Teacher to Course
exports.assignTeacherToCourse = async (req, res) => {
  try {
    const { teacherId, courseCode, level, term, session } = req.body;
    const Teacher = require("../models/Teacher");
    const Course = require("../models/Course");
    const User = require("../models/User");

    const teacherDoc = await Teacher.findById(teacherId);
    if (!teacherDoc) {
      return res.status(404).json({ error: "Teacher record not found." });
    }

    const teacherUser = await User.findOne({ email: teacherDoc.email, role: "teacher" });

    // Add to assignedCourses array in Teacher model
    teacherDoc.assignedCourses.push({
      courseCode: (courseCode || "").toUpperCase(),
      levelTerm: level && term ? `${level} - ${term}` : "",
      level: level || "",
      term: term || "",
      session: session || "",
      department: teacherDoc.department,
    });
    await teacherDoc.save();

    // Reassign LMS Course if existing
    if (teacherUser && courseCode) {
      await Course.updateMany(
        { displayCode: (courseCode || "").toUpperCase() },
        { teacher: teacherUser._id, session: session || "" }
      );
    }

    res.json({ message: "Teacher assigned to course successfully.", teacher: teacherDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin Feature: Deactivate/Activate Teacher
exports.toggleTeacherActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const Teacher = require("../models/Teacher");
    const User = require("../models/User");

    const teacherDoc = await Teacher.findById(id);
    if (!teacherDoc) {
      return res.status(404).json({ error: "Teacher record not found." });
    }

    teacherDoc.isActive = !teacherDoc.isActive;
    await teacherDoc.save();

    const userDoc = await User.findOne({ email: teacherDoc.email });
    if (userDoc) {
      userDoc.isBlocked = !teacherDoc.isActive;
      await userDoc.save();
    }

    res.json({ message: `Teacher ${teacherDoc.isActive ? "activated" : "deactivated"} successfully.`, teacher: teacherDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin Feature: View Teacher Workload
exports.getTeacherWorkload = async (req, res) => {
  try {
    const Teacher = require("../models/Teacher");
    const Course = require("../models/Course");
    const User = require("../models/User");

    const teachers = await Teacher.find().lean();
    const workload = await Promise.all(
      teachers.map(async (t) => {
        const userDoc = await User.findOne({ email: t.email });
        const courseCount = userDoc ? await Course.countDocuments({ teacher: userDoc._id }) : (t.assignedCourses?.length || 0);
        return {
          _id: t._id,
          teacherId: t.teacherId,
          name: t.name,
          email: t.email,
          department: t.department,
          isActive: t.isActive !== false,
          totalAssignedCourses: courseCount,
          assignedCourses: t.assignedCourses || [],
        };
      })
    );

    workload.sort((a, b) => {
      const idA = String(a.teacherId || "");
      const idB = String(b.teacherId || "");
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
    });

    res.json(workload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




