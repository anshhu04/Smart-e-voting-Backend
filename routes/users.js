const express = require("express");
const router  = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const { getAllUsers, getUserById, updateProfile, changePassword } = require("../controllers/UserController");

router.use(protect);

router.get("/",                  adminOnly, getAllUsers);
router.get("/:id",               adminOnly, getUserById);
router.put("/profile",           updateProfile);
router.put("/change-password",   changePassword);

module.exports = router;
