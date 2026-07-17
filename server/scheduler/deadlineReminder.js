const cron = require("node-cron");
const Assignment = require("../models/Assignment");
const Exam = require("../models/Exam");
const Notification = require("../models/Notification");
const User = require("../models/User");
const ExamSubmission = require("../models/ExamSubmission");
const { sendEmail, emailTemplates, queueEmail } = require("../services/emailService");
const { getIO } = require("../socket");

// every one hour, check for assignments/exams with deadlines tomorrow and send notifications to students   
const startScheduler = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("🔍 Checking deadlines...");

    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      // Assignment reminders (similar logic)
      const assignments = await Assignment.find({
        deadline: {
          $gte: tomorrow,
          $lt: dayAfter,
        },
      });

      for (const assignment of assignments) {
        const students = await User.find({
          role: "student",
          department: assignment.department,
        });

        for (const student of students) {
          // Check if already notified
          const existingNotif = await Notification.findOne({
            userId: student._id,
            type: "assignment_due",
            createdAt: { $gte: now.setHours(0, 0, 0, 0) },
          });

          if (!existingNotif) {
            const notifLink = assignment.courseId ? `/student/assignments/${assignment.courseId}?assignmentId=${assignment._id}` : null;
            const notification = await Notification.create({
              userId: student._id,
              title: "⏰ Assignment Due Tomorrow!",
              message: `"${assignment.title}" is due tomorrow. Don't forget to submit!`,
              type: "assignment_due",
              link: notifLink,
            });

            const io = getIO();
            if (io) {
              const notifData = notification.toObject ? notification.toObject() : notification;
              io.to(`user_${student._id}`).emit("newNotification", { ...notifData, link: notifLink });
            }
          }
        }
      }

      // Exam reminders (similar logic)
      const exams = await Exam.find({
        deadline: {
          $gte: tomorrow,
          $lt: dayAfter,
        },
      });

      for (const exam of exams) {
        const students = await User.find({
          role: "student",
          department: exam.department,
        });

        for (const student of students) {
          const notifLink = exam.courseId ? `/student/exams/${exam.courseId}?examId=${exam._id}` : null;
          const notification = await Notification.create({
            userId: student._id,
            title: "📝 Exam Tomorrow!",
            message: `"${exam.title}" is scheduled for tomorrow. Be prepared!`,
            type: "exam_reminder",
            link: notifLink,
          });

          const io = getIO();
          if (io) {
            const notifData = notification.toObject ? notification.toObject() : notification;
            io.to(`user_${student._id}`).emit("newNotification", { ...notifData, link: notifLink });
          }
        }
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  });

  // Check every minute for auto-publish exams whose deadline has passed
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const expiredExams = await Exam.find({
        publishMode: "auto",
        resultsPublished: false,
        deadline: { $lte: now }
      });

      for (const exam of expiredExams) {
        exam.resultsPublished = true;
        await exam.save();

        const Course = require("../models/Course");
        const courseData = await Course.findById(exam.courseId);
        
        let students = [];
        if (courseData) {
          students = await User.find({
            _id: { $in: courseData.students },
            role: "student",
          });
        }

        for (const student of students) {
          const submission = await ExamSubmission.findOne({
            examId: exam._id,
            studentId: student._id,
          });

          const scoreText = submission 
            ? ` Total: ${submission.totalMarksObtained}/${exam.totalMarks}` 
            : "";

          const resultsLink = exam.courseId ? `/student/exams/${exam.courseId}?examId=${exam._id}` : null;
          
          const existing = await Notification.findOne({
            userId: student._id,
            type: "submission_status",
            link: resultsLink
          });

          if (!existing) {
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
        }
      }
    } catch (error) {
      console.error("Auto exam results publisher error:", error);
    }
  });

  console.log("✅ Scheduler started");
};

module.exports = startScheduler;
