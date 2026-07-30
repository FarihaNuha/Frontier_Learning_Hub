const mongoose = require("mongoose");

const registrationPaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  studentId: {
    type: String,
    required: true,
    uppercase: true,
  },
  studentName: {
    type: String,
    default: "",
  },
  registration: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Registration",
    default: null,
  },
  department: {
    type: String,
    default: "",
  },
  session: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    required: true,
  },
  term: {
    type: String,
    required: true,
  },
  selectedCourses: [
    {
      courseCode: { type: String, required: true },
      courseTitle: { type: String, required: true },
      creditHours: { type: Number, required: true },
      courseType: { type: String, default: "Theory" },
      fee: { type: Number, default: 300 },
    },
  ],
  theoryCount: {
    type: Number,
    default: 0,
  },
  labCount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  transactionId: {
    type: String,
    default: "",
  },
  gatewayName: {
    type: String,
    default: "SSLCommerz / bKash Online Gateway",
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed", "Cancelled"],
    default: "Pending",
  },
  paymentDate: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

registrationPaymentSchema.index({ studentId: 1, session: 1, level: 1, term: 1 });

module.exports = mongoose.model("RegistrationPayment", registrationPaymentSchema);
