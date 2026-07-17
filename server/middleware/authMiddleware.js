const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyToken = async (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  console.log("=== AUTH MIDDLEWARE DEBUG ===");
  console.log("Request:", req.method, req.originalUrl);
  console.log("Authorization header exists:", !!authHeader);
  console.log("Token exists:", !!token);

  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_super_secret_key_change_this",
    );

    const dbUser = await User.findById(decoded.uid);
    if (!dbUser || dbUser.isBlocked) {
      console.log("❌ User is blocked or does not exist");
      return res.status(401).json({ error: "Your account has been suspended." });
    }

    req.user = decoded;
    console.log(
      "✅ Token verified for user:",
      decoded.uid,
      "Role:",
      decoded.role,
    );
    next();
  } catch (error) {
    console.log("❌ Token verification failed:", error.message);
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log("❌ No user in request");
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      console.log(
        "❌ Role check failed. Required:",
        roles,
        "Got:",
        req.user.role,
      );
      return res.status(403).json({
        error: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }
    console.log("✅ Role check passed:", req.user.role);
    next();
  };
};

module.exports = { verifyToken, checkRole };
