import React, { useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiCreditCard,
  FiSmartphone,
  FiLock,
  FiCheckCircle,
  FiX,
  FiArrowRight,
  FiShield,
  FiCheck,
} from "react-icons/fi";

export default function PaymentCheckoutModal({
  isOpen,
  onClose,
  paymentRecord,
  selectedCourses = [],
  totalAmount = 0,
  onPaymentSuccess,
}) {
  const [method, setMethod] = useState("bkash"); // bkash, nagad, card, rocket
  const [step, setStep] = useState(1); // 1 = details, 2 = otp/confirm, 3 = success

  // Form fields
  const [accountNumber, setAccountNumber] = useState("");
  const [pin, setPin] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [otp, setOtp] = useState("");
  const [processing, setProcessing] = useState(false);
  const [txnResult, setTxnResult] = useState(null);

  if (!isOpen) return null;

  const handleInitiateProceed = (e) => {
    e.preventDefault();
    if (method === "bkash" || method === "nagad" || method === "rocket") {
      if (!accountNumber.trim() || accountNumber.length < 11) {
        toast.error(`Please enter a valid 11-digit ${method.toUpperCase()} account number.`);
        return;
      }
      if (!pin.trim()) {
        toast.error(`Please enter your 4 or 5 digit ${method.toUpperCase()} PIN.`);
        return;
      }
    } else if (method === "card") {
      if (!cardNumber.trim() || cardNumber.length < 16) {
        toast.error("Please enter a valid 16-digit Card Number.");
        return;
      }
      if (!cvv.trim() || cvv.length < 3) {
        toast.error("Please enter a valid 3-digit CVV.");
        return;
      }
    }
    setStep(2);
  };

  const handleConfirmPayment = async () => {
    if (!otp.trim()) {
      toast.error("Please enter the 6-digit OTP code (e.g. 123456).");
      return;
    }

    setProcessing(true);
    try {
      // 1. Always initiate/get payment record with full context
      const initRes = await api.post("/registration-payments/initiate", {
        registrationId: paymentRecord?.registration || paymentRecord?.registrationId || paymentRecord?._id,
        session: paymentRecord?.session,
        level: paymentRecord?.level,
        term: paymentRecord?.term,
        selectedCourses: selectedCourses.length > 0 ? selectedCourses : paymentRecord?.selectedCourses || [],
      });

      const targetPaymentId = initRes.data?.payment?.paymentId || initRes.data?.payment?._id || paymentRecord?.paymentId || paymentRecord?._id;

      // 2. Process payment transaction online
      const res = await api.post("/registration-payments/process", {
        paymentId: targetPaymentId,
        registrationId: paymentRecord?.registration || paymentRecord?.registrationId || paymentRecord?._id,
        session: paymentRecord?.session,
        level: paymentRecord?.level,
        term: paymentRecord?.term,
        status: "SUCCESS",
      });

      setTxnResult(res.data.payment);
      setStep(3);
      toast.success("Payment completed successfully!");
      if (onPaymentSuccess) onPaymentSuccess(res.data.payment);
    } catch (err) {
      console.error("Payment transaction error:", err);
      toast.error(err.response?.data?.error || "Online payment transaction failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15,23,42,0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          maxWidth: "520px",
          width: "100%",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #2C4B66, #3B8DB3)",
            padding: "20px 24px",
            color: "#ffffff",
            display: "flex",
            justify: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FiShield size={22} color="#7EC8E3" />
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>Secure Online Payment Gateway</h3>
              <div style={{ fontSize: "12px", color: "#e2e8f0" }}>University of Frontier Technology, Bangladesh</div>
            </div>
          </div>
          <FiX size={20} cursor="pointer" onClick={onClose} style={{ opacity: 0.8 }} />
        </div>

        {/* Step 1: Select Method & Enter Credentials */}
        {step === 1 && (
          <div style={{ padding: "24px" }}>
            {/* Amount Banner */}
            <div
              style={{
                background: "#f0f9ff",
                padding: "14px 18px",
                borderRadius: "12px",
                border: "1px solid #bae6fd",
                display: "flex",
                justify: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontSize: "14px", color: "#0369a1", fontWeight: 600 }}>Total Registration Fee (Inc. Fixed Fees):</span>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#0369a1" }}>৳{(totalAmount || paymentRecord?.totalAmount || 0).toLocaleString()} BDT</span>
            </div>

            {/* Payment Method Selector */}
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
              Select Payment Method
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {/* bKash */}
              <div
                onClick={() => setMethod("bkash")}
                style={{
                  border: method === "bkash" ? "2px solid #e2136e" : "1.5px solid #e2e8f0",
                  background: method === "bkash" ? "#fff0f6" : "#ffffff",
                  borderRadius: "10px",
                  padding: "12px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontWeight: 800, color: "#e2136e", fontSize: "14px" }}>bKash</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Mobile Wallet</div>
              </div>

              {/* Nagad */}
              <div
                onClick={() => setMethod("nagad")}
                style={{
                  border: method === "nagad" ? "2px solid #f7941d" : "1.5px solid #e2e8f0",
                  background: method === "nagad" ? "#fff7ed" : "#ffffff",
                  borderRadius: "10px",
                  padding: "12px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 800, color: "#f7941d", fontSize: "14px" }}>Nagad</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Mobile Wallet</div>
              </div>

              {/* Card */}
              <div
                onClick={() => setMethod("card")}
                style={{
                  border: method === "card" ? "2px solid #3b8db3" : "1.5px solid #e2e8f0",
                  background: method === "card" ? "#f0f9ff" : "#ffffff",
                  borderRadius: "10px",
                  padding: "12px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 800, color: "#3b8db3", fontSize: "14px" }}>Card</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Visa / Master</div>
              </div>

              {/* Rocket */}
              <div
                onClick={() => setMethod("rocket")}
                style={{
                  border: method === "rocket" ? "2px solid #8b5cf6" : "1.5px solid #e2e8f0",
                  background: method === "rocket" ? "#f5f3ff" : "#ffffff",
                  borderRadius: "10px",
                  padding: "12px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 800, color: "#8b5cf6", fontSize: "14px" }}>Rocket</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>DBBL Wallet</div>
              </div>
            </div>

            {/* Dynamic Form based on Method */}
            <form onSubmit={handleInitiateProceed} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {method !== "card" ? (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      {method.toUpperCase()} Account Number *
                    </label>
                    <input
                      type="text"
                      placeholder="017XXXXXXXX"
                      maxLength={11}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      {method.toUpperCase()} PIN *
                    </label>
                    <input
                      type="password"
                      placeholder="•••••"
                      maxLength={5}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "14px" }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Card Number *</label>
                    <input
                      type="text"
                      placeholder="4111 2222 3333 4444"
                      maxLength={16}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "14px" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Expiry (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="12/28"
                        maxLength={5}
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        required
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "14px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>CVV</label>
                      <input
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        required
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "14px" }}
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                style={{
                  marginTop: "8px",
                  padding: "12px",
                  background: "linear-gradient(135deg, #16a34a, #15803d)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                Proceed to Verification OTP <FiArrowRight size={16} />
              </button>
            </form>
          </div>
        )}

        {/* Step 2: OTP Verification & Final Confirmation */}
        {step === 2 && (
          <div style={{ padding: "28px", textAlign: "center" }}>
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px auto" }}>
              <FiLock size={24} />
            </div>

            <h3 style={{ margin: "0 0 6px 0", color: "#0f172a" }}>Enter 6-Digit OTP Verification</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>
              A security OTP has been sent to your registered mobile number for <strong>{method.toUpperCase()}</strong> payment of <strong>৳{totalAmount || paymentRecord?.totalAmount || 0} BDT</strong>.
            </p>

            <div style={{ maxWidth: "260px", margin: "0 auto 20px auto" }}>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "22px",
                  letterSpacing: "8px",
                  textAlign: "center",
                  fontWeight: 800,
                  borderRadius: "10px",
                  border: "2px solid #3b8db3",
                  outline: "none",
                }}
              />
              <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "6px" }}>Demo OTP: Enter any 6 digits (e.g. 123456)</div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ flex: 1, padding: "12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "10px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={processing}
                style={{
                  flex: 2,
                  padding: "12px",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  cursor: processing ? "not-allowed" : "pointer",
                }}
              >
                {processing ? "Processing Transaction..." : "Confirm & Complete Payment"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {step === 3 && txnResult && (
          <div style={{ padding: "32px", textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
              <FiCheckCircle size={36} />
            </div>

            <h2 style={{ margin: "0 0 6px 0", color: "#0f172a", fontSize: "22px" }}>Payment Successful!</h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "13.5px", color: "#64748b" }}>
              Your course registration fee has been received and verified online.
            </p>

            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "left", fontSize: "13px", marginBottom: "24px" }}>
              <div style={{ marginBottom: "6px" }}>Transaction ID: <strong style={{ fontFamily: "monospace", color: "#3b8db3" }}>{txnResult.transactionId}</strong></div>
              <div style={{ marginBottom: "6px" }}>Amount Paid: <strong>৳{txnResult.totalAmount} BDT</strong></div>
              <div style={{ marginBottom: "6px" }}>Payment Gateway: <strong>{txnResult.gatewayName}</strong></div>
              <div>Status: <strong style={{ color: "#16a34a" }}>Paid</strong></div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: "12px",
                background: "#3b8db3",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "14.5px",
                cursor: "pointer",
              }}
            >
              Done & Return to Registration
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
