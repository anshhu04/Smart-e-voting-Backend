const crypto = require("crypto");
const jwt   = require("jsonwebtoken");
const User  = require("../models/User");
const { sendPasswordResetEmail } = require("../utils/email");

// Generate JWT token
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res) => {

  try {

    const { name, email, studentId, password, role, adminKey } = req.body;

    if (!name || !email || !studentId || !password) {

      return res.status(400).json({
        message: "All fields are required"
      });

    }

    // Admin key check

    if (role === "admin" && adminKey !== process.env.ADMIN_SECRET_KEY) {

      return res.status(403).json({
        message: "Invalid admin secret key"
      });

    }

    // Check existing user

    const existingUser = await User.findOne({
      $or: [{ email }, { studentId }]
    });

    if (existingUser) {

      return res.status(400).json({
        message: "User already exists"
      });

    }

    // CREATE USER

    const user = await User.create({

      name,
      email,
      studentId,
      password,
      role: role || "student"

    });

    // IMPORTANT: confirm saved

    console.log("User saved:", user.email);

    res.status(201).json({

      message: "Registration successful",

      token: generateToken(user._id),

      user: user.toJSON()

    });

  }

  catch (error) {

    console.error(error);

    res.status(500).json({

      message: "Registration failed",

      error: error.message

    });

  }

};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {

      return res.status(401).json({
        message: "Invalid email or password"
      });

    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {

      return res.status(401).json({
        message: "Invalid email or password"
      });

    }

    res.status(200).json({

      message: "Login successful",

      token: generateToken(user._id),

      user: user.toJSON()

    });

  }

  catch (error) {

    res.status(500).json({

      message: "Login failed",

      error: error.message

    });

  }

};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  res.json(req.user);
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    // Always return same message so we don't reveal whether email exists
    const message = "If an account exists with this email, you will receive a password reset link shortly.";

    if (!user) {
      return res.status(200).json({ message });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({ message });
  } catch (error) {
    console.error("forgotPassword:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
};

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
    }

    user.password = newPassword;
    user.resetPasswordToken = "";
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: "Password reset successful. You can now sign in." });
  } catch (error) {
    console.error("resetPassword:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

module.exports = { register, login, getMe, forgotPassword, resetPassword };