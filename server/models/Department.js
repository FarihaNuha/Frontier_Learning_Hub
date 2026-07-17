const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Department name is required"],
    unique: true,
  },
  code: {
    type: String,
    required: [true, "Department code is required"],
    unique: true,
    uppercase: true,
  },
  description: {
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Department", departmentSchema);
