const nodemailer = require("nodemailer");

const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");

// Create transporter with timeouts to prevent hanging sockets
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

// Date formatting helper to ensure no templates throw date parsing exceptions
const safeFormatDate = (dateVal) => {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (d.toString() === "Invalid Date") return String(dateVal);
    return d.toLocaleString();
  } catch (e) {
    return String(dateVal);
  }
};

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    console.log(`✉️ Attempting to send email to: ${to} | Subject: ${subject}`);
    const mailOptions = {
      from: `"UFTB Moodle" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}:`, info.messageId);
    return info;
  } catch (error) {
    console.error(`❌ Email send error for ${to}:`, error);
    return null;
  }
};

// Email templates
const emailTemplates = {
  // New exam assigned
  newExam: (studentName, examTitle, course, duration, totalMarks, scheduledAt, deadline, courseId, examId) => {
    const startStr = safeFormatDate(scheduledAt);
    const endStr = safeFormatDate(deadline);
    const resultsLink = courseId ? `${clientUrl}/student/exams/${courseId}?examId=${examId}` : `${clientUrl}/student/dashboard`;
    return {
      subject: `New Exam Assigned: ${examTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0;">UFTB Moodle</h2>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <h3 style="color: #2C4B66;">Hello ${studentName},</h3>
            <p>A new examination has been scheduled and assigned for your course:</p>
            <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Exam Title:</strong> ${examTitle}</p>
              <p style="margin: 5px 0;"><strong>Course:</strong> ${course || "N/A"}</p>
              <p style="margin: 5px 0;"><strong>Duration:</strong> ${duration} minutes</p>
              <p style="margin: 5px 0;"><strong>Total Marks:</strong> ${totalMarks} Marks</p>
              <p style="margin: 5px 0;"><strong>Start Time:</strong> ${startStr}</p>
              <p style="margin: 5px 0;"><strong>End Time:</strong> ${endStr}</p>
            </div>
            <p style="color: #ef4444; font-size: 13px; margin: 10px 0;"><strong>⚠️ Fullscreen mode is mandatory and tab switching is blocked during the exam.</strong></p>
            <a href="${resultsLink}" style="display: inline-block; background: linear-gradient(135deg, #7EC8E3, #3B8DB3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Launch Exam Portal</a>
          </div>
        </div>
      `
    };
  },

  // New lecture uploaded
  newLecture: (studentName, lectureTitle, course) => ({
    subject: `New Lecture Uploaded: ${lectureTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">UFTB Moodle</h2>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h3 style="color: #2C4B66;">Hello ${studentName},</h3>
          <p>A new lecture has been uploaded for your course:</p>
          <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Lecture:</strong> ${lectureTitle}</p>
            <p style="margin: 5px 0;"><strong>Course:</strong> ${course}</p>
          </div>
          <p>Please login to your dashboard to view and download the lecture material.</p>
          <a href="${clientUrl}/student/dashboard" style="display: inline-block; background: linear-gradient(135deg, #7EC8E3, #3B8DB3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Dashboard</a>
        </div>
      </div>
    `,
  }),

  // New assignment
  newAssignment: (studentName, assignmentTitle, course, deadline) => ({
    subject: `New Assignment: ${assignmentTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">UFTB Moodle</h2>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h3 style="color: #2C4B66;">Hello ${studentName},</h3>
          <p>A new assignment has been created:</p>
          <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Assignment:</strong> ${assignmentTitle}</p>
            <p style="margin: 5px 0;"><strong>Course:</strong> ${course}</p>
            <p style="margin: 5px 0;"><strong>Deadline:</strong> ${safeFormatDate(deadline)}</p>
          </div>
          <p style="color: #EF4444;"><strong>Don't forget to submit before the deadline!</strong></p>
          <a href="${clientUrl}/student/assignments" style="display: inline-block; background: linear-gradient(135deg, #7EC8E3, #3B8DB3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Assignment</a>
        </div>
      </div>
    `,
  }),

  // Assignment graded
  assignmentGraded: (studentName, assignmentTitle, marks, feedback) => ({
    subject: `Assignment Graded: ${assignmentTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">UFTB Moodle</h2>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h3 style="color: #2C4B66;">Hello ${studentName},</h3>
          <p>Your assignment has been graded:</p>
          <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Assignment:</strong> ${assignmentTitle}</p>
            <p style="margin: 5px 0;"><strong>Marks:</strong> ${marks}</p>
            ${feedback ? `<p style="margin: 5px 0;"><strong>Feedback:</strong> ${feedback}</p>` : ""}
          </div>
          <a href="${clientUrl}/student/assignments" style="display: inline-block; background: linear-gradient(135deg, #7EC8E3, #3B8DB3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Details</a>
        </div>
      </div>
    `,
  }),

  // Marksheet uploaded
  marksheetUploaded: (studentName, courseCode, totalMarks, attendance, quiz, assignment, presentation) => ({
    subject: `Assessment Marksheet Uploaded: ${courseCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">UFTB Moodle</h2>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h3 style="color: #2C4B66;">Hello ${studentName},</h3>
          <p>Your assessment marks for the course <strong>${courseCode}</strong> have been uploaded:</p>
          <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Attendance Marks:</strong> ${attendance}</p>
            <p style="margin: 5px 0;"><strong>Quiz Marks:</strong> ${quiz}</p>
            <p style="margin: 5px 0;"><strong>Assignment Marks:</strong> ${assignment}</p>
            <p style="margin: 5px 0;"><strong>Presentation Marks:</strong> ${presentation}</p>
            <hr style="border: 0; border-top: 1px solid #cce2f0; margin: 10px 0;" />
            <p style="margin: 5px 0; font-size: 16px; color: #10b981;"><strong>Total Marks:</strong> ${totalMarks}</p>
          </div>
          <a href="${clientUrl}/student/assessment" style="display: inline-block; background: linear-gradient(135deg, #7EC8E3, #3B8DB3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Marksheet</a>
        </div>
      </div>
    `,
  }),

  // New community post
  newCommunityPost: (recipientName, authorName, postTitle, courseCode) => ({
    subject: `New Post in ${courseCode} Community: ${postTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">UFTB Moodle</h2>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h3 style="color: #2C4B66;">Hello ${recipientName},</h3>
          <p>A new discussion has been started in the <strong>${courseCode}</strong> Community Hub:</p>
          <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Post Title:</strong> ${postTitle}</p>
            <p style="margin: 5px 0;"><strong>Posted By:</strong> ${authorName}</p>
          </div>
          <a href="${clientUrl}/community" style="display: inline-block; background: linear-gradient(135deg, #7EC8E3, #3B8DB3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Community Hub</a>
        </div>
      </div>
    `,
  }),

  // New private message
  newPrivateMessage: (recipientName, senderName, messageContent, senderId) => {
    const chatLink = `${clientUrl}/community/messages/${senderId}`;
    return {
      subject: `New Message from ${senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0;">UFTB Moodle Chat</h2>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <h3 style="color: #2C4B66;">Hello ${recipientName},</h3>
            <p>You have received a new private message from <strong>${senderName}</strong>:</p>
            <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0; font-style: italic;">
              "${messageContent}"
            </div>
            <a href="${chatLink}" style="display: inline-block; background: linear-gradient(135deg, #7EC8E3, #3B8DB3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reply to Message</a>
          </div>
        </div>
      `
    };
  },

  // Exam results published
  examResultsPublished: (studentName, examTitle, course, totalMarks, scoreText, courseId, examId) => {
    const resultsLink = courseId ? `${clientUrl}/student/exams/${courseId}?examId=${examId}` : `${clientUrl}/student/dashboard`;
    return {
      subject: `Exam Results Published: ${examTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0;">UFTB Moodle</h2>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <h3 style="color: #2C4B66;">Hello ${studentName},</h3>
            <p>Results for the following exam have been released:</p>
            <div style="background: #E8F4FD; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Exam Title:</strong> ${examTitle}</p>
              <p style="margin: 5px 0;"><strong>Course:</strong> ${course || "N/A"}</p>
              <p style="margin: 5px 0;"><strong>Total Marks:</strong> ${totalMarks} Marks</p>
              <p style="margin: 5px 0; color: #10b981;"><strong>Result Status:</strong> ${scoreText}</p>
            </div>
            <a href="${resultsLink}" style="display: inline-block; background: linear-gradient(135deg, #7EC8E3, #3B8DB3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Detailed Results</a>
          </div>
        </div>
      `
    };
  },
};

