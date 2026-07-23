const Course = require("../models/Course");
const User = require("../models/User");

// Create course (Teacher only) - WITH JOIN CODE
exports.createCourse = async (req, res) => {
  try {
    const { name, session, displayCode, department } = req.body;

    if (!name || !displayCode || !department) {
      return res
        .status(400)
        .json({ error: "Course name, code, and department are required" });
    }

    // Generate random 6-digit join code
    const joinCode = Math.floor(100000 + Math.random() * 900000).toString();

    const course = await Course.create({
      name,
      session: session || "",
      displayCode: displayCode.toUpperCase(),
      joinCode: joinCode,
      department,
      teacher: req.user.uid,
      students: [],
    });

    res.status(201).json({
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Join course by random join code (Student)
exports.joinCourse = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Invalid join code. Must be a string." });
    }

    const course = await Course.findOne({ joinCode: code });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Invalid join code. Course not found." });
    }

    if (!course.isActive) {
      return res.status(400).json({ error: "This course is no longer active" });
    }

    if (course.students.includes(req.user.uid)) {
      return res
        .status(400)
        .json({ error: "You are already enrolled in this course" });
    }

    const student = await User.findById(req.user.uid);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check student email domain
    const isUftbDomain = student.email.endsWith("@std.uftb.ac.bd");

    if (isUftbDomain) {
      course.students.push(req.user.uid);
      await course.save();

      return res.json({
        status: "joined",
        message: `Successfully joined ${course.name} (${course.displayCode})!`,
        course,
      });
    } else {
      const JoinRequest = require("../models/JoinRequest");
      const Notification = require("../models/Notification");
      const { getIO } = require("../socket");
      const { queueEmail } = require("../services/emailService");

      const existingRequest = await JoinRequest.findOne({
        course: course._id,
        student: student._id,
        status: "pending"
      });

      if (existingRequest) {
        return res.status(400).json({ error: "Your join request for this course is already pending approval." });
      }

      // Create pending join request
      const joinRequest = await JoinRequest.create({
        course: course._id,
        student: student._id,
        status: "pending"
      });

      // Notify teacher
      const teacher = await User.findById(course.teacher);
      if (teacher) {
        // 1. Send system notification in database
        const notifLink = "/settings";
        await Notification.create({
          userId: teacher._id,
          title: "Course Join Request",
          message: `${student.name} (${student.email}) requested to join ${course.name} (${course.displayCode}).`,
          type: "join_request",
          link: notifLink,
        });

        // 2. Real-time socket notification
        try {
          const io = getIO();
          if (io) {
            io.to(`user_${teacher._id}`).emit("newNotification", {
              title: "Course Join Request",
              message: `${student.name} (${student.email}) requested to join ${course.name}`,
              type: "join_request",
            });
          }
        } catch (err) {
          console.error("Socket error on notify join request:", err.message);
        }

        // 3. Email notification
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
              <h2 style="color: white; margin: 0;">UFTB Moodle Course Request</h2>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
              <h3 style="color: #2C4B66;">Hello ${teacher.name},</h3>
              <p>A student whose email domain does not match <strong>@std.uftb.ac.bd</strong> has requested to join your course:</p>
              <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Student Name:</strong> ${student.name}</p>
                <p style="margin: 5px 0;"><strong>Student Email:</strong> ${student.email}</p>
                <p style="margin: 5px 0;"><strong>Course:</strong> ${course.name} (${course.displayCode})</p>
              </div>
              <p>Please login and visit your settings page to approve or reject this request.</p>
              <a href="${(process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "")}/settings" style="display: inline-block; background: linear-gradient(135deg, #7EC8E3, #3B8DB3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Settings</a>
            </div>
          </div>
        `;
        queueEmail(teacher.email, "Course Join Request Pending Approval", emailHtml);
      }

      return res.status(202).json({
        status: "pending",
        message: "Join request submitted. Since your email is not in the @std.uftb.ac.bd domain, it requires manual approval from the course instructor.",
      });
    }
  } catch (error) {
    console.error("Join course error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get my courses (Teacher + Student)
exports.getMyCourses = async (req, res) => {
  try {
    let courses;

    if (req.user.role === "teacher") {
      courses = await Course.find({ teacher: req.user.uid })
        .populate("teacher", "name email profilePicture department")
        .sort({ createdAt: -1 });
    } else {
      courses = await Course.find({ students: req.user.uid })
        .populate("teacher", "name email profilePicture department")
        .sort({ createdAt: -1 });
    }

    res.json({ courses });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get single course
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("teacher", "name email profilePicture department")
      .populate("students", "name email studentId profilePicture department");

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    let modified = false;
    if (course.labFormula && course.labFormula.startsWith("=ROUND(")) {
      course.labFormula = course.labFormula.replace("=ROUND(", "=ROUNDUP(");
      modified = true;
    }
    if (course.theoryFormula && course.theoryFormula.startsWith("=ROUND(")) {
      course.theoryFormula = course.theoryFormula.replace("=ROUND(", "=ROUNDUP(");
      modified = true;
    }
    if (modified) {
      await course.save().catch(() => {});
    }

    res.json({ course });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Leave course (Student)
exports.leaveCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    course.students = course.students.filter(
      (s) => s.toString() !== req.user.uid,
    );
    await course.save();

    res.json({ message: "Left course successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete course (Teacher only)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (
      course.teacher.toString() !== req.user.uid &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await course.deleteOne();
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get pending join requests (Teacher only)
exports.getJoinRequests = async (req, res) => {
  try {
    const JoinRequest = require("../models/JoinRequest");
    
    // Find courses taught by this teacher
    const courses = await Course.find({ teacher: req.user.uid });
    const courseIds = courses.map((c) => c._id);

    // Find pending requests for these courses
    const requests = await JoinRequest.find({
      course: { $in: courseIds },
      status: "pending"
    })
      .populate("course", "name displayCode")
      .populate("student", "name email studentId department")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error("Get join requests error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Handle join request (Approve/Reject) (Teacher only)
exports.handleJoinRequest = async (req, res) => {
  try {
    const { action } = req.body; // "approve" or "reject"
    const { requestId } = req.params;
    
    const JoinRequest = require("../models/JoinRequest");
    const Notification = require("../models/Notification");
    const { getIO } = require("../socket");

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be approve or reject." });
    }

    const request = await JoinRequest.findById(requestId).populate("course");
    if (!request) {
      return res.status(404).json({ error: "Join request not found." });
    }

    // Verify ownership
    if (request.course.teacher.toString() !== req.user.uid) {
      return res.status(403).json({ error: "Not authorized to manage this request." });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: `This request has already been ${request.status}.` });
    }

    if (action === "approve") {
      request.status = "approved";
      await request.save();

      // Enroll student in course
      const course = await Course.findById(request.course._id);
      if (course && !course.students.includes(request.student)) {
        course.students.push(request.student);
        await course.save();
      }

      // Notify student
      await Notification.create({
        userId: request.student,
        title: "Join Request Approved",
        message: `Your request to join ${request.course.name} has been approved.`,
        type: "join_approved",
        link: `/course/${request.course._id}`,
      });

      try {
        const io = getIO();
        if (io) {
          io.to(`user_${request.student}`).emit("newNotification", {
            title: "Join Request Approved",
            message: `Your request to join ${request.course.name} has been approved.`,
            type: "join_approved",
          });
        }
      } catch (err) {
        console.error("Socket error on approve notification:", err.message);
      }
    } else {
      request.status = "rejected";
      await request.save();

      // Notify student
      await Notification.create({
        userId: request.student,
        title: "Join Request Rejected",
        message: `Your request to join ${request.course.name} was not approved.`,
        type: "join_rejected",
        link: null,
      });

      try {
        const io = getIO();
        if (io) {
          io.to(`user_${request.student}`).emit("newNotification", {
            title: "Join Request Rejected",
            message: `Your request to join ${request.course.name} was not approved.`,
            type: "join_rejected",
          });
        }
      } catch (err) {
        console.error("Socket error on reject notification:", err.message);
      }
    }

    res.json({ message: `Request successfully ${action}d.` });
  } catch (error) {
    console.error("Handle join request error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Helper to find Assessment document for a student in a course flexibly
const findAssessmentRecord = async (studentDoc, courseDoc) => {
  if (!studentDoc || !courseDoc) return null;

  try {
    const Assessment = require("../models/Assessment");
    const idVal = studentDoc.studentIdNumber || studentDoc.studentId || "";
    const studentIdStr = idVal ? String(idVal).trim() : "";
    const displayCode = (courseDoc.displayCode || courseDoc.code || "").trim();
    const rawCode = displayCode.replace(/[-\s]/g, "");

    // Build course code variants for matching e.g. "CSE 201", "CSE201", "CSE-201"
    const codeVariants = [
      displayCode,
      courseDoc.code,
      rawCode
    ].filter(Boolean);

    const codeRegexList = codeVariants.map(c => new RegExp("^" + c.replace(/[-\s]/g, "[-_\\s]?") + "$", "i"));

    const idConditions = [];
    if (studentDoc._id) {
      idConditions.push({ studentId: studentDoc._id });
    }
    if (studentIdStr) {
      idConditions.push({ studentIdNumber: studentIdStr });
      idConditions.push({ studentIdNumber: new RegExp("^" + studentIdStr.replace(/[-\s]/g, "") + "$", "i") });
    }

    if (idConditions.length === 0) return null;

    return await Assessment.findOne({
      $or: idConditions,
      courseCode: { $in: codeRegexList }
    });
  } catch (err) {
    console.error("findAssessmentRecord error:", err);
    return null;
  }
};

// Get All Students Analytics Roster for a Course (Teacher view)
exports.getCourseStudentsAnalytics = async (req, res) => {
  try {
    const courseId = req.params.id;

    const Course = require("../models/Course");
    const Attendance = require("../models/Attendance");
    const Assignment = require("../models/Assignment");
    const Submission = require("../models/Submission");
    const Exam = require("../models/Exam");
    const ExamSubmission = require("../models/ExamSubmission");
    const Assessment = require("../models/Assessment");

    // Fetch Course with students populated
    const course = await Course.findById(courseId).populate("students", "name email studentId studentIdNumber department profilePicture");
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Ensure permissions (teacher only)
    if (course.teacher.toString() !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    const assignments = await Assignment.find({ courseId }, "_id totalMarks");
    const exams = await Exam.find({ courseId }, "_id totalMarks");

    const studentsAnalytics = [];

    for (const student of course.students) {
      // 1. Attendance
      const attendance = await Attendance.find({ courseId });
      let presentCount = 0;
      let totalAtt = 0;
      attendance.forEach((att) => {
        const record = att.records.find((r) => r.studentId.toString() === student._id.toString());
        if (record) {
          totalAtt++;
          if (record.status === "present") presentCount++;
        }
      });
      const attendancePercent = totalAtt > 0 ? (presentCount / totalAtt) * 100 : 0;

      // 2. Assignments
      const submissions = await Submission.find({
        studentId: student._id,
        assignmentId: { $in: assignments.map((a) => a._id) }
      });
      let assignScoreSum = 0;
      let totalAssignPossible = 0;
      assignments.forEach((assign) => {
        totalAssignPossible += assign.totalMarks || 100;
        const sub = submissions.find((s) => s.assignmentId.toString() === assign._id.toString());
        if (sub && sub.marks !== null) {
          assignScoreSum += sub.marks;
        }
      });
      const assignmentPercent = totalAssignPossible > 0 ? (assignScoreSum / totalAssignPossible) * 100 : 0;

      // 3. Exams
      const examSubmissions = await ExamSubmission.find({
        studentId: student._id,
        examId: { $in: exams.map((e) => e._id) }
      });
      let examScoreSum = 0;
      let totalExamPossible = 0;
      exams.forEach((ex) => {
        totalExamPossible += ex.totalMarks || 100;
        const sub = examSubmissions.find((s) => s.examId.toString() === ex._id.toString());
        const canSeeResults = ex.resultsPublished || ex.publishMode === "auto";
        if (sub && sub.graded && canSeeResults) {
          examScoreSum += sub.totalMarksObtained;
        }
      });
      const examPercent = totalExamPossible > 0 ? (examScoreSum / totalExamPossible) * 100 : 0;

      // 4. Assessment (Search flexibly by student ID & course code)
      const assessment = await findAssessmentRecord(student, course);
      
      // Calculate overall activity score
      let scoreSum = 0;
      let weightSum = 0;

      if (totalAtt > 0) {
        scoreSum += attendancePercent * 0.2;
        weightSum += 0.2;
      }
      if (assignments.length > 0) {
        scoreSum += assignmentPercent * 0.3;
        weightSum += 0.3;
      }
      if (exams.length > 0) {
        scoreSum += examPercent * 0.3;
        weightSum += 0.3;
      }
      if (assessment) {
        const quizPercentage = assessment.quiz ? (assessment.quiz <= 10 ? (assessment.quiz / 10) * 100 : assessment.quiz) : 0;
        const presentationPercentage = assessment.presentation ? (assessment.presentation <= 10 ? (assessment.presentation / 10) * 100 : assessment.presentation) : 0;
        const assessmentAvg = (quizPercentage + presentationPercentage) / 2;
        scoreSum += assessmentAvg * 0.2;
        weightSum += 0.2;
      }

      const activityScore = weightSum > 0 ? Math.round(scoreSum / weightSum) : 0;

      studentsAnalytics.push({
        id: student._id,
        name: student.name,
        email: student.email,
        studentIdNumber: student.studentIdNumber || student.studentId || "N/A",
        department: student.department || "N/A",
        profilePicture: student.profilePicture || null,
        stats: {
          attendancePercent: Math.round(attendancePercent),
          assignmentPercent: Math.round(assignmentPercent),
          examPercent: Math.round(examPercent),
          activityScore,
          assessmentTotal: assessment ? assessment.totalMarks : 0
        }
      });
    }

    studentsAnalytics.sort((a, b) => {
      const idA = String(a.studentIdNumber || "").trim();
      const idB = String(b.studentIdNumber || "").trim();
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
    });

    res.json({ students: studentsAnalytics });
  } catch (error) {
    console.error("Get course students analytics error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get Single Student Detail Analytics (For Teacher & the Student themselves)
exports.getStudentAnalytics = async (req, res) => {
  try {
    const courseId = req.params.id;
    const studentId = req.params.studentId;

    const Course = require("../models/Course");
    const Attendance = require("../models/Attendance");
    const Assignment = require("../models/Assignment");
    const Submission = require("../models/Submission");
    const Exam = require("../models/Exam");
    const ExamSubmission = require("../models/ExamSubmission");
    const Assessment = require("../models/Assessment");

    // Fetch Course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Check permission: Teacher of course or the student themselves
    const isTeacher = course.teacher.toString() === req.user.uid;
    const isSelf = studentId === req.user.uid;

    if (!isTeacher && !isSelf) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch Student Details
    const student = await User.findById(studentId, "name email studentId studentIdNumber department profilePicture");
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Use MongoDB _id for all sub-collection queries (not Firebase UID)
    const studentMongoId = student._id;

    // 1. Fetch Attendance Records
    const attendanceRecords = await Attendance.find({ courseId }).sort({ date: 1 });
    let presentCount = 0;
    let absentCount = 0;
    const attendanceHistory = [];

    attendanceRecords.forEach((att) => {
      const record = att.records.find((r) => r.studentId.toString() === studentMongoId.toString());
      if (record) {
        if (record.status === "present") {
          presentCount++;
        } else {
          absentCount++;
        }
        attendanceHistory.push({
          date: att.date,
          status: record.status,
          classType: att.classType || "theory"
        });
      }
    });

    const totalAttendanceCount = presentCount + absentCount;
    const attendancePercentage = totalAttendanceCount > 0 ? (presentCount / totalAttendanceCount) * 100 : 0;

    // 2. Fetch Assignment Submissions - use student._id (ObjectId)
    const assignments = await Assignment.find({ courseId }).sort({ createdAt: 1 });
    // Do NOT populate assignmentId - compare raw ObjectIds directly
    const assignmentSubmissions = await Submission.find({
      studentId: studentMongoId,
      assignmentId: { $in: assignments.map((a) => a._id) }
    });

    const assignmentData = assignments.map((assign) => {
      // Compare ObjectIds as strings directly (no populate, so assignmentId is still ObjectId)
      const sub = assignmentSubmissions.find(
        (s) => s.assignmentId.toString() === assign._id.toString()
      );
      const maxMarks = assign.totalMarks || 100;
      const marksObtained = sub ? (sub.marks !== undefined ? sub.marks : null) : null;
      return {
        id: assign._id,
        title: assign.title,
        createdAt: assign.createdAt,
        deadline: assign.deadline,
        totalMarks: maxMarks,
        marksObtained,
        submitted: !!sub,
        submittedAt: sub ? sub.submittedAt : null,
        percentage: marksObtained !== null ? (marksObtained / maxMarks) * 100 : null,
        feedback: sub ? (sub.feedback || "") : ""
      };
    });

    let totalAssignPossible = 0;
    let totalAssignEarned = 0;
    assignmentData.forEach((a) => {
      totalAssignPossible += a.totalMarks || 100;
      if (a.marksObtained !== null) {
        totalAssignEarned += a.marksObtained;
      }
    });
    const assignmentAverage = totalAssignPossible > 0 ? (totalAssignEarned / totalAssignPossible) * 100 : 0;

    // 3. Fetch Exam Submissions - use student._id (ObjectId)
    const exams = await Exam.find({ courseId }).sort({ scheduledAt: 1 });
    // Do NOT populate examId - compare raw ObjectIds directly
    const examSubmissions = await ExamSubmission.find({
      studentId: studentMongoId,
      examId: { $in: exams.map((e) => e._id) }
    });

    const examData = exams.map((ex) => {
      // Compare ObjectIds as strings directly (no populate, so examId is still ObjectId)
      const sub = examSubmissions.find(
        (s) => s.examId.toString() === ex._id.toString()
      );
      const maxMarks = ex.totalMarks || 100;

      const canSeeResults = ex.resultsPublished || ex.publishMode === "auto";
      const marksObtained = sub && sub.graded && canSeeResults ? sub.totalMarksObtained : null;
      const percentage = sub && sub.graded && canSeeResults ? sub.percentage : null;

      return {
        title: ex.title,
        scheduledAt: ex.scheduledAt,
        totalMarks: maxMarks,
        marksObtained,
        submitted: !!sub,
        graded: sub ? sub.graded : false,
        submittedAt: sub ? sub.submittedAt : null,
        percentage,
        feedback: sub && canSeeResults ? (sub.feedback || "") : "",
        resultsPublished: ex.resultsPublished
      };
    });

    let totalExamPossible = 0;
    let totalExamEarned = 0;
    examData.forEach((e) => {
      totalExamPossible += e.totalMarks || 100;
      if (e.marksObtained !== null) {
        totalExamEarned += e.marksObtained;
      }
    });
    const examAverage = totalExamPossible > 0 ? (totalExamEarned / totalExamPossible) * 100 : 0;

    // 4. Fetch Manual Assessments (Robust search by student ID & course code)
    const assessment = await findAssessmentRecord(student, course);

    // 5. Calculate Overall Performance / Activity Score
    let scoreSum = 0;
    let weightSum = 0;

    // Attendance
    if (totalAttendanceCount > 0) {
      scoreSum += attendancePercentage * 0.2;
      weightSum += 0.2;
    }
    // Assignments
    if (assignments.length > 0) {
      scoreSum += assignmentAverage * 0.3;
      weightSum += 0.3;
    }
    // Exams
    if (exams.length > 0) {
      scoreSum += examAverage * 0.3;
      weightSum += 0.3;
    }
    // Assessment Quiz & Presentation (out of 20 total)
    if (assessment) {
      const quizPercentage = assessment.quiz ? (assessment.quiz / 10) * 100 : 0;
      const presentationPercentage = assessment.presentation ? (assessment.presentation / 10) * 100 : 0;
      const assessmentAvg = (quizPercentage + presentationPercentage) / 2;
      scoreSum += assessmentAvg * 0.2;
      weightSum += 0.2;
    }

    const activityScore = weightSum > 0 ? Math.round(scoreSum / weightSum) : 0;

    // Determine performance grade label
    let gradeLabel = "N/A";
    let gradeColor = "#94a3b8";
    if (activityScore >= 80) {
      gradeLabel = "Outstanding (A+)";
      gradeColor = "#10b981";
    } else if (activityScore >= 70) {
      gradeLabel = "Very Good (A)";
      gradeColor = "#3b82f6";
    } else if (activityScore >= 60) {
      gradeLabel = "Good (B)";
      gradeColor = "#f59e0b";
    } else if (activityScore >= 50) {
      gradeLabel = "Average (C)";
      gradeColor = "#f97316";
    } else if (activityScore > 0) {
      gradeLabel = "Needs Improvement (F)";
      gradeColor = "#ef4444";
    }

    // Dynamically calculate Class Average for the course across 5 parameters
    let classAttAvg = 78;
    let classAssignAvg = 72;
    let classExamAvg = 70;
    let classPresAvg = 68;
    let classAssAvg = 75;

    try {
      // 1. Attendance Class Average
      const allAttendance = await Attendance.find({ courseId });
      let totalPresent = 0;
      let totalRecords = 0;
      allAttendance.forEach((att) => {
        (att.records || []).forEach((rec) => {
          totalRecords++;
          if (rec.status === "present") totalPresent++;
        });
      });
      if (totalRecords > 0) {
        classAttAvg = Math.round((totalPresent / totalRecords) * 100);
      }

      // 2. Assignment Class Average
      const allAssignments = await Assignment.find({ courseId });
      const assignIds = allAssignments.map((a) => a._id);
      const allSubmissions = await Submission.find({ assignmentId: { $in: assignIds } });
      let assignSum = 0;
      let assignCount = 0;
      allSubmissions.forEach((sub) => {
        const assign = allAssignments.find((a) => a._id.toString() === sub.assignmentId.toString());
        if (assign && sub.marks !== null) {
          assignSum += (sub.marks / (assign.totalMarks || 100)) * 100;
          assignCount++;
        }
      });
      if (assignCount > 0) {
        classAssignAvg = Math.round(assignSum / assignCount);
      }

      // 3. Exams Class Average
      const allExams = await Exam.find({ courseId });
      const examIds = allExams.map((e) => e._id);
      const allExamSubs = await ExamSubmission.find({ examId: { $in: examIds }, graded: true });
      let examSum = 0;
      let examCount = 0;
      allExamSubs.forEach((sub) => {
        const exam = allExams.find((e) => e._id.toString() === sub.examId.toString());
        if (exam && sub.totalMarksObtained !== null) {
          examSum += (sub.totalMarksObtained / (exam.totalMarks || 100)) * 100;
          examCount++;
        }
      });
      if (examCount > 0) {
        classExamAvg = Math.round(examSum / examCount);
      }

      // 4 & 5. Assessments Class Average (All 5 parameters derived from assessment if available)
      const toPercentage = (val) => {
        if (val === undefined || val === null || isNaN(val)) return 0;
        const num = Number(val);
        if (num <= 0) return 0;
        if (num <= 10) return Math.min(100, Math.round((num / 10) * 100));
        if (num <= 15) return Math.min(100, Math.round((num / 15) * 100));
        if (num <= 30) return Math.min(100, Math.round((num / 30) * 100));
        if (num <= 40) return Math.min(100, Math.round((num / 40) * 100));
        return Math.min(100, Math.round(num));
      };

      const displayCode = (course.displayCode || course.code || "").trim();
      const rawCode = displayCode.replace(/[-\s]/g, "");
      const allAssessments = await Assessment.find({
        courseCode: { $regex: new RegExp("^" + rawCode.replace(/([a-zA-Z]+)(\d+)/, "$1[-_\\s]?$2") + "$", "i") }
      });
      if (allAssessments.length > 0) {
        let attSum = 0;
        let quizSum = 0;
        let assignSum = 0;
        let presSum = 0;
        let totalSum = 0;

        allAssessments.forEach((ass) => {
          attSum += ass.attendance || 0;
          quizSum += ass.quiz || 0;
          assignSum += ass.assignment || 0;
          presSum += ass.presentation || 0;
          totalSum += ass.totalMarks || 0;
        });

        const count = allAssessments.length;
        classAttAvg = toPercentage(attSum / count);
        classAssignAvg = toPercentage(assignSum / count);
        classExamAvg = toPercentage(quizSum / count);
        classPresAvg = toPercentage(presSum / count);
        classAssAvg = toPercentage(totalSum / count);
      }
    } catch (e) {
      console.error("Error calculating dynamic class average:", e);
    }

    res.json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        studentIdNumber: student.studentIdNumber || student.studentId || "N/A",
        department: student.department || "N/A",
        profilePicture: student.profilePicture || null
      },
      summary: {
        attendancePercent: Math.round(attendancePercentage),
        totalAttendanceCount,
        presentCount,
        absentCount,
        assignmentAverage: Math.round(assignmentAverage),
        completedAssignments: assignmentSubmissions.length,
        totalAssignments: assignments.length,
        examAverage: Math.round(examAverage),
        completedExams: examSubmissions.length,
        totalExams: exams.length,
        activityScore,
        gradeLabel,
        gradeColor,
        classAverage: {
          attendance: classAttAvg,
          assignment: classAssignAvg,
          quiz: classExamAvg,
          presentation: classPresAvg,
          assessment: classAssAvg
        },
        assessment: assessment ? {
          attendance: assessment.attendance,
          quiz: assessment.quiz,
          assignment: assessment.assignment,
          presentation: assessment.presentation,
          totalMarks: assessment.totalMarks
        } : null
      },
      history: {
        attendance: attendanceHistory,
        assignments: assignmentData,
        exams: examData
      }
    });

  } catch (error) {
    console.error("Get student analytics error:", error);
    res.status(500).json({ error: error.message });
  }
};
