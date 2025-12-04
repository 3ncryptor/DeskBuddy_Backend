const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * Generate JWT token for user
 * @param {Object} user - User object with id and email
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  try {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'deskbuddy-backend'
      }
    );
    
    logger.info('JWT token generated successfully', { 
      userId: user.id, 
      email: user.email 
    });
    
    return token;
  } catch (error) {
    logger.error('JWT token generation failed', { 
      error: error.message,
      userId: user.id 
    });
    throw new Error('Token generation failed');
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    logger.debug('JWT token verified successfully', { 
      userId: decoded.id,
      email: decoded.email 
    });
    
    return decoded;
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid JWT token', { error: error.message });
      throw new Error('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      logger.warn('JWT token expired', { error: error.message });
      throw new Error('Token expired');
    } else {
      logger.error('JWT token verification failed', { error: error.message });
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} JWT token or null
 */
const extractToken = (authHeader) => {
  if (!authHeader) {
    return null;
  }
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
};

module.exports = {
  generateToken,
  verifyToken,
  extractToken
};