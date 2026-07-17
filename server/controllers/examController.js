const Exam = require("../models/Exam");
const ExamSubmission = require("../models/ExamSubmission");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO } = require("../socket");
const { sendEmail, emailTemplates, queueEmail } = require("../services/emailService");
const { analyzeAnswers } = require("../services/aiDetector");

// Create Exam (Teacher only)
exports.createExam = async (req, res) => {
  try {
    const {
      title,
      course,
      courseId,
      department,
      duration,
      questions,
      scheduledAt,
      deadline,
      publishMode,
    } = req.body;

    if (
      !title ||
      !course ||
      !department ||
      !duration ||
      !scheduledAt ||
      !deadline ||
      !questions ||
      questions.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Please provide all required fields" });
    }

    if (new Date(deadline) <= new Date(scheduledAt)) {
      return res.status(400).json({ error: "Deadline must be after scheduled start time" });
    }

    let totalMarks = 0;
    questions.forEach((q) => {
      totalMarks += q.marks;
    });

    const exam = await Exam.create({
      title,
      course,
      courseId: courseId || null,
      department,
      duration,
      questions,
      totalMarks,
      isActive: true,
      scheduledAt: new Date(scheduledAt),
      deadline: new Date(deadline),
      publishMode: publishMode || "auto",
      resultsPublished: false,
      createdBy: req.user.uid,
    });

    const Course = require("../models/Course");
    const courseData = await Course.findById(courseId);
    let students = [];
    if (courseData) {
      students = await User.find({ _id: { $in: courseData.students }, role: "student" });
    }
    for (const student of students) {
      const notifLink = courseId ? `/student/exams/${courseId}?examId=${exam._id}` : null;
      await Notification.create({
        userId: student._id,
        title: "New Exam Assigned",
        message: `"${title}" has been assigned for ${course}. Duration: ${duration} minutes`,
        type: "exam_reminder",
        link: notifLink,
      });

      const io = getIO();
      if (io) {
        io.to(`user_${student._id}`).emit("newNotification", {
          title: "New Exam Assigned",
          message: `"${title}" has been assigned for ${course}`,
          type: "exam_reminder",
          link: notifLink,
        });
      }
    }

    // Send emails in the background (non-blocking)
    if (students.length > 0) {
      for (const student of students) {
        if (student.email) {
          const emailData = emailTemplates.newExam(
            student.name || "Student",
            title,
            course,
            duration,
            exam.totalMarks || 0,
            scheduledAt,
            deadline,
            courseId,
            exam._id
          );
          queueEmail(student.email, emailData.subject, emailData.html);
        }
      }
    }

    res.status(201).json({ message: "Exam created successfully", exam });
  } catch (error) {
    console.error("Create exam error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all exams
exports.getExams = async (req, res) => {
  try {
    const filter = {};

    // Course filter
    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    // Department filter for students (only when no courseId)
    if (req.user.role === "student") {
      if (!req.query.courseId) {
        const student = await User.findById(req.user.uid);
        if (student) filter.department = student.department;
      }
      filter.isActive = true;
    }

    const exams = await Exam.find(filter)
      .populate("createdBy", "name email profilePicture department")
      .sort({ createdAt: -1 });
    res.json({ exams });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single exam for student (without correct answers)
exports.getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const examForStudent = exam.toObject();
    if (req.user.role === "student") {
      examForStudent.questions = examForStudent.questions.map((q) => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }

    res.json({ exam: examForStudent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get exam for teacher (with correct answers)
exports.getExamForTeacher = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate(
      "createdBy",
      "name",
    );
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    res.json({ exam });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit exam (Student)
exports.submitExam = async (req, res) => {
  try {
    const {
      examId,
      answers,
      tabSwitches,
      securityViolations,
      cheatingDetected,
      reason,
      aiPercentage,
    } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    let totalMarksObtained = 0;
    const evaluatedAnswers = answers.map((ans) => {
      const question = exam.questions[ans.questionIndex];
      if (!question)
        return { ...ans, marksObtained: 0, isCorrect: false, aiPercentage: 0 };

      if (question.type === "mcq") {
        const isCorrect = ans.answer === question.correctAnswer;
        const marksObtained = isCorrect ? question.marks : 0;
        totalMarksObtained += marksObtained;
        return { ...ans, marksObtained, isCorrect, aiPercentage: 0 };
      } else {
        return { ...ans, marksObtained: 0, isCorrect: false, aiPercentage: 0 };
      }
    });

    const percentage = Math.round((totalMarksObtained / exam.totalMarks) * 100);

    const existing = await ExamSubmission.findOne({
      examId,
      studentId: req.user.uid,
    });

    let savedSubmission;
    if (existing) {
      existing.answers = evaluatedAnswers;
      existing.totalMarksObtained = totalMarksObtained;
      existing.percentage = percentage;
      existing.tabSwitches = tabSwitches || 0;
      existing.securityViolations = securityViolations || 0;
      existing.cheatingDetected = cheatingDetected || false;
      existing.reason = reason || "";
      existing.aiPercentage = aiPercentage || 0;
      existing.graded = false;
      existing.submittedAt = new Date();
      await existing.save();
      savedSubmission = existing;
    } else {
      savedSubmission = await ExamSubmission.create({
        examId,
        studentId: req.user.uid,
        answers: evaluatedAnswers,
        totalMarksObtained,
        percentage,
        tabSwitches: tabSwitches || 0,
        securityViolations: securityViolations || 0,
        cheatingDetected: cheatingDetected || false,
        reason: reason || "",
        aiPercentage: aiPercentage || 0,
      });
    }

    // Check if results are published/auto-published to notify the student immediately
    const deadlinePassed = exam.deadline && new Date() >= new Date(exam.deadline);
    const isPublished = exam.resultsPublished || (exam.publishMode === "auto" && deadlinePassed);

    if (isPublished) {
      const scoreText = ` Total: ${totalMarksObtained}/${exam.totalMarks}`;
      const resultsLink = exam.courseId ? `/student/exams/${exam.courseId}?examId=${exam._id}` : null;
      
      const existingNotif = await Notification.findOne({
        userId: req.user.uid,
        type: "submission_status",
        link: resultsLink
      });

      if (!existingNotif) {
        const notification = await Notification.create({
          userId: req.user.uid,
          title: "📢 Exam Results Published!",
          message: `Results for "${exam.title}" have been released.${scoreText}`,
          type: "submission_status",
          link: resultsLink,
        });

        const io = getIO();
        if (io) {
          const notifData = notification.toObject ? notification.toObject() : notification;
          io.to(`user_${req.user.uid}`).emit("newNotification", { ...notifData, link: resultsLink });
        }

        const studentUser = await User.findById(req.user.uid);
        if (studentUser && studentUser.email) {
          const emailData = emailTemplates.examResultsPublished(
            studentUser.name || "Student",
            exam.title,
            exam.course,
            exam.totalMarks,
            `${totalMarksObtained}/${exam.totalMarks}`,
            exam.courseId,
            exam._id
          );
          queueEmail(studentUser.email, emailData.subject, emailData.html);
        }
      }
    }

    if (existing) {
      return res.json({
        message: "Exam re-submitted successfully",
        submission: savedSubmission,
      });
    }

    res
      .status(201)
      .json({ message: "Exam submitted successfully", submission: savedSubmission });
  } catch (error) {
    console.error("Submit exam error:", error);
    res.status(500).json({ error: error.message });
  }
};

// AI Detection endpoint
exports.analyzeAI = async (req, res) => {
  try {
    const { answers, questions } = req.body;
    if (!answers || !questions) {
      return res
        .status(400)
        .json({ error: "Answers and questions are required" });
    }
    const results = await analyzeAnswers(answers, questions);
    const writtenQuestions = results.filter((r) => {
      const q = questions[r.questionIndex];
      return q && q.type === "short";
    });
    const overallAI =
      writtenQuestions.length > 0
        ? Math.round(
            writtenQuestions.reduce((sum, r) => sum + r.aiPercentage, 0) /
              writtenQuestions.length,
          )
        : 0;
    res.json({ overallAI, questionAnalysis: results });
  } catch (error) {
    console.error("AI analysis error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get submissions (Teacher)
exports.getSubmissions = async (req, res) => {
  try {
    const submissions = await ExamSubmission.find({ examId: req.params.id })
      .populate("studentId", "name email")
      .sort({ submittedAt: -1 });
    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get my exam submissions (Student)
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await ExamSubmission.find({ studentId: req.user.uid })
      .populate("examId", "title course duration totalMarks department courseId deadline resultsPublished publishMode questions")
      .sort({ submittedAt: -1 });

    const processedSubmissions = submissions.map((sub) => {
      if (!sub.examId) return sub;
      const exam = sub.examId.toObject();

      const deadlinePassed = exam.deadline ? new Date() > new Date(exam.deadline) : false;
      const isMCQAutoPublished = (exam.publishMode === "auto" && deadlinePassed);
      const isFullPublished = exam.resultsPublished;

      if (exam.questions) {
        exam.questions = exam.questions.map((q) => {
          const showCorrectAnswer = isFullPublished || (isMCQAutoPublished && q.type === "mcq");
          if (!showCorrectAnswer) {
            const { correctAnswer, ...rest } = q;
            return rest;
          }
          return q;
        });
      }

      const subObj = sub.toObject();
      subObj.examId = exam;
      subObj.isResultsPublished = isFullPublished;
      subObj.isMCQAutoPublished = isMCQAutoPublished;
      return subObj;
    });

    res.json({ submissions: processedSubmissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Grade short answer (Teacher)
exports.gradeShortAnswer = async (req, res) => {
  try {
    const { submissionId, questionIndex, marksObtained, isCorrect, feedback } =
      req.body;
    const submission = await ExamSubmission.findById(submissionId);
    if (!submission)
      return res.status(404).json({ error: "Submission not found" });
    const answer = submission.answers.find(
      (a) => a.questionIndex === questionIndex,
    );
    if (!answer) return res.status(404).json({ error: "Answer not found" });
    answer.marksObtained = marksObtained || 0;
    answer.isCorrect = isCorrect || false;
    answer.feedback = feedback || "";
    submission.totalMarksObtained = submission.answers.reduce(
      (sum, a) => sum + (a.marksObtained || 0),
      0,
    );
    const exam = await Exam.findById(submission.examId);
    if (exam) {
      submission.percentage = Math.round(
        (submission.totalMarksObtained / exam.totalMarks) * 100,
      );
    }
    submission.graded = true;
    await submission.save();

    res.json({ message: "Graded successfully", submission });
  } catch (error) {
    console.error("Grade error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete exam (Teacher)
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    if (
      exam.createdBy.toString() !== req.user.uid &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await ExamSubmission.deleteMany({ examId: req.params.id });

    // Delete associated notifications
    await Notification.deleteMany({
      type: { $in: ["exam_reminder", "submission_status"] },
      message: { $regex: exam.title, $options: "i" }
    });

    await exam.deleteOne();
    res.json({ message: "Exam deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle exam active status
exports.toggleExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    exam.isActive = !exam.isActive;
    await exam.save();
    res.json({
      message: `Exam ${exam.isActive ? "activated" : "deactivated"}`,
      exam,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Publish exam results and notify all enrolled students
exports.publishExamResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    if (
      exam.createdBy.toString() !== req.user.uid &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    exam.resultsPublished = true;
    await exam.save();

    // Send notifications to all enrolled students
    const Course = require("../models/Course");
    const courseData = await Course.findById(exam.courseId);
    
    let students = [];
    if (courseData) {
      students = await User.find({
        _id: { $in: courseData.students },
        role: "student",
      });
    }

    const Notification = require("../models/Notification");
    const { getIO } = require("../socket");

    for (const student of students) {
      // Find their submission if they have one to mention their score
      const submission = await ExamSubmission.findOne({
        examId: exam._id,
        studentId: student._id,
      });

      const scoreText = submission 
        ? ` Total: ${submission.totalMarksObtained}/${exam.totalMarks}` 
        : "";

      const resultsLink = exam.courseId ? `/student/exams/${exam.courseId}?examId=${exam._id}` : null;
      const notification = await Notification.create({
        userId: student._id,
        title: "📢 Exam Results Published!",
        message: `Results for "${exam.title}" have been released.${scoreText}`,
        type: "submission_status",
        link: resultsLink,
      });

      const io = getIO();
      if (io) {
        const notifData = notification.toObject ? notification.toObject() : notification;
        io.to(`user_${student._id}`).emit("newNotification", { ...notifData, link: resultsLink });
      }

      // Send email in the background (non-blocking)
      if (student.email) {
        const emailScoreText = submission
          ? `${submission.totalMarksObtained}/${exam.totalMarks}`
          : "Not submitted";
        const emailData = emailTemplates.examResultsPublished(
          student.name || "Student",
          exam.title,
          exam.course,
          exam.totalMarks,
          emailScoreText,
          exam.courseId,
          exam._id
        );
        queueEmail(student.email, emailData.subject, emailData.html);
      }
    }

    res.json({ message: "Exam results published successfully", exam });
  } catch (error) {
    console.error("Publish exam results error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update overall feedback for exam submission (Teacher)
exports.updateOverallFeedback = async (req, res) => {
  try {
    const { feedback } = req.body;
    const submissionId = req.params.id;

    const submission = await ExamSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    submission.feedback = feedback || "";
    await submission.save();

    res.json({ message: "Overall feedback saved successfully", submission });
  } catch (error) {
    console.error("Overall feedback error:", error);
    res.status(500).json({ error: error.message });
  }
};
