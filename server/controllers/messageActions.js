const Message = require("../models/PrivateMessage");
const { getIO } = require("../socket");
const participant = (message, uid) => [String(message.sender), String(message.receiver)].includes(String(uid));
const emitUpdate = (message, event = "messageUpdated", extra = {}) => {
  const io = getIO();
  for (const uid of [message.sender, message.receiver]) io.to(`user_${uid}`).emit(event, { message, messageId: String(message._id), ...extra });
};
exports.deleteMessage = async (req, res) => {
  try {
    const scope = req.query.scope || "everyone";
    if (!["me", "everyone"].includes(scope)) return res.status(400).json({ error: "Choose delete for me or everyone" });
    const message = await Message.findById(req.params.messageId);
    if (!message || !participant(message, req.user.uid)) return res.status(404).json({ error: "Message not found" });
    if (scope === "me") {
      await Message.updateOne({ _id: message._id }, { $addToSet: { deletedFor: req.user.uid } });
      getIO().to(`user_${req.user.uid}`).emit("messageHidden", { messageId: String(message._id) });
      return res.json({ messageId: message._id, scope: "me" });
    }
    if (String(message.sender) !== String(req.user.uid)) return res.status(403).json({ error: "Only the sender can delete for everyone" });
    message.content = ""; message.subject = "Message"; message.attachments = []; message.reactions = []; message.replyPreview = undefined;
    message.deletedAt = new Date();
    await message.save();
    await Message.updateMany({ replyTo: message._id }, { $set: { "replyPreview.content": "This message was deleted" } });
    emitUpdate(message);
    res.json({ message, messageId: message._id });
  } catch { res.status(500).json({ error: "Could not delete message" }); }
};
exports.editMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message || String(message.sender) !== String(req.user.uid)) return res.status(404).json({ error: "Message not found" });
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (message.deletedAt || !content || content.length > 10000) return res.status(400).json({ error: "Enter a message up to 10000 characters" });
    message.content = content; message.editedAt = new Date(); await message.save();
    emitUpdate(message);
    res.json({ message });
  } catch { res.status(500).json({ error: "Could not edit message" }); }
};
exports.toggleReaction = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message || !participant(message, req.user.uid)) return res.status(404).json({ error: "Message not found" });
    const emoji = req.body.emoji;
    if (message.deletedAt || !["❤️", "👍", "😂", "😮", "😢", "😡"].includes(emoji)) return res.status(400).json({ error: "Choose a supported reaction" });
    const existing = message.reactions.find(r => String(r.user) === String(req.user.uid));
    const remove = existing?.emoji === emoji;
    message.reactions = message.reactions.filter(r => String(r.user) !== String(req.user.uid));
    if (!remove) message.reactions.push({ user: req.user.uid, emoji });
    await message.save();
    emitUpdate(message, "messageReaction", { reactions: message.reactions });
    res.json({ reactions: message.reactions });
  } catch { res.status(500).json({ error: "Could not update reaction" }); }
};
exports.participant = participant;

// Read only the incoming IDs actually displayed by the client; do not reload the
// entire conversation for every socket message or mark a later unseen message read.
exports.readMessages = async (req, res) => {
  const ids = req.body.messageIds;
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id))) {
    return res.status(400).json({ error: "Provide up to 100 displayed message IDs" });
  }
  try {
    const incoming = await Message.find({ _id: { $in: ids }, sender: req.params.userId,
      receiver: req.user.uid, deletedFor: { $ne: req.user.uid } }).select("_id createdAt").lean();
    if (!incoming.length) return res.json({ readThrough: 0 });
    const readThrough = Math.max(...incoming.map(m => new Date(m.createdAt).getTime())), readAt = new Date();
    const result = await Message.updateMany({ _id: { $in: incoming.map(m => m._id) }, receiver: req.user.uid, isRead: false }, { isRead: true, readAt });
    if (result.modifiedCount) {
      await require("../models/Notification").updateMany({ userId: req.user.uid, type: "chat_message",
        link: `/community/messages/${req.params.userId}`, "pushData.messageId": { $in: incoming.map(m => String(m._id)) }, isRead: false }, { isRead: true });
      require("../services/fcmService").sendUserPushNotification(req.user.uid, {
        control: true, data: { type: "chat_read", threadId: req.params.userId, timestamp: String(readThrough) }, ttl: 60000,
      }).catch(() => {});
    }
    const io = getIO();
    io?.to(`user_${req.params.userId}`).emit("messagesRead", { readerId: req.user.uid, readAt, readThrough });
    io?.to(`user_${req.user.uid}`).emit("conversationRead", { threadId: req.params.userId, readThrough });
    return res.json({ readThrough });
  } catch { return res.status(500).json({ error: "Could not mark messages read" }); }
};
