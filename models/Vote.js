const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    election:      { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
    voter:         { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
    candidateName: { type: String, required: true },
  },
  { timestamps: true }
);

// One vote per student per election
voteSchema.index({ election: 1, voter: 1 }, { unique: true });

module.exports = mongoose.model("Vote", voteSchema);
