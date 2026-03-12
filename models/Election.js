const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  votes:       { type: Number, default: 0 },
});

const eligibilitySchema = new mongoose.Schema({
  scope:       { type: String, enum: ["all", "targeted"], default: "all" },
  departments: [{ type: String }],
  semesters:   [{ type: String }],
  batches:     [{ type: String }],
  programs:    [{ type: String }],
  sections:    [{ type: String }],
});

const electionSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true, trim: true },
    type:      { type: String, required: true },   // cr, student_leader, dept_head, etc.
    startTime: { type: Date,   required: true },
    endTime:   { type: Date,   required: true },

    candidates:       [candidateSchema],
    eligibility:      { type: eligibilitySchema, default: () => ({ scope: "all" }) },
    resultsPublished: { type: Boolean, default: false },
    createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Total vote count (denormalised for quick reads)
    votes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Election", electionSchema);