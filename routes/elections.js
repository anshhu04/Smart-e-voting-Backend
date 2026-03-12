const express  = require("express");
const router   = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getElections,
  getElection,
  createElection,
  deleteElection,
  addCandidate,
  deleteCandidate,
  publishResults,
} = require("../controllers/ElectionController");

// All election routes require login
router.use(protect);

router.get("/",    getElections);
router.get("/:id", getElection);

// Admin only
router.post("/",                                adminOnly, createElection);
router.delete("/:id",                           adminOnly, deleteElection);
router.post("/:id/candidates",                  adminOnly, addCandidate);
router.delete("/:id/candidates/:candidateId",   adminOnly, deleteCandidate);
router.patch("/:id/publish",                    adminOnly, publishResults);

module.exports = router;
