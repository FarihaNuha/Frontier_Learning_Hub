const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const generateToken = (user) => {
  return jwt.sign(
    { uid: user._id, role: user.role, department: user.department, name: user.name },
    process.env.JWT_SECRET || "your_super_secret_key_change_this",
    { expiresIn: "365d" },
  );
};

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide all required fields" });
    }
    if (password.length > 20) {
      return res.status(400).json({ error: "Password cannot be longer than 20 characters." });
    }

    const emailLower = email.toLowerCase().trim();

    // Lookup email in Student and Teacher imported collections
    const Student = require("../models/Student");
    const Teacher = require("../models/Teacher");

    let matchedRecord = null;
    let assignedRole = "";
    let assignedDept = "";
    let assignedName = "";
    let studentId = "";

    const studentRecord = await Student.findOne({ universityEmail: emailLower });
    if (studentRecord) {
      matchedRecord = studentRecord;
      assignedRole = "student";
      assignedDept = studentRecord.department || "EDTE";
      assignedName = studentRecord.name;
      studentId = studentRecord.studentId;
    } else {
      const teacherRecord = await Teacher.findOne({ email: emailLower });
      if (teacherRecord) {
        matchedRecord = teacherRecord;
        assignedRole = "teacher";
        assignedDept = teacherRecord.department || "EDTE";
        assignedName = teacherRecord.name;
      }
    }

    // Check if an existing User document exists for this email
    let existingUser = await User.findOne({ email: emailLower });

    if (!matchedRecord && !existingUser) {
      return res.status(400).json({
        error: "You are not authorized to sign up. Please contact the administrator to add your record.",
      });
    }

    // If existingUser exists and user has ALREADY completed custom registration before:
    if (existingUser && existingUser.isRegistered === true) {
      return res.status(400).json({
        error: "A user with this email has already registered. Please login with your password or use forgot password.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (existingUser) {
      // User was pre-seeded/imported, update password and mark as registered
      existingUser.password = hashedPassword;
      existingUser.isRegistered = true;
      if (assignedName) existingUser.name = assignedName;
      if (assignedRole) existingUser.role = assignedRole;
      if (assignedDept) existingUser.department = assignedDept;
      if (studentId) existingUser.studentId = studentId;

      await existingUser.save();

      if (assignedRole === "student" || existingUser.role === "student") {
        await Student.updateOne({ universityEmail: emailLower }, { accountStatus: "Active" });
      }

      const token = generateToken(existingUser);
      return res.status(200).json({
        token,
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          department: existingUser.department,
          studentId: existingUser.studentId,
          profilePicture: existingUser.profilePicture,
          emailNotifications: existingUser.emailNotifications,
        },
      });
    }

    // Create new User
    const user = await User.create({
      name: assignedName || req.body.name || "User",
      email: emailLower,
      password: hashedPassword,
      ...(assignedRole === "student" && studentId ? { studentId } : {}),
      role: assignedRole || "student",
      department: assignedDept || "EDTE",
      isRegistered: true,
    });

    // Mark accountStatus as active if student
    if (assignedRole === "student") {
      await Student.updateOne({ universityEmail: emailLower }, { accountStatus: "Active" });
    }

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: user.studentId,
        profilePicture: user.profilePicture,
        emailNotifications: user.emailNotifications,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide email and password" });
    }
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    if (user.isBlocked) {
      return res.status(403).json({ error: "Your account has been suspended." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: user.studentId,
        profilePicture: user.profilePicture,
        emailNotifications: user.emailNotifications,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    console.log("getMe called - User ID:", req.user?.uid);
    const user = await User.findById(req.user.uid).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.isBlocked) {
      return res.status(401).json({ error: "Your account has been suspended." });
    }
    res.json({ user });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, studentId, department, profilePicture, emailNotifications, contactRequestEmailNotifications } = req.body;
    const userId = req.user.uid;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name) user.name = name.trim();
    if (department !== undefined && department !== null) {
      user.department = String(department).trim();
    }
    if (user.role === "student" && studentId !== undefined) {
      user.studentId = String(studentId).trim();
    }
    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    }
    if (emailNotifications !== undefined) {
      user.emailNotifications = emailNotifications;
    }
    if (contactRequestEmailNotifications !== undefined) {
      user.contactRequestEmailNotifications = contactRequestEmailNotifications;
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: user.studentId,
        profilePicture: user.profilePicture,
        emailNotifications: user.emailNotifications,
        contactRequestEmailNotifications: user.contactRequestEmailNotifications
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Please provide email" });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email." });
    }
    if (user.isBlocked) {
      return res.status(403).json({ error: "Your account has been suspended." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    // Send OTP to email
    const { queueEmail } = require("../services/emailService");
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7EC8E3, #3B8DB3); padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">UFTB Moodle Password Recovery</h2>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h3 style="color: #2C4B66;">Hello ${user.name},</h3>
          <p>You requested to reset your password. Please use the following 6-digit verification code to complete the request:</p>
          <div style="background: #E8F4FD; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1e3a8a;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 13px;">This code is valid for 15 minutes. If you did not make this request, please ignore this email or contact support.</p>
        </div>
      </div>
    `;
    queueEmail(user.email, "Password Reset Verification Code", html);

    res.json({ message: "Verification code sent to your email." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Please provide email, code, and new password" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    if (newPassword.length > 20) {
      return res.status(400).json({ error: "Password cannot be longer than 20 characters." });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }

    // Hash and save password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully. You can now login with your new password." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Block User
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.role === "admin" || (targetUser.role === "teacher" && req.user.role === "teacher")) {
      return res.status(403).json({ error: "You are not authorized to block this user." });
    }

    targetUser.isBlocked = true;
    await targetUser.save();

    // Trigger force logout via Socket.IO
    const { getIO } = require("../socket");
    try {
      const io = getIO();
      if (io) {
        io.to(`user_${userId}`).emit("force_logout");
      }
    } catch (err) {
      console.error("Socket error on block:", err.message);
    }

    res.json({ message: `User ${targetUser.name} has been suspended successfully.` });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Unblock User
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    targetUser.isBlocked = false;
    await targetUser.save();

    res.json({ message: `User ${targetUser.name} has been unblocked successfully.` });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get Blocked Users (for Teachers/Admins)
exports.getBlockedUsers = async (req, res) => {
  try {
    const blockedUsers = await User.find({ isBlocked: true, role: "student" }).select("name email department studentId");
    res.json({ users: blockedUsers });
  } catch (error) {
    console.error("Get blocked users error:", error);
    res.status(500).json({ error: error.message });
  }
};
