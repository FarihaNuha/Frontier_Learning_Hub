const Notice = require("../models/Notice");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { queueEmail, emailTemplates } = require("../services/emailService");
const { getIO } = require("../socket");
const { createAuditLog } = require("./academicController");

// Helper to notify all users when notice is published
const notifyUsersOfNotice = async (notice) => {
  try {
    const recipients = await User.find({ role: { $in: ["student", "teacher"] } }).lean();
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

// 1. Get Notices
exports.getNotices = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === "admin";
    const query = isAdmin ? {} : { status: "Published" };

    const notices = await Notice.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    res.json({ notices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Create Notice
exports.createNotice = async (req, res) => {
  try {
    const { title, content, category, isPinned, isScheduled, scheduledAt, attachments, pdfUrl, imageUrls } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Notice title and content are required." });
    }

    const isSched = Boolean(isScheduled && scheduledAt);
    const status = isSched ? "Scheduled" : "Published";

    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      category: category || "General",
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

    await createAuditLog(req, req.user, "Notice Creation", `Created notice '${notice.title}' (${status})`);

    if (status === "Published") {
      notifyUsersOfNotice(notice).catch(() => {});
    }

    res.status(201).json({ message: "Notice created successfully.", notice });
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
