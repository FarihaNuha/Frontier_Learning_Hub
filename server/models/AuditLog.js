const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  userName: {
    type: String,
    default: "System",
  },
  userEmail: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    default: "system",
  },
  action: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    default: "",
  },
  ipAddress: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
