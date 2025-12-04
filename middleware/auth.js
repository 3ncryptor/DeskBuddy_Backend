const supabase = require("../services/supabaseClient");
const logger = require("../utils/logger");
const { verifyToken, extractToken } = require("../utils/jwt");

/**
 * Middleware to authenticate JWT tokens
 * Adds user data to req.user if token is valid
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = extractToken(authHeader);

    if (!token) {
      logger.warn('JWT authentication failed: No token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token
    const decoded = verifyToken(token);
    
    // Fetch user from database to ensure they still exist and are active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      logger.warn('JWT authentication failed: User not found', {
        userId: decoded.id,
        error: error?.message
      });
      return res.status(401).json({ error: 'Invalid token: User not found' });
    }

    // Add user data to request object
    req.user = user;
    req.token = token;

    logger.debug('JWT authentication successful', {
      userId: user.id,
      email: user.email,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('JWT authentication middleware error', {
      error: error.message,
      path: req.path,
      method: req.method
    });

    if (error.message === 'Invalid token' || error.message === 'Token expired') {
      return res.status(401).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Optional authentication middleware
 * Adds user data to req.user if token is valid, but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = extractToken(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    // Verify JWT token
    const decoded = verifyToken(token);
    
    // Fetch user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      // Invalid token, but don't fail the request
      req.user = null;
      return next();
    }

    // Add user data to request object
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    // Token verification failed, but don't fail the request
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};