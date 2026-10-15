const { verifyActionToken } = require("../services/chatNotificationActions");
const Message = require("../models/PrivateMessage");
const User = require("../models/User");
const { getIO } = require("../socket");

exports.performAction = async (req, res) => {
  let action;
  try { action = verifyActionToken(req.body.actionToken); }
  catch { return res.status(401).json({ error: "Notification expired. Open the chat to continue." }); }
  if (action.purpose !== "notification-chat-action" || !action.recipientId || !action.peerId ||
      action.messageId !== req.params.messageId || !["reply", "like"].includes(req.body.action)) {
    return res.status(403).json({ error: "Invalid notification action" });
  }
  try {
    const [user, message] = await Promise.all([
      User.findById(action.recipientId), Message.findById(action.messageId),
    ]);
    if (!user || user.isBlocked) return res.status(401).json({ error: "Please sign in again" });
    if (!message || message.deletedAt || String(message.receiver) !== action.recipientId ||
        String(message.sender) !== action.peerId || message.deletedFor?.some(id => String(id) === action.recipientId)) {
      return res.status(404).json({ error: "Message is no longer available" });
    }
    if (req.body.action === "like") {
      // Repeated deliveries/retries keep one Like instead of toggling it off.
      const reactions = message.reactions.filter(r => String(r.user) !== action.recipientId);
      reactions.push({ user: user._id, emoji: "👍" });
      message.reactions = reactions;
      await message.save();
      const io = getIO();
      for (const uid of [message.sender, message.receiver]) io?.to(`user_${uid}`).emit("messageReaction", {
        messageId: String(message._id), reactions: message.reactions,
      });
      return res.json({ success: true });
    }
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    const requestId = req.body.requestId;
    if (!content || content.length > 1000 || typeof requestId !== "string" || !/^[a-zA-Z0-9-]{16,64}$/.test(requestId)) {
      return res.status(400).json({ error: "Enter a reply up to 1000 characters" });
    }
    // Reuse contact-hour, receiver, quote and duplicate-message validation.
    req.user = { uid: String(user._id), role: user.role };
    req.body = { receiverId: action.peerId, content, replyTo: action.messageId,
      clientMessageId: `notification:${requestId}` };
    req.files = [];
    return require("./communityController").sendMessage(req, res);
  } catch { return res.status(500).json({ error: "Could not complete notification action" }); }
};
