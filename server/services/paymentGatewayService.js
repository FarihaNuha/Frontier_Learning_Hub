// Modular Payment Gateway Driver supporting bKash, Nagad, SSLCommerz, and Credit Card online transactions
const crypto = require("crypto");

class PaymentGatewayService {
  constructor() {
    this.activeGateway = process.env.PAYMENT_GATEWAY_NAME || "SSLCommerz / bKash Online Gateway";
  }

  // Generate unique transaction ID
  generateTransactionId() {
    const prefix = "TXN_REG";
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `${prefix}_${timestamp}_${randomHex}`;
  }

  // Initiate Online Payment Session
  async initiatePaymentSession({ paymentId, totalAmount, studentInfo, courses }) {
    console.log(`💳 Initiating Payment Gateway session for ${paymentId} | Amount: ${totalAmount} BDT`);

    const transactionId = this.generateTransactionId();
    const paymentUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/student/registration-payments?paymentId=${paymentId}&txn=${transactionId}`;

    return {
      success: true,
      transactionId,
      gatewayName: this.activeGateway,
      paymentUrl,
    };
  }

  // Verify and Process Payment Callback (Simulated Gateway Callback)
  async verifyPaymentCallback(transactionId, status = "SUCCESS") {
    if (status === "SUCCESS") {
      return {
        isSuccessful: true,
        transactionId,
        paymentDate: new Date(),
        gatewayResponseCode: "200_OK",
      };
    } else if (status === "CANCELLED") {
      return {
        isSuccessful: false,
        paymentStatus: "Cancelled",
        gatewayResponseCode: "CANCEL_USER",
      };
    } else {
      return {
        isSuccessful: false,
        paymentStatus: "Failed",
        gatewayResponseCode: "GATEWAY_ERROR",
      };
    }
  }
}

module.exports = new PaymentGatewayService();
