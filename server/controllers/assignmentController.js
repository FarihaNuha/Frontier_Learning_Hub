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
      const VIDEO_AUDIO_TYPES = [
        "video/mp4", "video/webm", "video/avi", "video/quicktime",
        "video/x-msvideo", "video/mkv", "video/x-matroska",
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a",
      ];
      const isVideoAudio = VIDEO_AUDIO_TYPES.includes(req.file.mimetype);
      const fileSize = req.file.size || 0;
      assignmentData.fileURL = `/uploads/${req.file.filename}`;
      assignmentData.fileName = req.file.originalname;
      assignmentData.fileType = req.file.mimetype;
      if (!isVideoAudio && fileSize < 10 * 1024 * 1024) {
        try {
          assignmentData.fileData = fs.readFileSync(req.file.path).toString("base64");
        } catch (e) {}
      }
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
  
  // Extract filename safely from full URLs or relative paths
  let rel = fileURL;
  if (fileURL.includes("/uploads/")) {
    rel = fileURL.split("/uploads/").pop();
  } else if (fileURL.includes("\\uploads\\")) {
    rel = fileURL.split("\\uploads\\").pop();
  } else {
    rel = path.basename(fileURL);
  }
  
  // Strip query parameters if any
  rel = rel.split("?")[0].replace(/^\//, "");

  const pathsToTry = [
    path.join(__dirname, "../../uploads", rel),
    path.join(process.cwd(), "uploads", rel),
    path.join(__dirname, "../uploads", rel),
    path.join(process.cwd(), "server", "uploads", rel),
    path.join(__dirname, "../../", fileURL),
    path.join(process.cwd(), fileURL)
  ];

  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return pathsToTry[0];
};