// ==================== EMAIL QUEUE ====================
const emailQueue = [];
let isProcessing = false;
const RATE_LIMIT_DELAY_MS = 250;
const MAX_RETRIES_PER_EMAIL = 3;

async function processQueue() {
  if (isProcessing || emailQueue.length === 0) return;
  isProcessing = true;

  const activePromises = [];
  const concurrency = 3;

  while (emailQueue.length > 0) {
    if (activePromises.length >= concurrency) {
      await Promise.race(activePromises);
    }

    const job = emailQueue.shift();
    const { to, subject, html, retries = 0 } = job;

    const promise = (async () => {
      try {
        const mailOptions = {
          from: `"UFTB Moodle" <${process.env.EMAIL_USER}>`,
          to,
          subject,
          html,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`📬 Queue: Email sent to ${to} (${info.messageId})`);
      } catch (error) {
        console.error(`❌ Queue: Email failed for ${to} - ${error.message}`);
        
        const isPermanent = error.responseCode >= 500 || 
                            (error.message && (
                              error.message.toLowerCase().includes("550") || 
                              error.message.toLowerCase().includes("5.1.1") || 
                              error.message.toLowerCase().includes("recipient address rejected") ||
                              error.message.toLowerCase().includes("does not exist") ||
                              error.message.toLowerCase().includes("not found") ||
                              error.message.toLowerCase().includes("invalid recipient")
                            ));

        if (!isPermanent && retries < MAX_RETRIES_PER_EMAIL) {
          job.retries = retries + 1;
          emailQueue.push(job);
          console.log(`🔄 Queue: Re-queued for ${to} (attempt ${job.retries}/${MAX_RETRIES_PER_EMAIL})`);
        } else {
          console.error(`🚫 Queue: Giving up on ${to} (permanent error or max retries reached)`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    })();

    activePromises.push(promise);
    promise.finally(() => {
      const index = activePromises.indexOf(promise);
      if (index > -1) activePromises.splice(index, 1);
    });
  }

  if (activePromises.length > 0) {
    await Promise.all(activePromises);
  }

  isProcessing = false;
}

function queueEmail(to, subject, html) {
  if (!to) {
    console.warn("⚠️ Queue: No email address provided, skipping");
    return;
  }
  emailQueue.push({ to, subject, html, retries: 0 });
  processQueue();
}

module.exports = { sendEmail, emailTemplates, queueEmail };
