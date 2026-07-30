const mongoose = require("mongoose");

const resultLogSchema = new mongoose.Schema({
  uploadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ResultUpload",
    required: true,
  },
  action: {
    type: String,
    enum: ["Uploaded", "Draft Saved", "Submitted", "Verified", "Correction Requested", "Published", "Deleted"],
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  comment: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ResultLog", resultLogSchema);
