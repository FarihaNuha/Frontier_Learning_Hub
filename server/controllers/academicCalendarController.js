const AcademicCalendarEvent = require("../models/AcademicCalendarEvent");
const { createAuditLog } = require("./academicController");

// 1. Get Calendar Events
exports.getCalendarEvents = async (req, res) => {
  try {
    const { session, eventType } = req.query;
    const query = {};
    if (session && session !== "all") query.session = session;
    if (eventType && eventType !== "all") query.eventType = eventType;

    const events = await AcademicCalendarEvent.find(query)
      .sort({ startDate: 1 })
      .lean();

    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Create Calendar Event (Admin)
exports.createCalendarEvent = async (req, res) => {
  try {
    const { title, eventType, startDate, endDate, description, session, levelTerm, isImportant } = req.body;
    if (!title || !eventType || !startDate || !endDate) {
      return res.status(400).json({ error: "Title, event type, start date, and end date are required." });
    }

    const eventDoc = await AcademicCalendarEvent.create({
      title: title.trim(),
      eventType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description || "",
      session: session || "2023-24",
      levelTerm: levelTerm || "All Level-Terms",
      isImportant: Boolean(isImportant),
    });

    await createAuditLog(req, req.user, "Calendar Event Created", `Added '${eventDoc.title}' (${eventType})`);

    res.status(201).json({ message: "Academic calendar event created.", event: eventDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Update Calendar Event (Admin)
exports.updateCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const eventDoc = await AcademicCalendarEvent.findById(id);
    if (!eventDoc) {
      return res.status(404).json({ error: "Calendar event not found." });
    }

    Object.assign(eventDoc, req.body);
    eventDoc.updatedAt = new Date();
    await eventDoc.save();

    await createAuditLog(req, req.user, "Calendar Event Updated", `Updated '${eventDoc.title}'`);

    res.json({ message: "Academic calendar event updated.", event: eventDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const PublishedCalendar = require("../models/PublishedCalendar");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO } = require("../socket");

// 4. Delete Calendar Event (Admin)
exports.deleteCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const eventDoc = await AcademicCalendarEvent.findByIdAndDelete(id);
    if (!eventDoc) {
      return res.status(404).json({ error: "Calendar event not found." });
    }

    await createAuditLog(req, req.user, "Calendar Event Deleted", `Deleted '${eventDoc.title}'`);

    res.json({ message: "Academic calendar event deleted." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Get Latest Published Official Academic Calendar
exports.getPublishedCalendar = async (req, res) => {
  try {
    const pub = await PublishedCalendar.findOne().sort({ publishedAt: -1 }).lean();
    res.json({ publishedCalendar: pub });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Publish / Upload Official Academic Calendar & Broadcast Notification
exports.publishCalendar = async (req, res) => {
  try {
    const { title, session, termHeader, fileUrl, fileType, events, importantDates, holidays } = req.body;

    const pub = await PublishedCalendar.create({
      title: title || "B.Sc. Academic Calendar for the Semester: January 2026 and July 2026",
      session: session || "Session: 2020-2021, 2021-2022, 2022-2023",
      termHeader: termHeader || "Term: January 2026",
      fileUrl: fileUrl || "",
      fileType: fileType || "image",
      events: events || [],
      importantDates: importantDates || [],
      holidays: holidays || [],
      publishedBy: req.user?._id || req.user?.id,
      publishedAt: new Date(),
    });

    await createAuditLog(req, req.user, "Academic Calendar Published", `Published official calendar: ${pub.title}`);

    // Broadcast Realtime Notification to All Teachers and Students
    try {
      const users = await User.find({ role: { $in: ["teacher", "student"] } }).select("_id").lean();
      const io = getIO();

      for (const u of users) {
        const notif = await Notification.create({
          userId: u._id,
          title: "📅 Official Academic Calendar Uploaded",
          message: `University Administration has published the official Academic Calendar for ${pub.termHeader || "the new semester"}.`,
          type: "general",
        });

        if (io) {
          io.emit("new_notification", { userId: u._id.toString(), notif });
        }
      }
    } catch (notifErr) {
      console.error("Failed sending calendar notifications:", notifErr);
    }

    res.status(201).json({ message: "Official Academic Calendar published & broadcasted successfully!", publishedCalendar: pub });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 7. Upload Calendar File (PDF, Image, Excel, Word)
exports.uploadCalendarFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.json({ message: "Calendar file uploaded successfully.", fileUrl, filename: req.file.originalname });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

