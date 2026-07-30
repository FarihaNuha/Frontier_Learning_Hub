const Announcement = require("../models/Announcement");
const Course = require("../models/Course");
const User = require("../models/User");
const { sendEmail } = require("../services/emailService");
const { getIO } = require("../socket");

// Create Announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const { courseId, title, content, attachments, isPinned, scheduledAt } = req.body;

    if (!courseId || !title || !content) {
      return res.status(400).json({ error: "Course ID, title, and content are required." });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    const announcement = await Announcement.create({
      course: course._id,
      courseCode: course.displayCode,
      title,
      content,
      attachments: attachments || [],
      isPinned: !!isPinned,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      author: req.user.id,
    });

    // Notify enrolled students
    const Notification = require("../models/Notification");
    const studentUserIds = course.students || [];

    for (const studentId of studentUserIds) {
      try {
        const notif = await Notification.create({
          userId: studentId,
          title: `Announcement: ${title}`,
          message: `New announcement posted in ${course.displayCode}: "${title}"`,
          type: "general",
        });

        // Socket notify
        try {
          const io = getIO();
          if (io) io.emit("new_notification", { userId: studentId.toString(), notif });
        } catch (sErr) {}

        // Email notify
        const recipient = await User.findById(studentId);
        if (recipient && recipient.email) {
          sendEmail(
            recipient.email,
            `Announcement: ${title} (${course.displayCode})`,
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #3B8DB3, #2C4B66); padding: 16px 20px; border-radius: 8px 8px 0 0; color: #ffffff;">
                <h3 style="margin: 0;">${course.displayCode}: ${title}</h3>
              </div>
              <div style="padding: 20px; color: #2C4B66;">
                <p style="font-size: 15px; margin-top: 0;">Hello <strong>${recipient.name || "Student"}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #4A5568;">${content}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
                <p style="font-size: 12px; color: #718096; margin: 0; text-align: center;">UFTB Moodle Course Announcement</p>
              </div>
            </div>
            `
          ).catch(() => {});
        }
      } catch (err) {}
    }

    res.status(201).json({ message: "Announcement created successfully.", announcement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Course Announcements
exports.getCourseAnnouncements = async (req, res) => {
  try {
    const { courseId } = req.params;
    const announcements = await Announcement.find({ course: courseId })
      .populate("author", "name email profilePicture")
      .sort({ isPinned: -1, createdAt: -1 });

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Announcement.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ error: "Announcement not found." });
    }
    res.json({ message: "Announcement updated.", announcement: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.json({ message: "Announcement deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
