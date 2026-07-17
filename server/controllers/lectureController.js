const Lecture = require("../models/Lecture");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Course = require("../models/Course");
const { getIO } = require("../socket");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { sendEmail, emailTemplates, queueEmail } = require("../services/emailService");
const previewService = require("../services/previewService");

// Upload lecture
exports.uploadLecture = async (req, res) => {
  try {
    const { title, course, courseId, topic, week, department } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Please upload a file" });
    }

    const lecture = await Lecture.create({
      title,
      course: course || "",
      courseId: courseId || null,
      topic: topic || "",
      week: week || null,
      department,
      fileURL: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      uploadedBy: req.user.uid,
    });

    // Get enrolled students only (not all department students)
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
      const notifLink = courseId ? `/course/${courseId}` : null;
      await Notification.create({
        userId: student._id,
        title: "New Lecture Uploaded",
        message: `"${title}" has been uploaded for ${course}`,
        type: "lecture_upload",
        link: notifLink,
      });

      const io = getIO();
      if (io) {
        io.to(`user_${student._id}`).emit("newNotification", {
          title: "New Lecture Uploaded",
          message: `"${title}" has been uploaded for ${course}`,
          type: "lecture_upload",
          link: notifLink,
        });
      }
    }

    // Send emails in the background (non-blocking)
    if (students.length > 0) {
      for (const student of students) {
        if (student.email) {
          const { subject, html } = emailTemplates.newLecture(
            student.name || "Student",
            title,
            course,
          );
          queueEmail(student.email, subject, html);
        }
      }
    }

    res.status(201).json({ message: "Lecture uploaded successfully", lecture });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all lectures
exports.getLectures = async (req, res) => {
  try {
    const filter = {};

    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    if (req.user.role === "student" && !req.query.courseId) {
      const student = await User.findById(req.user.uid);
      if (student) filter.department = student.department;
    }

    const lectures = await Lecture.find(filter)
      .populate("uploadedBy", "name email profilePicture department")
      .sort({ createdAt: -1 });

    res.json({ lectures });
  } catch (error) {
    console.error("Get lectures error:", error);
    res.status(500).json({ error: error.message });
  }
};

// View lecture file in browser
exports.viewLecture = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ error: "Authentication token is required" });
    }
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_super_secret_key_change_this",
      );
      req.user = decoded;
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ error: "Lecture not found" });

    const filePath = path.join(
      __dirname,
      "../../uploads",
      lecture.fileURL.replace("/uploads/", ""),
    );
    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: "File not found on server" });

    const mimeTypes = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".jpg": "image/jpeg",
      ".png": "image/png",
    };

    const ext = path.extname(lecture.fileURL).toLowerCase();
    let contentType = mimeTypes[ext] || "application/octet-stream";

    // Prevent IDM/download managers from intercepting PDF fetches during in-app previews
    if (ext === ".pdf" && req.query.raw !== "true") {
      contentType = "application/octet-stream";
    }

    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(filePath);
  } catch (error) {
    console.error("View error:", error);
    res.status(500).json({ error: error.message });
  }
};

// View lecture file as Base64 JSON
exports.viewLectureBase64 = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ error: "Lecture not found" });

    const filePath = path.join(
      __dirname,
      "../../uploads",
      lecture.fileURL.replace("/uploads/", ""),
    );
    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: "File not found on server" });

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");

    const previewData = await previewService.generatePreviewData(filePath, lecture.originalName || lecture.fileURL);

    const fileType = (lecture.originalName || lecture.fileURL).toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : lecture.fileType || "application/octet-stream";

    res.json({
      success: true,
      title: lecture.title,
      fileType: fileType,
      base64: base64Data,
      previewType: previewData.previewType,
      previewHtml: previewData.html || null,
      previewSlides: previewData.slides || null,
      previewText: previewData.text || null,
      mimeType: previewData.mimeType || null
    });
  } catch (error) {
    console.error("Base64 view error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Download lecture file
exports.downloadLecture = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ error: "Authentication token is required" });
    }
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_super_secret_key_change_this",
      );
      req.user = decoded;
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ error: "Lecture not found" });

    const filePath = path.join(
      __dirname,
      "../../uploads",
      lecture.fileURL.replace("/uploads/", ""),
    );
    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: "File not found on server" });

    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.download(filePath, lecture.originalName);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete lecture
exports.deleteLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ error: "Lecture not found" });
    // Load course to check if req.user is the teacher of the course
    let isTeacher = false;
    if (lecture.courseId) {
      const course = await Course.findById(lecture.courseId);
      if (course && course.teacher && course.teacher.toString() === req.user.uid) {
        isTeacher = true;
      }
    }

    if (
      lecture.uploadedBy.toString() !== req.user.uid &&
      !isTeacher &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this lecture" });
    }

    const filePath = path.join(
      __dirname,
      "../../uploads",
      lecture.fileURL.replace("/uploads/", ""),
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Delete associated notifications
    await Notification.deleteMany({
      type: "lecture_upload",
      message: { $regex: lecture.title, $options: "i" }
    });

    await lecture.deleteOne();
    res.json({ message: "Lecture deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Share lecture to community feed
exports.shareLecture = async (req, res) => {
  try {
    const { caption, targetCourseId } = req.body;
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ error: "Lecture not found" });

    const CommunityPost = require("../models/CommunityPost");

    const newPost = await CommunityPost.create({
      title: `📚 Lecture: ${lecture.title}`,
      content: caption || `Shared lecture: ${lecture.title}`,
      category: "resource",
      author: req.user.uid,
      courseId: targetCourseId || lecture.courseId || null,
      lecture: lecture._id,
    });

    await newPost.populate("author", "name email role profilePicture");
    await newPost.populate("lecture");

    res.status(201).json({ post: newPost });
  } catch (error) {
    console.error("Share lecture error:", error);
    res.status(500).json({ error: error.message });
  }
};
