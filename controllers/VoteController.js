const Vote     = require("../models/Vote");
const Election = require("../models/Election");

// ── POST /api/votes ───────────────────────────────────────────────────────────
const castVote = async (req, res) => {
  try {
    const { electionId, candidateName } = req.body;

    if (!electionId || !candidateName) {
      return res.status(400).json({ message: "electionId and candidateName are required" });
    }

    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ message: "Election not found" });

    // Check election is live
    const now = new Date();
    if (now < new Date(election.startTime)) {
      return res.status(400).json({ message: "Election has not started yet" });
    }
    if (now > new Date(election.endTime)) {
      return res.status(400).json({ message: "Election has already ended" });
    }

    // Check eligibility
    const el = election.eligibility;
    if (el && el.scope === "targeted") {
      const user = req.user;
      const matchDept    = !el.departments?.length || el.departments.includes(user.department);
      const matchSem     = !el.semesters?.length   || el.semesters.includes(user.semester);
      const matchBatch   = !el.batches?.length     || el.batches.includes(user.batch);
      const matchProgram = !el.programs?.length    || el.programs.includes(user.program);
      const matchSection = !el.sections?.length    || el.sections.includes(user.section);
      if (!(matchDept && matchSem && matchBatch && matchProgram && matchSection)) {
        return res.status(403).json({ message: "You are not eligible to vote in this election" });
      }
    }

    // Check already voted
    const existingVote = await Vote.findOne({ election: electionId, voter: req.user._id });
    if (existingVote) {
      return res.status(400).json({ message: "You have already voted in this election" });
    }

    // Check candidate exists
    const candidate = election.candidates.find((c) => c.name === candidateName);
    if (!candidate) {
      return res.status(400).json({ message: "Candidate not found" });
    }

    // Record vote
    await Vote.create({ election: electionId, voter: req.user._id, candidateName });

    // Increment candidate vote count + total votes
    await Election.findOneAndUpdate(
      { _id: electionId, "candidates.name": candidateName },
      {
        $inc: {
          "candidates.$.votes": 1,
          votes: 1,
        },
      }
    );

    res.status(201).json({ message: "Vote cast successfully", candidateName });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already voted in this election" });
    }
    res.status(500).json({ message: "Failed to cast vote", error: error.message });
  }
};

// ── GET /api/votes/my ─────────────────────────────────────────────────────────
// Returns all votes the logged-in student has cast
const getMyVotes = async (req, res) => {
  try {
    const votes = await Vote.find({ voter: req.user._id }).populate("election", "title");
    res.json(votes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch votes", error: error.message });
  }
};

// ── GET /api/votes/check/:electionId ─────────────────────────────────────────
// Check if the logged-in user voted in a specific election
const checkVote = async (req, res) => {
  try {
    const vote = await Vote.findOne({
      election: req.params.electionId,
      voter:    req.user._id,
    });
    res.json({ voted: !!vote, candidateName: vote?.candidateName || null });
  } catch (error) {
    res.status(500).json({ message: "Failed to check vote", error: error.message });
  }
};

// ── GET /api/votes/election/:electionId ─── (Admin only) ─────────────────────
// Get all votes for an election
const getElectionVotes = async (req, res) => {
  try {
    const votes = await Vote.find({ election: req.params.electionId })
      .populate("voter", "name studentId department semester");
    res.json(votes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch election votes", error: error.message });
  }
};

module.exports = { castVote, getMyVotes, checkVote, getElectionVotes };