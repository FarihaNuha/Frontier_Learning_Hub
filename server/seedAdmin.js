const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const adminData = {
  name: "Super Admin",
  email: "admin@uftb.com",
  password: "admin123",
  role: "admin",
  department: "Software",
  isActive: true,
};

async function seedAdmin() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/uftb-moodle",
    );
    console.log("Connected to MongoDB");

    const User = require("./models/User");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log("Admin already exists:", existingAdmin.email);
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    // Create admin
    const admin = await User.create({
      ...adminData,
      password: hashedPassword,
    });

    console.log("Admin created successfully!");
    console.log("Email:", admin.email);
    console.log("Password:", adminData.password);
    console.log("Role:", admin.role);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

seedAdmin();
