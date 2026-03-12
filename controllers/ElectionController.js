const Election = require("../models/Election");
const Vote     = require("../models/Vote");

// ── Helper: check if student is eligible for election ────────────────────────
const checkEligibility = (election, user) => {
  const el = election.eligibility;
  if (!el || el.scope === "all") return true;

  const matchDept    = !el.departments?.length || el.departments.includes(user.department);
  const matchSem     = !el.semesters?.length   || el.semesters.includes(user.semester);
  const matchBatch   = !el.batches?.length     || el.batches.includes(user.batch);
  const matchProgram = !el.programs?.length    || el.programs.includes(user.program);
  const matchSection = !el.sections?.length    || el.sections.includes(user.section);

  return matchDept && matchSem && matchBatch && matchProgram && matchSection;
};

// ── GET /api/elections ────────────────────────────────────────────────────────
// Students: only get eligible elections (vote counts hidden until published)
// Admins: get all elections with full data
const getElections = async (req, res) => {
  try {
    const elections = await Election.find().sort({ createdAt: -1 });
    const isAdmin   = req.user.role === "admin";

    const result = elections
      .filter((e) => isAdmin || checkEligibility(e, req.user))
      .map((e) => {
        const obj = e.toObject();

        // For students: hide vote counts until results are published & election ended
        const now   = new Date();
        const ended = now > new Date(e.endTime);

        if (!isAdmin && !(ended && e.resultsPublished)) {
          obj.candidates = obj.candidates.map((c) => ({
            ...c,
            votes: undefined,  // hide vote counts
          }));
        }

        return obj;
      });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch elections", error: error.message });
  }
};

// ── GET /api/elections/:id ────────────────────────────────────────────────────
const getElection = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ message: "Election not found" });

    const isAdmin = req.user.role === "admin";

    // Check eligibility for students
    if (!isAdmin && !checkEligibility(election, req.user)) {
      return res.status(403).json({ message: "You are not eligible for this election" });
    }

    // Check if student already voted
    const userVote = await Vote.findOne({ election: election._id, voter: req.user._id });

    const obj = election.toObject();
    obj.userVote = userVote?.candidateName || null;

    // Hide vote counts for students if not published
    const now   = new Date();
    const ended = now > new Date(election.endTime);
    if (!isAdmin && !(ended && election.resultsPublished)) {
      obj.candidates = obj.candidates.map((c) => ({ ...c, votes: undefined }));
    }

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch election", error: error.message });
  }
};

// ── POST /api/elections ─── (Admin only) ──────────────────────────────────────
const createElection = async (req, res) => {
  try {
    const { title, type, startTime, endTime, eligibility } = req.body;

    if (!title || !type || !startTime || !endTime) {
      return res.status(400).json({ message: "title, type, startTime and endTime are required" });
    }
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    const election = await Election.create({
      title,
      type,
      startTime,
      endTime,
      eligibility: eligibility || { scope: "all" },
      createdBy: req.user._id,
    });

    res.status(201).json(election);
  } catch (error) {
    res.status(500).json({ message: "Failed to create election", error: error.message });
  }
};

// ── DELETE /api/elections/:id ─── (Admin only) ───────────────────────────────
const deleteElection = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ message: "Election not found" });

    await Vote.deleteMany({ election: election._id });
    await election.deleteOne();

    res.json({ message: "Election deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete election", error: error.message });
  }
};

// ── POST /api/elections/:id/candidates ─── (Admin only) ──────────────────────
const addCandidate = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Candidate name is required" });

    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ message: "Election not found" });

    const duplicate = election.candidates.find(
      (c) => c.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) return res.status(400).json({ message: "Candidate already exists" });

    election.candidates.push({ name: name.trim(), description: description || "", votes: 0 });
    await election.save();

    res.status(201).json(election);
  } catch (error) {
    res.status(500).json({ message: "Failed to add candidate", error: error.message });
  }
};

// ── DELETE /api/elections/:id/candidates/:candidateId ─── (Admin only) ───────
const deleteCandidate = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ message: "Election not found" });

    election.candidates = election.candidates.filter(
      (c) => c._id.toString() !== req.params.candidateId
    );
    await election.save();

    res.json(election);
  } catch (error) {
    res.status(500).json({ message: "Failed to remove candidate", error: error.message });
  }
};

// ── PATCH /api/elections/:id/publish ─── (Admin only) ────────────────────────
const publishResults = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ message: "Election not found" });

    const now = new Date();
    if (now < new Date(election.endTime)) {
      return res.status(400).json({ message: "Cannot publish results — election has not ended yet" });
    }

    election.resultsPublished = req.body.publish !== undefined ? req.body.publish : true;
    await election.save();

    res.json({
      message: election.resultsPublished ? "Results published" : "Results unpublished",
      election,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to publish results", error: error.message });
  }
};

module.exports = {
  getElections,
  getElection,
  createElection,
  deleteElection,
  addCandidate,
  deleteCandidate,
  publishResults,
};