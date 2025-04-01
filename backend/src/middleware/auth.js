const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Middleware to authenticate users using JWT
const authenticate = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if token exists
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Set user data on request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = {
  authenticate
}; 