// Internal helper to recalculate and update similarity scores for all submissions of an assignment chronologically
const recalculateAssignmentSimilarity = async (assignmentId) => {
  try {
    const Assignment = require("../models/Assignment");
    const Submission = require("../models/Submission");

    const submissions = await Submission.find({ assignmentId }).sort({ submittedAt: 1 });
    const submissionSentencesCache = {};
    const submissionRawTextCache = {};

    // First pass: retrieve or extract raw text for all submissions (supporting PDF, DOCX, TXT)
    for (let i = 0; i < submissions.length; i++) {
      const currentSub = submissions[i];
      let extractedText = currentSub.extractedText || "";

      // If database has no extracted text cache, try to extract from local file and update DB cache
      if (!extractedText) {
        let currentFiles = currentSub.files || [];
        if (currentFiles.length === 0 && currentSub.fileURL) {
          currentFiles = [{ fileURL: currentSub.fileURL, originalName: currentSub.originalName }];
        }

        let allRawTexts = [];
        for (const f of currentFiles) {
          const ext = path.extname(f.originalName || f.fileURL).toLowerCase();
          if (ext === ".txt" || ext === ".docx" || ext === ".pdf") {
            const filePath = resolveServerFilePath(f.fileURL);
            if (filePath && fs.existsSync(filePath)) {
              try {
                const text = await similarityService.extractTextFromFile(filePath);
                allRawTexts.push(text);
              } catch (err) {
                console.error(`Recalculate: Text extraction failed for student ${currentSub.studentId}:`, err);
              }
            }
          }
        }
        extractedText = allRawTexts.join(" ");
        if (extractedText) {
          currentSub.extractedText = extractedText;
          await currentSub.save();
        }
      }

      const sentences = similarityService.splitIntoSentences(extractedText);
      submissionSentencesCache[currentSub._id.toString()] = sentences;
      submissionRawTextCache[currentSub._id.toString()] = extractedText;
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
      const VIDEO_AUDIO_TYPES = [
        "video/mp4", "video/webm", "video/avi", "video/quicktime",
        "video/x-msvideo", "video/mkv", "video/x-matroska",
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a",
      ];
      for (const file of req.files) {
        const isVideoAudio = VIDEO_AUDIO_TYPES.includes(file.mimetype);
        const fileSize = file.size || 0;
        let b64 = "";
        if (!isVideoAudio && fileSize < 10 * 1024 * 1024) {
          try {
            b64 = fs.readFileSync(file.path).toString("base64");
          } catch (e) {}
        }
        newUploadedFiles.push({
          fileURL: `/uploads/${file.filename}`,
          originalName: file.originalname,
          fileData: b64,
          path: file.path
        });
      }
    }

    const now = new Date();
    const isLate = now > new Date(assignment.deadline);
    const allCurrentFiles = [...finalFiles, ...newUploadedFiles];

    // Extract text from newly uploaded/kept files for database-level plagiarism comparison cache
    let extractedText = "";
    try {
      let allRawTexts = [];
      for (const f of allCurrentFiles) {
        const ext = path.extname(f.originalName || f.fileURL).toLowerCase();
        if (ext === ".txt" || ext === ".docx" || ext === ".pdf") {
          const filePath = resolveServerFilePath(f.fileURL);
          if (filePath && fs.existsSync(filePath)) {
            const text = await similarityService.extractTextFromFile(filePath);
            allRawTexts.push(text);
          }
        }
      }
      extractedText = allRawTexts.join(" ");
    } catch (extractErr) {
      console.error("Text extraction failed during submission:", extractErr);
    }

    const submissionData = {
      assignmentId: req.params.id,
      studentId: req.user.uid,
      isLate,
      submittedAt: now,
      updatedAt: now,
      fileURL: allCurrentFiles.length > 0 ? allCurrentFiles[0].fileURL : "",
      fileData: allCurrentFiles.length > 0 ? (allCurrentFiles[0].fileData || "") : "",
      originalName: allCurrentFiles.length > 0 ? allCurrentFiles[0].originalName : "",
      files: allCurrentFiles.map(f => ({ fileURL: f.fileURL, originalName: f.originalName, fileData: f.fileData || "" })),
      extractedText,
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
    try {
      await recalculateAssignmentSimilarity(req.params.id);
    } catch (recalcErr) {
      console.error("Auto recalculate similarity error:", recalcErr);
    }
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

    let filePath = resolveServerFilePath(assignment.fileURL);
    
    // Auto-restore from DB fileData if physical file is missing from local disk
    if ((!filePath || !fs.existsSync(filePath)) && assignment.fileData) {
      try {
        const filename = path.basename(assignment.fileURL);
        const targetPath = path.join(__dirname, "../../uploads", filename);
        fs.writeFileSync(targetPath, Buffer.from(assignment.fileData, "base64"));
        filePath = targetPath;
      } catch (restoreErr) {
        console.error("Failed to restore assignment file from DB:", restoreErr);
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      // Return rich fallback document preview from Assignment metadata
      const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; padding: 30px; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 8px;">
          <h2 style="color: #0369a1; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">${assignment.title}</h2>
          <p style="margin: 6px 0; color: #475569;"><strong>Course:</strong> ${assignment.course || "N/A"}</p>
          <p style="margin: 6px 0; color: #475569;"><strong>Deadline:</strong> ${assignment.deadline ? new Date(assignment.deadline).toLocaleString() : "N/A"}</p>
          <p style="margin: 6px 0; color: #475569;"><strong>Total Marks:</strong> ${assignment.totalMarks || 100}</p>
          <div style="margin-top: 24px; padding: 20px; background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 6px;">
            <h4 style="margin-top: 0; color: #334155; margin-bottom: 8px;">Assignment Description & Instructions</h4>
            <div style="white-space: pre-wrap; font-size: 14px; color: #334155;">${assignment.description || "No detailed description provided."}</div>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #64748b; font-style: italic; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
            📄 Note: File binary (${assignment.fileName || "document"}) was uploaded from another machine. Document details retrieved from MongoDB records.
          </p>
        </div>
      `;
      return res.json({
        success: true,
        title: assignment.title,
        fileType: "text/html",
        base64: Buffer.from(fallbackHtml).toString("base64"),
        previewType: "html",
        previewHtml: fallbackHtml,
        previewText: assignment.description || assignment.title,
        mimeType: "text/html"
      });
    }

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
    let fileDataB64 = submission.fileData || "";

    if (req.query.fileURL) {
      const matched = (submission.files || []).find(f => f.fileURL === req.query.fileURL);
      if (matched) {
        fileURL = matched.fileURL;
        originalName = matched.originalName;
        if (matched.fileData) fileDataB64 = matched.fileData;
      } else {
        fileURL = req.query.fileURL;
        originalName = path.basename(req.query.fileURL);
      }
    }

    if (!fileURL) return res.status(404).json({ error: "No file attached to this submission" });

    let filePath = resolveServerFilePath(fileURL);

    // Auto-restore from DB fileData if physical file is missing from local disk
    if ((!filePath || !fs.existsSync(filePath)) && fileDataB64) {
      try {
        const filename = path.basename(fileURL);
        const targetPath = path.join(__dirname, "../../uploads", filename);
        fs.writeFileSync(targetPath, Buffer.from(fileDataB64, "base64"));
        filePath = targetPath;
      } catch (restoreErr) {
        console.error("Failed to restore submission file from DB:", restoreErr);
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      const contentText = submission.extractedText || submission.comment || "Submission record registered in database.";
      const fallbackHtml = `
        <div style="font-family: Arial, sans-serif; padding: 30px; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 8px;">
          <h2 style="color: #0369a1; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">Submission File: ${originalName || "Assignment Document"}</h2>
          <p style="margin: 6px 0; color: #475569;"><strong>Submitted Date:</strong> ${submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "N/A"}</p>
          <div style="margin-top: 24px; padding: 20px; background: #f8fafc; border-left: 4px solid #10b981; border-radius: 6px;">
            <h4 style="margin-top: 0; color: #334155; margin-bottom: 8px;">Document Extracted Content & Notes</h4>
            <div style="white-space: pre-wrap; font-family: monospace; font-size: 13px; color: #334155; background: #ffffff; padding: 14px; border: 1px solid #e2e8f0; border-radius: 4px;">${contentText}</div>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #64748b; font-style: italic; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
            📄 Note: File binary (${originalName || "file"}) was uploaded from another machine. Text content restored from database records.
          </p>
        </div>
      `;
      return res.json({
        success: true,
        title: originalName || "Submission File",
        fileType: "text/html",
        base64: Buffer.from(fallbackHtml).toString("base64"),
        previewType: "html",
        previewHtml: fallbackHtml,
        previewText: contentText,
        mimeType: "text/html"
      });
    }

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
