const jwt = require("jsonwebtoken");
const User = require("../models/User");

const signToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  businessSpeciality: user.businessSpeciality || "",
  createdAt: user.createdAt,
});

const register = async (req, res) => {
  try {
    const { name, email, password, businessSpeciality } = req.body;
    const normalizedSpeciality = String(businessSpeciality || "").trim();

    if (!name || !email || !password || !normalizedSpeciality) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and business speciality are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email.",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "user",
      businessSpeciality: normalizedSpeciality,
    });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register user.",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to login user.",
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: sanitizeUser(req.user),
  });
};

module.exports = {
  register,
  login,
  getMe,
};
