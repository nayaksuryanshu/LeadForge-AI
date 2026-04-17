const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token user.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
      error: error.message,
    });
  }
};

const allowRoles = (...roles) => (req, res, next) => {
  const allowedRoles = roles.map((role) => String(role).trim().toLowerCase());
  const userRole = String(req.user?.role || "").trim().toLowerCase();

  if (!req.user || !allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: insufficient role.",
    });
  }

  return next();
};

module.exports = {
  protect,
  allowRoles,
};
