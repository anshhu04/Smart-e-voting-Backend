const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    studentId:  { type: String, required: true, unique: true, trim: true },
    password:   { type: String, required: true },
    role:       { type: String, enum: ["student", "admin"], default: "student" },

    // Profile extras
    phone:       { type: String, default: "" },
    department:  { type: String, default: "" },
    semester:    { type: String, default: "" },
    batch:       { type: String, default: "" },
    section:     { type: String, default: "" },
    passingYear: { type: String, default: "" },
    program:     { type: String, default: "" },
    gender:      { type: String, default: "" },
    dob:         { type: String, default: "" },
    address:     { type: String, default: "" },
    bio:         { type: String, default: "" },

    // Photos stored as base64 strings
    profilePhoto: { type: String, default: "" },
    coverPhoto:   { type: String, default: "" },

    // Password reset (forgot password flow)
    resetPasswordToken:   { type: String, default: "" },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Never return password in responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);