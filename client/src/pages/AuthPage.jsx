import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "../styles/auth.css";

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState("student");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    studentId: "",
    department: "EDTE",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Forgot password flow states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login(formData.email.trim(), formData.password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await register({
        name: formData.name,
        email: formData.email.trim(),
        password: formData.password,
        studentId: formData.studentId,
        role: role,
        department: formData.department,
      });
      navigate("/courses");
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (isForgotPassword) {
    const handleRequestOtp = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      setForgotSuccess("");
      try {
        const res = await api.post("/auth/forgot-password", { email: forgotEmail });
        setForgotSuccess(res.data.message);
        setResetStep(2);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to send reset code. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const handleResetPassword = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      setForgotSuccess("");
      try {
        const res = await api.post("/auth/reset-password", {
          email: forgotEmail,
          otp: resetOtp,
          newPassword
        });
        toast.success(res.data.message);
        setIsForgotPassword(false);
        setResetStep(1);
        setFormData({ ...formData, email: forgotEmail, password: "" });
      } catch (err) {
        setError(err.response?.data?.error || "Failed to reset password.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="auth-container">
        <div className="auth-card forgot-password-card">
          <div className="auth-header">
            <h2>Reset Password</h2>
            <p>UFTB Moodle - Learning Management System</p>
          </div>

          {error && <div className="error-message">{error}</div>}
          {forgotSuccess && (
            <div style={{
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              color: "#10b981",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              marginBottom: "15px",
              textAlign: "center",
              border: "1px solid rgba(16, 185, 129, 0.2)"
            }}>
              {forgotSuccess}
            </div>
          )}

          {resetStep === 1 ? (
            <form onSubmit={handleRequestOtp}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={forgotEmail}
                  onChange={(e) => { setForgotEmail(e.target.value); setError(""); }}
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>Verification Code</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={resetOtp}
                  onChange={(e) => { setResetOtp(e.target.value); setError(""); }}
                  required
                  maxLength="6"
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    placeholder="Enter new password (6-20 chars)"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                    required
                    minLength="6"
                    maxLength="20"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                  >
                    {showResetPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          <div className="auth-toggle">
            <p>
              <span
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetStep(1);
                  setError("");
                  setForgotSuccess("");
                }}
              >
                Back to Login
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className={`auth-card ${!isLogin ? "right-panel-active" : ""}`}>
        
        {/* Sign Up Form Container */}
        <div className="form-container sign-up-container">
          <form onSubmit={handleRegisterSubmit}>
            <div className="auth-header">
              <h2>Create Account</h2>
              <p>UFTB Moodle - Learning Management System</p>
            </div>

            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn ${role === "student" ? "active" : ""}`}
                onClick={() => setRole("student")}
              >
                Student
              </button>
              <button
                type="button"
                className={`role-btn ${role === "teacher" ? "active" : ""}`}
                onClick={() => setRole("teacher")}
              >
                Teacher
              </button>
            </div>

            {error && !isLogin && <div className="error-message">{error}</div>}

            <div className="form-scrollable-area">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLogin}
                />
              </div>

              {role === "student" && (
                <div className="form-group">
                  <label>Student ID</label>
                  <input
                    type="text"
                    name="studentId"
                    placeholder="Enter your student ID (e.g., 2202001)"
                    value={formData.studentId}
                    onChange={handleChange}
                    required={!isLogin && role === "student"}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required={!isLogin}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password (6-20 chars)"
                    value={formData.password}
                    onChange={handleChange}
                    required={!isLogin}
                    minLength="6"
                    maxLength="20"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  >
                    {showRegisterPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required={!isLogin}
                >
                  <option value="EDTE">EDTE</option>
                  <option value="IRE">IRE</option>
                  <option value="CySE">CySE</option>
                  <option value="DSE">DSE</option>
                  <option value="SWE">SWE</option>
                </select>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Processing..." : "Create Account"}
            </button>

            <div className="auth-toggle">
              <p>
                Already have an account?{" "}
                <span onClick={() => { setIsLogin(true); setError(""); }}>Login</span>
              </p>
            </div>
          </form>
        </div>

        {/* Sign In Form Container */}
        <div className="form-container sign-in-container">
          <form onSubmit={handleLoginSubmit}>
            <div className="auth-header">
              <h2>Welcome Back!</h2>
              <p>UFTB Moodle - Learning Management System</p>
            </div>

            {error && isLogin && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required={isLogin}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required={isLogin}
                  maxLength="20"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                >
                  {showLoginPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right", marginTop: "-10px", marginBottom: "15px" }}>
              <span 
                style={{ fontSize: "13px", color: "var(--pastel-blue-deep)", cursor: "pointer", fontWeight: "600" }}
                onClick={() => {
                  setIsForgotPassword(true);
                  setResetStep(1);
                  setForgotEmail("");
                  setError("");
                }}
              >
                Forgot Password?
              </span>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Processing..." : "Login"}
            </button>

            <div className="auth-toggle">
              <p>
                Don't have an account?{" "}
                <span onClick={() => { setIsLogin(false); setError(""); }}>Sign Up</span>
              </p>
            </div>
          </form>
        </div>

        {/* Overlay Container */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h2>UFTB Moodle</h2>
              <ul className="overlay-features">
                <li>⚡ Live real-time updates & chat</li>
                <li>📚 Instant course material access</li>
                <li>💬 Community forum discussions</li>
                <li>📊 Grade & attendance tracking</li>
              </ul>
              <button type="button" className="ghost-btn" onClick={() => { setIsLogin(true); setError(""); }}>
                SIGN IN
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h2>Welcome Back!</h2>
              <ul className="overlay-features">
                <li>⚡ Live real-time updates & chat</li>
                <li>📚 Instant course material access</li>
                <li>💬 Community forum discussions</li>
                <li>📊 Grade & attendance tracking</li>
              </ul>
              <button type="button" className="ghost-btn" onClick={() => { setIsLogin(false); setError(""); }}>
                SIGN UP
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
