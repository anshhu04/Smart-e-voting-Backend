const express = require("express");
const router  = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const { castVote, getMyVotes, checkVote, getElectionVotes } = require("../controllers/VoteController");

router.use(protect);

router.post("/",                          castVote);
router.get("/my",                         getMyVotes);
router.get("/check/:electionId",          checkVote);
router.get("/election/:electionId",       adminOnly, getElectionVotes);

module.exports = router;