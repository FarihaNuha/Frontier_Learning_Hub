const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  studentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  profilePicture: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
    maxlength: 100, // Safe buffer for the hashed 60-character bcrypt output
  },
  role: {
    type: String,
    enum: ["student", "teacher", "admin"],
    default: "student",
  },
  department: {
    type: String,
    default: "EDTE",
    set: function (val) {
      if (!val) return "EDTE";
      const s = String(val).trim();
      const lower = s.toLowerCase();
      if (lower.includes("gen")) return "General";
      if (lower.includes("edte")) return "EDTE";
      if (lower.includes("ire")) return "IRE";
      if (lower.includes("cyse") || lower.includes("cyber")) return "CySE";
      if (lower.includes("dse") || lower.includes("data")) return "DSE";
      if (lower.includes("swe") || lower.includes("soft")) return "SWE";
      return s.toUpperCase();
    },
  },
  fcmToken: String,
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isRegistered: {
    type: Boolean,
    default: false,
  },
  emailNotifications: {
    type: Boolean,
    default: true,
  },
  contactRequestEmailNotifications: {
    type: Boolean,
    default: true,
  },
  resetOtp: String,
  resetOtpExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
