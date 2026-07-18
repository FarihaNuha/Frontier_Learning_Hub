const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Course = require("../models/Course");
const { getIO } = require("../socket");
const { sendEmail, emailTemplates, queueEmail } = require("../services/emailService");
const fs = require("fs");
const path = require("path");
const similarityService = require("../services/similarityService");
const previewService = require("../services/previewService");

// Create assignment (Teacher only)
exports.createAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      courseId,
      department,
      deadline,
      totalMarks,
    } = req.body;

    if (!title || !course || !department || !deadline) {
      return res
        .status(400)
        .json({ error: "Please provide all required fields" });
    }

    const assignmentData = {
      title,
      description: description || "",
      course,
      courseId: courseId || null,
      department,
      deadline: new Date(deadline),
      totalMarks: totalMarks || 100,
      createdBy: req.user.uid,
    };

    if (req.file) {
      assignmentData.fileURL = `/uploads/${req.file.filename}`;
      assignmentData.fileName = req.file.originalname;
      assignmentData.fileType = req.file.mimetype;
    }

    const assignment = await Assignment.create(assignmentData);

    // Get enrolled students only
    let students = [];
    if (courseId) {
      const courseData = await Course.findById(courseId);
      if (courseData) {
        students = await User.find({
          _id: { $in: courseData.students },
          role: "student",
        });
      }
    }

    for (const student of students) {
      const notifLink = courseId ? `/student/assignments/${courseId}?assignmentId=${assignment._id}` : null;
      await Notification.create({
        userId: student._id,
        title: "New Assignment",
        message: `"${title}" has been assigned for ${course}. Due: ${new Date(deadline).toLocaleDateString()}`,
        type: "assignment_due",
        link: notifLink,
      });

      const io = getIO();
      if (io) {
        io.to(`user_${student._id}`).emit("newNotification", {
          title: "New Assignment",
          message: `"${title}" has been assigned for ${course}`,
          type: "assignment_due",
          link: notifLink,
        });
      }
    }

    // Send emails in the background (non-blocking)
    if (students.length > 0) {
      for (const student of students) {
        if (student.email) {
          const { subject, html } = emailTemplates.newAssignment(
            student.name || "Student",
            title,
            course,
            deadline,
          );
          queueEmail(student.email, subject, html);
        }
      }
    }

    res
      .status(201)
      .json({ message: "Assignment created successfully", assignment });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all assignments
