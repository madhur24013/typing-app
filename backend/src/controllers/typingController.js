const db = require('../config/database');
const progressController = require('./progressController');

// Start a new typing session
const startSession = (req, res) => {
  const userId = req.user.id;
  
  db.run(
    'INSERT INTO typing_sessions (user_id, completed) VALUES (?, false)',
    [userId],
    function(err) {
      if (err) {
        console.error('Error starting typing session:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.status(201).json({
        message: 'Typing session started',
        sessionId: this.lastID
      });
    }
  );
};

// Update typing session with progress
const updateSession = (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.id;
  const { wpm, accuracy, duration } = req.body;
  
  // Validate input
  if (!wpm || !accuracy || !duration) {
    return res.status(400).json({ message: 'WPM, accuracy, and duration are required' });
  }
  
  // Update session
  db.run(
    'UPDATE typing_sessions SET wpm = ?, accuracy = ?, duration = ? WHERE id = ? AND user_id = ?',
    [wpm, accuracy, duration, sessionId, userId],
    function(err) {
      if (err) {
        console.error('Error updating typing session:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      res.json({
        message: 'Session updated successfully',
        sessionId
      });
    }
  );
};

// Complete a typing session
const completeSession = (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.id;
  const { wpm, accuracy, duration } = req.body;
  
  // Validate input
  if (!wpm || !accuracy || !duration) {
    return res.status(400).json({ message: 'WPM, accuracy, and duration are required' });
  }
  
  // Complete session
  db.run(
    'UPDATE typing_sessions SET wpm = ?, accuracy = ?, duration = ?, completed = true WHERE id = ? AND user_id = ?',
    [wpm, accuracy, duration, sessionId, userId],
    function(err) {
      if (err) {
        console.error('Error completing typing session:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Update user progress and check for badges
      progressController.updateProgress(userId, {
        wpm,
        accuracy,
        duration,
        words_typed: Math.round((wpm * duration) / 60), // Estimate words typed based on WPM
        characters_typed: Math.round((wpm * duration) / 60) * 5 // Estimate characters using avg word length of 5
      });
      
      res.json({
        message: 'Session completed successfully',
        sessionId
      });
    }
  );
};

// Track typing errors
const trackError = (req, res) => {
  const sessionId = req.params.id;
  const { errorContent, expectedContent, position } = req.body;
  
  // Validate input
  if (!errorContent || !expectedContent || position === undefined) {
    return res.status(400).json({ message: 'Error content, expected content, and position are required' });
  }
  
  // Insert error
  db.run(
    'INSERT INTO typing_errors (session_id, error_content, expected_content, position) VALUES (?, ?, ?, ?)',
    [sessionId, errorContent, expectedContent, position],
    function(err) {
      if (err) {
        console.error('Error tracking typing error:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.status(201).json({
        message: 'Error tracked successfully',
        errorId: this.lastID
      });
    }
  );
};

// Get user's typing statistics
const getUserStats = (req, res) => {
  const userId = req.user.id;
  
  // Get average WPM, accuracy, and total time spent
  db.get(
    `SELECT 
      AVG(wpm) as averageWpm, 
      AVG(accuracy) as averageAccuracy,
      SUM(duration) as totalTime,
      COUNT(*) as totalSessions
    FROM typing_sessions 
    WHERE user_id = ? AND completed = true`,
    [userId],
    (err, stats) => {
      if (err) {
        console.error('Error retrieving typing statistics:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      // Get most common errors
      db.all(
        `SELECT 
          e.error_content, 
          e.expected_content, 
          COUNT(*) as count 
        FROM typing_errors e
        JOIN typing_sessions s ON e.session_id = s.id
        WHERE s.user_id = ?
        GROUP BY e.error_content, e.expected_content
        ORDER BY count DESC
        LIMIT 10`,
        [userId],
        (err, errors) => {
          if (err) {
            console.error('Error retrieving error statistics:', err);
            return res.status(500).json({ message: 'Server error' });
          }
          
          res.json({
            stats: {
              averageWpm: stats.averageWpm || 0,
              averageAccuracy: stats.averageAccuracy || 0,
              totalTime: stats.totalTime || 0,
              totalSessions: stats.totalSessions || 0
            },
            commonErrors: errors || []
          });
        }
      );
    }
  );
};

// Get session history
const getSessionHistory = (req, res) => {
  const userId = req.user.id;
  
  db.all(
    `SELECT 
      id, wpm, accuracy, duration, created_at 
    FROM typing_sessions 
    WHERE user_id = ? AND completed = true 
    ORDER BY created_at DESC`,
    [userId],
    (err, sessions) => {
      if (err) {
        console.error('Error retrieving session history:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.json({ sessions });
    }
  );
};

module.exports = {
  startSession,
  updateSession,
  completeSession,
  trackError,
  getUserStats,
  getSessionHistory
}; 