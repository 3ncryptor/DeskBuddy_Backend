const express = require("express");
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  logout 
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

// Public routes (no authentication required)
router.post("/register", register);
router.post("/login", login);

// Protected routes (authentication required)
router.get("/me", authenticateToken, getMe);
router.post("/logout", authenticateToken, logout);

module.exports = router;