exports.getAssignments = async (req, res) => {
  try {
    const filter = {};

    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    if (req.user.role === "student" && !req.query.courseId) {
      const student = await User.findById(req.user.uid);
      if (student) filter.department = student.department;
    }

    if (req.query.department) filter.department = req.query.department;
    if (req.query.course) filter.course = req.query.course;

    const assignments = await Assignment.find(filter)
      .populate("createdBy", "name email profilePicture department")
      .sort({ createdAt: -1 });

    res.json({ assignments });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get single assignment
exports.getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate(
      "createdBy",
      "name email profilePicture department"
    );
    if (!assignment)
      return res.status(404).json({ error: "Assignment not found" });
    res.json({ assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle submission portal (Teacher)
exports.toggleSubmission = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment)
      return res.status(404).json({ error: "Assignment not found" });
    assignment.submissionEnabled = !assignment.submissionEnabled;
    await assignment.save();
    res.json({
      message: `Submission portal ${assignment.submissionEnabled ? "enabled" : "disabled"}`,
      assignment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete assignment (Teacher)
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment)
      return res.status(404).json({ error: "Assignment not found" });
    if (
      assignment.createdBy.toString() !== req.user.uid &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await Submission.deleteMany({ assignmentId: req.params.id });
    
    // Delete associated notifications
    await Notification.deleteMany({
      type: "assignment_due",
      message: { $regex: assignment.title, $options: "i" }
    });

    await assignment.deleteOne();
    res.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resolveServerFilePath = (fileURL) => {
  if (!fileURL) return null;
  const rel = fileURL.replace(/^\/?uploads\//, "");
  const p1 = path.join(__dirname, "../../uploads", rel);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "uploads", rel);
  if (fs.existsSync(p2)) return p2;
  const p3 = path.join(__dirname, "../uploads", rel);
  if (fs.existsSync(p3)) return p3;
  return p1;
};

// Internal helper to recalculate and update similarity scores for all submissions of an assignment chronologically
const recalculateAssignmentSimilarity = async (assignmentId) => {
  try {
    const Assignment = require("../models/Assignment");
    const Submission = require("../models/Submission");

    const submissions = await Submission.find({ assignmentId }).sort({ submittedAt: 1 });
    const submissionSentencesCache = {};
    const submissionRawTextCache = {};

    // First pass: extract and cache sentences & raw text for all submissions (supporting PDF, DOCX, TXT)
    for (let i = 0; i < submissions.length; i++) {
      const currentSub = submissions[i];
      let currentFiles = currentSub.files || [];
      if (currentFiles.length === 0 && currentSub.fileURL) {
        currentFiles = [{ fileURL: currentSub.fileURL, originalName: currentSub.originalName }];
      }

      let allCurrentSentences = [];
      let allRawTexts = [];
      for (const f of currentFiles) {
        const ext = path.extname(f.originalName || f.fileURL).toLowerCase();
        if (ext === ".txt" || ext === ".docx" || ext === ".pdf") {
          const filePath = resolveServerFilePath(f.fileURL);
          if (filePath && fs.existsSync(filePath)) {
            try {
              const text = await similarityService.extractTextFromFile(filePath);
              const sentences = similarityService.splitIntoSentences(text);
              allCurrentSentences.push(...sentences);
              allRawTexts.push(text);
            } catch (err) {
              console.error(`Recalculate: Text extraction failed for student ${currentSub.studentId}:`, err);
            }
          }
        }
      }
      submissionSentencesCache[currentSub._id.toString()] = allCurrentSentences;
      submissionRawTextCache[currentSub._id.toString()] = allRawTexts.join(" ");
    }

    // Second pass: compute similarity by comparing each submission only with earlier submissions (j < i)
    for (let i = 0; i < submissions.length; i++) {
      const currentSub = submissions[i];
      const allCurrentSentences = submissionSentencesCache[currentSub._id.toString()] || [];
      const currentRawText = submissionRawTextCache[currentSub._id.toString()] || "";

      let highestSimilarityPercent = 0;
      let highestMatchedStudent = null;
      let highestMatchedSubmission = null;
      let similarityMatches = [];

      if (allCurrentSentences.length > 0 || currentRawText.length > 0) {
        for (let j = 0; j < i; j++) {
          const otherSub = submissions[j];
          if (otherSub.studentId.toString() === currentSub.studentId.toString()) continue;

          const otherSentences = submissionSentencesCache[otherSub._id.toString()] || [];
          const otherRawText = submissionRawTextCache[otherSub._id.toString()] || "";

          if (otherSentences.length > 0 || otherRawText.length > 0) {
            const similarity = similarityService.calculateSimilarity(
              allCurrentSentences, 
              otherSentences, 
              currentRawText, 
              otherRawText
            );
            
            if (similarity > 0) {
              similarityMatches.push({
                studentId: otherSub.studentId,
                submissionId: otherSub._id,
                similarityPercent: similarity
              });

              if (similarity > highestSimilarityPercent) {
                highestSimilarityPercent = similarity;
                highestMatchedStudent = otherSub.studentId;
                highestMatchedSubmission = otherSub._id;
              }
            }
          }
        }
      }

      currentSub.similarityPercent = highestSimilarityPercent;
      currentSub.similarityMatchedStudent = highestMatchedStudent;
      currentSub.similarityMatchedSubmission = highestMatchedSubmission;
      currentSub.similarityMatches = similarityMatches;
      await currentSub.save();
    }
  } catch (error) {
    console.error("Error in recalculateAssignmentSimilarity:", error);
  }
};

// Submit assignment (Student)
exports.submitAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment)
      return res.status(404).json({ error: "Assignment not found" });
    if (!assignment.submissionEnabled)
      return res
        .status(400)
        .json({ error: "Submission portal is closed by teacher" });

    const existingSubmission = await Submission.findOne({
      assignmentId: req.params.id,
      studentId: req.user.uid,
    });

    let keepFiles = [];
    let hasKeepFilesField = false;
    if (req.body.keepFiles) {
      try {
        keepFiles = JSON.parse(req.body.keepFiles);
        hasKeepFilesField = true;
      } catch (e) {
        console.error("Failed to parse keepFiles:", e);
      }
    }

    let finalFiles = [];
    if (hasKeepFilesField) {
      if (existingSubmission && existingSubmission.files) {
        const keepURLs = keepFiles.map(f => f.fileURL);
        for (const f of existingSubmission.files) {
          if (!keepURLs.includes(f.fileURL)) {
            const oldFilePath = path.join(__dirname, "../../", f.fileURL);
            try { fs.unlinkSync(oldFilePath); } catch (e) {}
          } else {
            finalFiles.push(f);
          }
        }
      }
    } else if (existingSubmission) {
      if (req.files && req.files.length > 0) {
        let oldFiles = existingSubmission.files || [];
        if (oldFiles.length === 0 && existingSubmission.fileURL) {
          oldFiles = [{ fileURL: existingSubmission.fileURL }];
        }
        for (const f of oldFiles) {
          const oldFilePath = path.join(__dirname, "../../", f.fileURL);
          try { fs.unlinkSync(oldFilePath); } catch (e) {}
        }
      } else {
        finalFiles = existingSubmission.files || [];
        if (finalFiles.length === 0 && existingSubmission.fileURL) {
          finalFiles = [{ fileURL: existingSubmission.fileURL, originalName: existingSubmission.originalName }];
        }
      }
    }

    let newUploadedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        newUploadedFiles.push({
          fileURL: `/uploads/${file.filename}`,
          originalName: file.originalname,
          path: file.path
        });
      }
    }

    const now = new Date();
    const isLate = now > new Date(assignment.deadline);

    const submissionData = {
      assignmentId: req.params.id,
      studentId: req.user.uid,
      isLate,
      submittedAt: now,
      updatedAt: now,
      fileURL: allCurrentFiles.length > 0 ? allCurrentFiles[0].fileURL : "",
      originalName: allCurrentFiles.length > 0 ? allCurrentFiles[0].originalName : "",
      files: allCurrentFiles.map(f => ({ fileURL: f.fileURL, originalName: f.originalName })),
      similarityPercent: 0,
      similarityMatchedStudent: null,
      similarityMatchedSubmission: null
    };

    if (req.body.comment !== undefined) submissionData.comment = req.body.comment;

    let submission;
    if (existingSubmission) {
      Object.assign(existingSubmission, submissionData);
      submission = await existingSubmission.save();
    } else {
      submission = await Submission.create(submissionData);
    }

    // Trigger chronological cascade update of all similarity scores for this assignment
    await recalculateAssignmentSimilarity(req.params.id);

    // Fetch the updated submission from DB to return it
    const updatedSub = await Submission.findById(submission._id);
    const sanitizedSub = updatedSub.toObject();
    delete sanitizedSub.similarityMatchedStudent;
    delete sanitizedSub.similarityMatchedSubmission;
    delete sanitizedSub.similarityMatches;

    res.status(existingSubmission ? 200 : 201).json({
      message: existingSubmission 
        ? "Submission updated successfully" + (isLate ? " (Late)" : "")
        : "Assignment submitted successfully" + (isLate ? " (Late Submission)" : ""),
      submission: sanitizedSub,
    });
  } catch (error) {
    console.error("Submit error:", error);
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
    }
    res.status(500).json({ error: error.message });
  }
};

