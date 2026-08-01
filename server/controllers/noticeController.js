const Notice = require("../models/Notice");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { queueEmail, emailTemplates } = require("../services/emailService");
const { getIO } = require("../socket");
const { createAuditLog } = require("./academicController");

// Helper to notify targeted users when global notice is published
const notifyUsersOfNotice = async (notice) => {
  try {
    let roleFilter = { $in: ["student", "teacher"] };
    if (notice.targetAudience === "Teachers") {
      roleFilter = "teacher";
    } else if (notice.targetAudience === "Students") {
      roleFilter = "student";
    }

    const recipients = await User.find({ role: roleFilter }).lean();
    const io = getIO();

    for (const u of recipients) {
      const notif = await Notification.create({
        userId: u._id,
        title: `📢 Notice: ${notice.title}`,
        message: notice.content.length > 120 ? `${notice.content.slice(0, 120)}...` : notice.content,
        type: "general",
      });

      if (io) {
        io.emit("new_notification", { userId: u._id.toString(), notif });
      }

      if (u.email && u.emailNotifications !== false) {
        const tpl = emailTemplates.newNotice(
          u.name || "User",
          notice.title,
          notice.category,
          notice.authorName || "Registrar",
          notice.content.slice(0, 200)
        );
        queueEmail(u.email, tpl.subject, tpl.html);
      }
    }
  } catch (err) {
    console.error("Error notifying users of notice:", err);
  }
};

// Helper to notify students enrolled in a course when teacher posts a course notice
const notifyCourseStudentsOfNotice = async (courseDoc, notice) => {
  try {
    const StudentRegistration = require("../models/StudentRegistration");
    const Course = require("../models/Course");
    const activeCourse = await Course.findById(courseDoc._id || courseDoc);
    const courseCodeStr = activeCourse ? activeCourse.displayCode || activeCourse.courseCode : "";

    const regs = await StudentRegistration.find({
      status: "Approved",
      "courses.courseCode": courseCodeStr
    }).lean();

    const studentIds = Array.from(new Set(regs.map((r) => r.studentId).filter(Boolean)));
    const studentUsers = await User.find({ studentId: { $in: studentIds } }).lean();
    const io = getIO();

    for (const u of studentUsers) {
      const notif = await Notification.create({
        userId: u._id,
        title: `📌 Course Notice [${courseCodeStr}]: ${notice.title}`,
        message: notice.content.length > 120 ? `${notice.content.slice(0, 120)}...` : notice.content,
        type: "general",
      });

      if (io) {
        io.emit("new_notification", { userId: u._id.toString(), notif });
      }
    }
  } catch (err) {
    console.error("Error notifying course students:", err);
  }
};

// 1. Get Global Notices (Filtered by role and targetAudience)
exports.getNotices = async (req, res) => {
  try {
    const role = req.user ? req.user.role : "student";
    const query = { scope: { $ne: "Course" } };

    if (role === "admin") {
      // Admin sees all global notices
    } else if (role === "teacher") {
      query.status = "Published";
      query.targetAudience = { $in: ["All", "Teachers"] };
    } else {
      // student
      query.status = "Published";
      query.targetAudience = { $in: ["All", "Students"] };
    }

    const notices = await Notice.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    res.json({ notices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Create Global Notice (Admin only)
exports.createNotice = async (req, res) => {
  try {
    const { title, content, category, targetAudience, isPinned, isScheduled, scheduledAt, attachments, pdfUrl, imageUrls } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Notice title and content are required." });
    }

    const isSched = Boolean(isScheduled && scheduledAt);
    const status = isSched ? "Scheduled" : "Published";

    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      category: category || "General",
      targetAudience: targetAudience || "All",
      scope: "Global",
      isPinned: Boolean(isPinned),
      isScheduled: isSched,
      scheduledAt: isSched ? new Date(scheduledAt) : null,
      status,
      attachments: attachments || [],
      pdfUrl: pdfUrl || "",
      imageUrls: imageUrls || [],
      author: req.user._id || req.user.id,
      authorName: req.user.name || "Admin Registrar",
    });

    await createAuditLog(req, req.user, "Notice Creation", `Created global notice '${notice.title}' for ${notice.targetAudience} (${status})`);

    if (status === "Published") {
      notifyUsersOfNotice(notice).catch(() => {});
    }

    res.status(201).json({ message: "Notice created successfully.", notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2b. Create Course-Specific Notice (Teacher or Course Admin)
exports.createCourseNotice = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, content, attachments, pdfUrl, imageUrls } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Notice title and content are required." });
    }

    const Course = require("../models/Course");
    const courseDoc = await Course.findById(courseId);
    if (!courseDoc) {
      return res.status(404).json({ error: "Course not found." });
    }

    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      category: "Academic",
      targetAudience: "Students",
      scope: "Course",
      course: courseDoc._id,
      courseCode: courseDoc.displayCode || courseDoc.courseCode,
      status: "Published",
      attachments: attachments || [],
      pdfUrl: pdfUrl || "",
      imageUrls: imageUrls || [],
      author: req.user._id || req.user.id,
      authorName: req.user.name || "Course Teacher",
    });

    notifyCourseStudentsOfNotice(courseDoc, notice).catch(() => {});

    res.status(201).json({ message: "Course notice published successfully.", notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2c. Get Course-Specific Notices
exports.getCourseNotices = async (req, res) => {
  try {
    const { courseId } = req.params;
    const notices = await Notice.find({
      scope: "Course",
      course: courseId,
      status: "Published",
    }).sort({ isPinned: -1, createdAt: -1 }).lean();

    res.json({ notices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Update Notice
exports.updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ error: "Notice not found." });
    }

    Object.assign(notice, req.body);
    notice.updatedAt = new Date();
    await notice.save();

    await createAuditLog(req, req.user, "Notice Update", `Updated notice '${notice.title}'`);

    res.json({ message: "Notice updated successfully.", notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Delete Notice
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const notice = await Notice.findByIdAndDelete(id);
    if (!notice) {
      return res.status(404).json({ error: "Notice not found." });
    }

    await createAuditLog(req, req.user, "Notice Deletion", `Deleted notice '${notice.title}'`);

    res.json({ message: "Notice deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Toggle Pin Notice
exports.togglePinNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ error: "Notice not found." });
    }

    notice.isPinned = !notice.isPinned;
    notice.updatedAt = new Date();
    await notice.save();

    res.json({ message: `Notice ${notice.isPinned ? "pinned" : "unpinned"} successfully.`, notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
