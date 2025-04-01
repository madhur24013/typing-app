const db = require('../config/database');

// Initialize or get user progress
const getUserProgress = (req, res) => {
  const userId = req.user.id;
  
  // Get user progress or create if not exists
  db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId], (err, progress) => {
    if (err) {
      console.error('Error getting user progress:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (!progress) {
      // Create new progress record for the user
      db.run(
        'INSERT INTO user_progress (user_id) VALUES (?)',
        [userId],
        function(err) {
          if (err) {
            console.error('Error creating user progress:', err);
            return res.status(500).json({ message: 'Server error' });
          }
          
          // Return newly created progress with default values
          return res.json({
            progress: {
              id: this.lastID,
              user_id: userId,
              total_words_typed: 0,
              total_characters_typed: 0,
              total_time_practiced: 0,
              points: 0,
              level: 1,
              streak_days: 0,
              last_practice_date: null
            }
          });
        }
      );
    } else {
      // Return existing progress
      res.json({ progress });
    }
  });
};

// Update user progress after completing a typing session
const updateProgress = (req, res) => {
  const userId = req.user.id;
  const { 
    words_typed, 
    characters_typed, 
    time_practiced, 
    wpm, 
    accuracy 
  } = req.body;
  
  // Calculate points earned (simple formula that rewards speed and accuracy)
  const pointsEarned = Math.round(wpm * (accuracy * accuracy) * (time_practiced / 60));
  
  // Get current date string for streak tracking
  const today = new Date().toISOString().split('T')[0];
  
  // First, get current progress
  db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId], (err, progress) => {
    if (err) {
      console.error('Error getting user progress:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (!progress) {
      // Create new progress record
      db.run(
        `INSERT INTO user_progress 
          (user_id, total_words_typed, total_characters_typed, total_time_practiced, points, last_practice_date, streak_days) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, words_typed, characters_typed, time_practiced, pointsEarned, today, 1],
        function(err) {
          if (err) {
            console.error('Error creating user progress:', err);
            return res.status(500).json({ message: 'Server error' });
          }
          
          checkAndUpdateBadges(userId);
          
          return res.json({
            message: 'Progress updated',
            points_earned: pointsEarned,
            progress: {
              id: this.lastID,
              user_id: userId,
              total_words_typed: words_typed,
              total_characters_typed: characters_typed,
              total_time_practiced: time_practiced,
              points: pointsEarned,
              level: 1,
              streak_days: 1,
              last_practice_date: today
            }
          });
        }
      );
    } else {
      // Update streak
      let newStreak = progress.streak_days || 0;
      
      if (progress.last_practice_date) {
        const lastDate = new Date(progress.last_practice_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (progress.last_practice_date === today) {
          // Already practiced today, streak remains the same
        } else if (progress.last_practice_date === yesterdayStr) {
          // Practiced yesterday, increment streak
          newStreak += 1;
        } else {
          // Streak broken, reset to 1
          newStreak = 1;
        }
      } else {
        // First practice, set streak to 1
        newStreak = 1;
      }
      
      // Calculate new level (simple formula: 1 level per 1000 points)
      const totalPoints = (progress.points || 0) + pointsEarned;
      const newLevel = Math.max(1, Math.floor(totalPoints / 1000) + 1);
      
      // Update progress record
      db.run(
        `UPDATE user_progress 
         SET total_words_typed = total_words_typed + ?, 
             total_characters_typed = total_characters_typed + ?,
             total_time_practiced = total_time_practiced + ?,
             points = points + ?,
             level = ?,
             streak_days = ?,
             last_practice_date = ?
         WHERE user_id = ?`,
        [
          words_typed || 0, 
          characters_typed || 0, 
          time_practiced || 0, 
          pointsEarned, 
          newLevel,
          newStreak,
          today,
          userId
        ],
        function(err) {
          if (err) {
            console.error('Error updating user progress:', err);
            return res.status(500).json({ message: 'Server error' });
          }
          
          // Check if user earned any badges
          checkAndUpdateBadges(userId);
          
          // Return updated progress
          db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId], (err, updatedProgress) => {
            if (err) {
              console.error('Error getting updated progress:', err);
              return res.status(500).json({ message: 'Server error' });
            }
            
            res.json({
              message: 'Progress updated',
              points_earned: pointsEarned,
              level_up: newLevel > progress.level,
              progress: updatedProgress
            });
          });
        }
      );
    }
  });
};

// Check if user earned any badges and award them
const checkAndUpdateBadges = (userId) => {
  // Get all badges
  db.all('SELECT * FROM badges', [], (err, badges) => {
    if (err) {
      console.error('Error getting badges:', err);
      return;
    }
    
    // Get user progress
    db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId], (err, progress) => {
      if (err || !progress) {
        console.error('Error getting user progress for badges:', err);
        return;
      }
      
      // Get user's typing stats
      db.get(
        `SELECT 
          MAX(wpm) as max_wpm, 
          MAX(accuracy) as max_accuracy, 
          COUNT(*) as sessions_completed 
         FROM typing_sessions 
         WHERE user_id = ? AND completed = true`,
        [userId],
        (err, stats) => {
          if (err) {
            console.error('Error getting typing stats for badges:', err);
            return;
          }
          
          // Get user's already earned badges
          db.all('SELECT badge_id FROM user_badges WHERE user_id = ?', [userId], (err, earnedBadges) => {
            if (err) {
              console.error('Error getting earned badges:', err);
              return;
            }
            
            // Convert to array of badge IDs
            const earnedBadgeIds = earnedBadges.map(b => b.badge_id);
            
            // Check each badge to see if it's earned
            badges.forEach(badge => {
              // Skip if already earned
              if (earnedBadgeIds.includes(badge.id)) {
                return;
              }
              
              // Evaluate the badge criteria
              let earned = false;
              
              try {
                // Create evaluation context with user's stats
                const context = {
                  sessions_completed: stats?.sessions_completed || 0,
                  max_wpm: stats?.max_wpm || 0,
                  max_accuracy: stats?.max_accuracy || 0,
                  total_words_typed: progress.total_words_typed || 0,
                  total_time_practiced: progress.total_time_practiced || 0,
                  streak_days: progress.streak_days || 0
                };
                
                // Evaluate the criteria
                earned = eval(badge.criteria);
              } catch (error) {
                console.error(`Error evaluating badge criteria for ${badge.name}:`, error);
                return;
              }
              
              // Award badge if earned
              if (earned) {
                db.run(
                  'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
                  [userId, badge.id],
                  (err) => {
                    if (err) {
                      console.error(`Error awarding badge ${badge.name}:`, err);
                    } else {
                      console.log(`Badge awarded to user ${userId}: ${badge.name}`);
                    }
                  }
                );
              }
            });
          });
        }
      );
    });
  });
};

// Get user badges
const getUserBadges = (req, res) => {
  const userId = req.user.id;
  
  db.all(
    `SELECT b.*, ub.earned_at 
     FROM badges b
     JOIN user_badges ub ON b.id = ub.badge_id
     WHERE ub.user_id = ?
     ORDER BY ub.earned_at DESC`,
    [userId],
    (err, badges) => {
      if (err) {
        console.error('Error getting user badges:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.json({ badges });
    }
  );
};

// Get leaderboard
const getLeaderboard = (req, res) => {
  const { type = 'speed', limit = 10 } = req.query;
  let query = '';
  
  switch (type) {
    case 'speed':
      // Get users with highest WPM
      query = `
        SELECT u.username, MAX(ts.wpm) as score, COUNT(*) as sessions 
        FROM typing_sessions ts
        JOIN users u ON ts.user_id = u.id
        WHERE ts.completed = true
        GROUP BY ts.user_id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;
    
    case 'accuracy':
      // Get users with highest accuracy
      query = `
        SELECT u.username, AVG(ts.accuracy) * 100 as score, COUNT(*) as sessions 
        FROM typing_sessions ts
        JOIN users u ON ts.user_id = u.id
        WHERE ts.completed = true
        GROUP BY ts.user_id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;
    
    case 'points':
      // Get users with most points
      query = `
        SELECT u.username, up.points as score, up.level 
        FROM user_progress up
        JOIN users u ON up.user_id = u.id
        ORDER BY score DESC
        LIMIT ?
      `;
      break;
    
    case 'streak':
      // Get users with longest streaks
      query = `
        SELECT u.username, up.streak_days as score
        FROM user_progress up
        JOIN users u ON up.user_id = u.id
        WHERE up.streak_days > 0
        ORDER BY score DESC
        LIMIT ?
      `;
      break;
    
    default:
      return res.status(400).json({ message: 'Invalid leaderboard type' });
  }
  
  db.all(query, [limit], (err, leaderboard) => {
    if (err) {
      console.error('Error getting leaderboard:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    res.json({ 
      type,
      leaderboard,
      unit: type === 'speed' ? 'WPM' : 
            type === 'accuracy' ? '%' : 
            type === 'points' ? 'points' : 'days'
    });
  });
};

// Update user streak when they visit the typing practice page
const checkStreak = (req, res) => {
  const userId = req.user.id;
  
  db.get('SELECT last_practice_date FROM user_progress WHERE user_id = ?', [userId], (err, progress) => {
    if (err) {
      console.error('Error fetching user progress:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    // If user has no progress record, create one
    if (!progress) {
      db.run(
        'INSERT INTO user_progress (user_id, last_practice_date) VALUES (?, ?)',
        [userId, new Date().toISOString().split('T')[0]],
        (err) => {
          if (err) {
            console.error('Error creating user progress:', err);
            return res.status(500).json({ message: 'Server error' });
          }
          
          return res.json({ 
            message: 'User progress initialized',
            streak: 1
          });
        }
      );
      return;
    }
    
    // Check if last practice was yesterday or earlier to update streak
    const today = new Date().toISOString().split('T')[0];
    const lastPractice = progress.last_practice_date;
    
    // If last practice is today, don't update anything
    if (lastPractice === today) {
      return res.json({ 
        message: 'Already practiced today',
        streak: null
      });
    }
    
    // Get yesterday's date for streak calculation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let streakUpdate = '';
    let streakParams = [];
    
    // If last practice was yesterday, increase streak
    if (lastPractice === yesterdayStr) {
      streakUpdate = ', streak_days = streak_days + 1';
    } 
    // If last practice was before yesterday, reset streak to 1
    else if (lastPractice < yesterdayStr) {
      streakUpdate = ', streak_days = 1';
    }
    
    // Update last practice date to today
    db.run(
      `UPDATE user_progress SET last_practice_date = ?${streakUpdate} WHERE user_id = ?`,
      [today, userId],
      (err) => {
        if (err) {
          console.error('Error updating last practice date:', err);
          return res.status(500).json({ message: 'Server error' });
        }
        
        // Get updated streak
        db.get('SELECT streak_days FROM user_progress WHERE user_id = ?', [userId], (err, userProgress) => {
          if (err) {
            console.error('Error fetching updated streak:', err);
            return res.status(500).json({ message: 'Server error' });
          }
          
          return res.json({ 
            message: 'Streak updated',
            streak: userProgress.streak_days
          });
        });
      }
    );
  });
};

module.exports = {
  getUserProgress,
  updateProgress,
  getUserBadges,
  getLeaderboard,
  checkStreak
}; 