// Get submissions (Teacher)
exports.getSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ assignmentId: req.params.id })
      .populate("studentId", "name email studentId")
      .populate("similarityMatchedStudent", "name email studentId")
      .populate("similarityMatchedSubmission", "originalName")
      .populate("similarityMatches.studentId", "name email studentId")
      .populate("similarityMatches.submissionId", "originalName")
      .sort({ submittedAt: -1 });
    const onTime = submissions.filter((s) => !s.isLate);
    const late = submissions.filter((s) => s.isLate);
    res.json({ submissions, onTime, late, total: submissions.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get my submissions (Student)
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user.uid })
      .populate({
        path: "assignmentId",
        select: "title course deadline totalMarks submissionEnabled fileURL",
        populate: { path: "createdBy", select: "name" },
      })
      .sort({ submittedAt: -1 });

    const sanitizedSubmissions = submissions.map((sub) => {
      const obj = sub.toObject();
      delete obj.similarityMatchedStudent;
      delete obj.similarityMatchedSubmission;
      delete obj.similarityMatches;
      return obj;
    });

    res.json({ submissions: sanitizedSubmissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete submission (Student)
exports.deleteSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission)
      return res.status(404).json({ error: "Submission not found" });
    if (submission.studentId.toString() !== req.user.uid)
      return res.status(403).json({ error: "Not authorized" });
    const assignment = await Assignment.findById(submission.assignmentId);
    if (new Date() > new Date(assignment.deadline))
      return res
        .status(400)
        .json({ error: "Cannot delete submission after deadline" });

    // Also delete files from storage
    let filesToDelete = submission.files || [];
    if (filesToDelete.length === 0 && submission.fileURL) {
      filesToDelete = [{ fileURL: submission.fileURL }];
    }
    for (const f of filesToDelete) {
      const filePath = path.join(__dirname, "../../", f.fileURL);
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    const assignmentId = submission.assignmentId;
    await submission.deleteOne();

    // Recalculate similarity for the remaining submissions
    await recalculateAssignmentSimilarity(assignmentId);

    res.json({ message: "Submission deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Grade submission (Teacher)
exports.gradeSubmission = async (req, res) => {
  try {
    const { marks, feedback } = req.body;
    const submission = await Submission.findById(req.params.id);
    if (!submission)
      return res.status(404).json({ error: "Submission not found" });
    submission.marks = marks;
    submission.feedback = feedback || "";
    await submission.save();

    const assignment = await Assignment.findById(submission.assignmentId);
    const student = await User.findById(submission.studentId);

    const gradeLink = assignment.courseId ? `/student/assignments/${assignment.courseId}?assignmentId=${assignment._id}` : null;
    await Notification.create({
      userId: submission.studentId,
      title: "Assignment Graded",
      message: `Your submission for "${assignment.title}" has been graded. Marks: ${marks}`,
      type: "submission_status",
      link: gradeLink,
    });
    const io = getIO();
    if (io)
      io.to(`user_${submission.studentId}`).emit("newNotification", {
        title: "Assignment Graded",
        message: `Your submission has been graded. Marks: ${marks}`,
        type: "submission_status",
        link: gradeLink,
      });
    if (student && student.email) {
      const { subject, html } = emailTemplates.assignmentGraded(
        student.name,
        assignment.title,
        marks,
        feedback,
      );
      queueEmail(student.email, subject, html);
    }
    res.json({ message: "Graded successfully", submission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// View assignment file as Base64 JSON (prevent IDM interception)
exports.viewAssignmentBase64 = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (!assignment.fileURL) return res.status(404).json({ error: "No file attached to this assignment" });

    const filePath = resolveServerFilePath(assignment.fileURL);
    if (!filePath || !fs.existsSync(filePath))
      return res.status(404).json({ error: "File not found on server" });

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");

    const previewData = await previewService.generatePreviewData(filePath, assignment.fileURL);

    res.json({
      success: true,
      title: assignment.title,
      fileType: assignment.fileURL.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
      base64: base64Data,
      previewType: previewData.previewType,
      previewHtml: previewData.html || null,
      previewText: previewData.text || null,
      mimeType: previewData.mimeType || null
    });
  } catch (error) {
    console.error("Assignment base64 view error:", error);
    res.status(500).json({ error: error.message });
  }
};

// View submission file as Base64 JSON (prevent IDM interception)
exports.viewSubmissionBase64 = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    let fileURL = submission.fileURL;
    let originalName = submission.originalName;

    if (req.query.fileURL) {
      const matched = (submission.files || []).find(f => f.fileURL === req.query.fileURL);
      if (matched) {
        fileURL = matched.fileURL;
        originalName = matched.originalName;
      } else {
        fileURL = req.query.fileURL;
        originalName = path.basename(req.query.fileURL);
      }
    }

    if (!fileURL) return res.status(404).json({ error: "No file attached to this submission" });

    const filePath = resolveServerFilePath(fileURL);
    if (!filePath || !fs.existsSync(filePath))
      return res.status(404).json({ error: "File not found on server" });

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");

    const previewData = await previewService.generatePreviewData(filePath, originalName || fileURL);

    const fileType = (originalName || fileURL).toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : "application/octet-stream";

    res.json({
      success: true,
      title: originalName || "Submission File",
      fileType: fileType,
      base64: base64Data,
      previewType: previewData.previewType,
      previewHtml: previewData.html || null,
      previewText: previewData.text || null,
      mimeType: previewData.mimeType || null
    });
  } catch (error) {
    console.error("Submission base64 view error:", error);
    res.status(500).json({ error: error.message });
  }
};
