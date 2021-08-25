const express = require("express");
const router = express.Router();
const {
  registerUser,
  authUser,
  getUserProfile,
  getUsers,
} = require("../controllers/user");
const { protect } = require("../middleWare/auth");

router.route("/").post(registerUser).get(protect, getUsers);
router.post("/login", authUser);
router.route("/profile").get(protect, getUserProfile);

module.exports = router;
