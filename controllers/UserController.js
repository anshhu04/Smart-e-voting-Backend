const User = require("../models/User");

// ── GET /api/users ─── (Admin only) ──────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "student" }).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};

// ── GET /api/users/:id ─── (Admin only) ──────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user", error: error.message });
  }
};

// ── PUT /api/users/profile ────────────────────────────────────────────────────
// Update logged-in user's profile
const updateProfile = async (req, res) => {
  try {
    const {
      name, email, phone, department, semester, batch,
      passingYear, program, gender, dob, address, bio, section,
      profilePhoto, coverPhoto,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if email is taken by another user
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: "Email already in use" });
    }

    // Update fields — use findByIdAndUpdate to avoid triggering password pre-save hook
    const updateData = {};
    if (name        !== undefined && name)   updateData.name        = name;
    if (email       !== undefined && email)  updateData.email       = email;
    if (phone       !== undefined) updateData.phone       = phone;
    if (department  !== undefined) updateData.department  = department;
    if (semester    !== undefined) updateData.semester    = semester;
    if (batch       !== undefined) updateData.batch       = batch;
    if (passingYear !== undefined) updateData.passingYear = passingYear;
    if (program     !== undefined) updateData.program     = program;
    if (gender      !== undefined) updateData.gender      = gender;
    if (dob         !== undefined) updateData.dob         = dob;
    if (address     !== undefined) updateData.address     = address;
    if (bio         !== undefined) updateData.bio         = bio;
    if (section     !== undefined) updateData.section     = section;
    // Photos — allow empty string to clear, or base64 to set
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
    if (coverPhoto   !== undefined) updateData.coverPhoto   = coverPhoto;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

// ── PUT /api/users/change-password ───────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to change password", error: error.message });
  }
};

module.exports = { getAllUsers, getUserById, updateProfile, changePassword };