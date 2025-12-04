const bcrypt = require('bcryptjs');
const supabase = require("../services/supabaseClient");
const logger = require("../utils/logger");
const { generateToken } = require("../utils/jwt");

/**
 * Register a new user
 */
const register = async (req, res) => {
  const { name, email, password } = req.body;

  logger.api.request("POST", "/api/auth/register", { email, name });

  try {
    // Validate input
    if (!name || !email || !password) {
      logger.api.error("POST", "/api/auth/register", "Missing required fields", { email });
      return res.status(400).json({ 
        error: "Name, email, and password are required" 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.api.error("POST", "/api/auth/register", "Invalid email format", { email });
      return res.status(400).json({ 
        error: "Please provide a valid email address" 
      });
    }

    // Validate password length
    if (password.length < 6) {
      logger.api.error("POST", "/api/auth/register", "Password too short", { email });
      return res.status(400).json({ 
        error: "Password must be at least 6 characters long" 
      });
    }

    // Check if user already exists
    logger.database.query("SELECT", "users", { email });
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      logger.api.error("POST", "/api/auth/register", "Email already exists", { email });
      return res.status(409).json({ 
        error: "An account with this email already exists" 
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in database
    logger.database.query("INSERT", "users", { email, name });
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        name: name.trim(),
        email: email.toLowerCase(),
        password_hash: passwordHash
      }])
      .select('id, email, name, created_at')
      .single();

    if (createError) {
      logger.database.error("INSERT", "users", createError, { email });
      return res.status(500).json({ 
        error: "Failed to create user account" 
      });
    }

    // Generate JWT token
    const token = generateToken(newUser);

    logger.info("User registration successful", {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name
    });

    logger.api.response("POST", "/api/auth/register", 201, {
      userId: newUser.id,
      email: newUser.email
    });

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.created_at
      }
    });

  } catch (error) {
    logger.error("User registration failed", {
      error: error.message,
      email,
      stack: error.stack
    });
    logger.api.error("POST", "/api/auth/register", error, { email });
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  logger.api.request("POST", "/api/auth/login", { email });

  try {
    // Validate input
    if (!email || !password) {
      logger.api.error("POST", "/api/auth/login", "Missing credentials", { email });
      return res.status(400).json({ 
        error: "Email and password are required" 
      });
    }

    // Find user by email
    logger.database.query("SELECT", "users", { email });
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, password_hash, created_at')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !user) {
      logger.api.error("POST", "/api/auth/login", "User not found", { email });
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      logger.warn("Login failed: Invalid password", { 
        userId: user.id, 
        email: user.email 
      });
      logger.api.error("POST", "/api/auth/login", "Invalid password", { email });
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    logger.info("User login successful", {
      userId: user.id,
      email: user.email,
      name: user.name
    });

    logger.api.response("POST", "/api/auth/login", 200, {
      userId: user.id,
      email: user.email
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    logger.error("User login failed", {
      error: error.message,
      email,
      stack: error.stack
    });
    logger.api.error("POST", "/api/auth/login", error, { email });
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

/**
 * Get current user info
 */
const getMe = async (req, res) => {
  logger.api.request("GET", "/api/auth/me", { userId: req.user.id });

  try {
    const user = req.user; // Added by auth middleware

    logger.api.response("GET", "/api/auth/me", 200, {
      userId: user.id,
      email: user.email
    });

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    logger.error("Get user info failed", {
      error: error.message,
      userId: req.user?.id,
      stack: error.stack
    });
    logger.api.error("GET", "/api/auth/me", error, { userId: req.user?.id });
    res.status(500).json({ error: "Failed to get user information" });
  }
};

/**
 * Logout user (client-side token removal)
 */
const logout = async (req, res) => {
  logger.api.request("POST", "/api/auth/logout", { userId: req.user.id });

  try {
    logger.info("User logout", {
      userId: req.user.id,
      email: req.user.email
    });

    logger.api.response("POST", "/api/auth/logout", 200, {
      userId: req.user.id
    });

    res.status(200).json({
      message: "Logged out successfully"
    });

  } catch (error) {
    logger.error("Logout failed", {
      error: error.message,
      userId: req.user?.id,
      stack: error.stack
    });
    res.status(500).json({ error: "Logout failed" });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout
};