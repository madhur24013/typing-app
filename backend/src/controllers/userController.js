const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const config = require('../config/config');

// Register a new user
const register = (req, res) => {
  const { username, email, password } = req.body;

  // Validate input
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if email is valid
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  // Hash password
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Insert new user
      db.run(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function (err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ message: 'Server error' });
          }

          // Generate JWT token
          const token = jwt.sign(
            { id: this.lastID, username, email },
            config.jwtSecret,
            { expiresIn: '7d' }
          );

          res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
              id: this.lastID,
              username,
              email
            }
          });
        }
      );
    });
  });
};

// Login user
const login = (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Find user by email
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    });
  });
};

// Get user profile
const getProfile = (req, res) => {
  const userId = req.user.id;

  db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  });
};

module.exports = {
  register,
  login,
  getProfile
}; 