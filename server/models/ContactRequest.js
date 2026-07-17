const mongoose = require("mongoose");

const contactRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  },
  scheduleStart: {
    type: Date
  },
  scheduleEnd: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast query access
contactRequestSchema.index({ student: 1, teacher: 1, status: 1 });
contactRequestSchema.index({ teacher: 1, status: 1 });

module.exports = mongoose.model("ContactRequest", contactRequestSchema);
