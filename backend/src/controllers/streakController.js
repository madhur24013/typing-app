const streakModel = require('../models/streaks');
const { pool } = require('../config/database');
const { logError } = require('../utils/logger');

/**
 * Get a user's streak data
 */
const getUserStreak = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        us.*,
        COALESCE(MAX(dal.activity_date), CURRENT_DATE - INTERVAL '1 day') as last_activity_date,
        COUNT(DISTINCT dal.activity_date) as total_activities
      FROM user_streaks us
      LEFT JOIN daily_activity_logs dal ON us.user_id = dal.user_id
      WHERE us.user_id = $1
      GROUP BY us.user_id, us.current_streak, us.longest_streak, us.last_activity_date
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      // Initialize streak for new user
      const initQuery = `
        INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
        VALUES ($1, 0, 0, CURRENT_DATE)
        RETURNING *
      `;
      const initResult = await pool.query(initQuery, [userId]);
      return res.json(initResult.rows[0]);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logError('Error in getUserStreak:', error);
    res.status(500).json({ error: 'Failed to fetch user streak' });
  }
};

/**
 * Log user activity and update streak
 */
const logActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { typingTime, charactersTyped, wordsTyped, wpm, accuracy } = req.body;
    
    await streakModel.logDailyActivity(userId, {
      typingTime,
      charactersTyped,
      wordsTyped,
      wpm,
      accuracy
    });
    
    const updatedStreak = await streakModel.getUserStreakData(userId);
    
    res.status(200).json({
      message: 'Activity logged successfully',
      streak: updatedStreak
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
};

/**
 * Claim a streak milestone reward
 */
const claimReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const { milestone } = req.params;
    
    const result = await streakModel.claimStreakReward(userId, parseInt(milestone));
    
    res.status(200).json({
      message: 'Reward claimed successfully',
      reward: result.reward
    });
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(400).json({ error: error.message || 'Failed to claim reward' });
  }
};

/**
 * Get streak reward options
 */
const getRewardOptions = async (req, res) => {
  try {
    // Get the streak rewards from the database
    const [rewards] = await db.query(
      'SELECT streakMilestone, rewardType, description FROM streak_rewards WHERE isActive = TRUE ORDER BY streakMilestone'
    );
    
    res.status(200).json({
      rewards
    });
  } catch (error) {
    console.error('Error getting reward options:', error);
    res.status(500).json({ error: 'Failed to retrieve reward options' });
  }
};

/**
 * Purchase a streak freeze
 */
const purchaseStreakFreeze = async (req, res) => {
  try {
    const userId = req.user.id;
    const { quantity = 1 } = req.body;
    
    // Assuming there's a point system or other currency to purchase these
    // This would typically check if the user has enough points
    
    // For demonstration, we'll just give them the freezes
    await streakModel.addStreakFreeze(userId, quantity);
    
    res.status(200).json({
      message: `${quantity} streak freeze(s) added to your account`
    });
  } catch (error) {
    console.error('Error purchasing streak freeze:', error);
    res.status(500).json({ error: 'Failed to purchase streak freeze' });
  }
};

/**
 * Get streak statistics for the leaderboard
 */
const getStreakLeaderboard = async (req, res) => {
  try {
    // Get users with highest current streaks
    const [currentStreaks] = await db.query(
      `SELECT u.id, u.username, u.displayName, us.currentStreak, us.longestStreak
       FROM user_streaks us
       JOIN users u ON us.userId = u.id
       ORDER BY us.currentStreak DESC
       LIMIT 20`
    );
    
    // Get users with highest all-time streaks
    const [longestStreaks] = await db.query(
      `SELECT u.id, u.username, u.displayName, us.longestStreak, us.currentStreak
       FROM user_streaks us
       JOIN users u ON us.userId = u.id
       ORDER BY us.longestStreak DESC
       LIMIT 20`
    );
    
    res.status(200).json({
      currentStreaks,
      longestStreaks
    });
  } catch (error) {
    console.error('Error getting streak leaderboard:', error);
    res.status(500).json({ error: 'Failed to retrieve streak leaderboard' });
  }
};

const updateStreak = async (req, res) => {
  try {
    const userId = req.user.id;
    const { activity } = req.body;
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Log activity
      const logQuery = `
        INSERT INTO daily_activity_logs (user_id, activity_date, activity_type)
        VALUES ($1, CURRENT_DATE, $2)
        ON CONFLICT (user_id, activity_date) DO UPDATE
        SET activity_type = EXCLUDED.activity_type
      `;
      await client.query(logQuery, [userId, activity]);
      
      // Update streak
      const streakQuery = `
        WITH current_streak AS (
          SELECT COUNT(*) as streak_count
          FROM daily_activity_logs
          WHERE user_id = $1
          AND activity_date >= CURRENT_DATE - (
            SELECT COUNT(*) 
            FROM daily_activity_logs 
            WHERE user_id = $1 
            AND activity_date <= CURRENT_DATE
          )::INTEGER
        )
        UPDATE user_streaks
        SET 
          current_streak = (SELECT streak_count FROM current_streak),
          longest_streak = GREATEST(longest_streak, (SELECT streak_count FROM current_streak)),
          last_activity_date = CURRENT_DATE
        WHERE user_id = $1
        RETURNING *
      `;
      const result = await client.query(streakQuery, [userId]);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User streak not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logError('Error in updateStreak:', error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
};

module.exports = {
  getUserStreak,
  logActivity,
  claimReward,
  getRewardOptions,
  purchaseStreakFreeze,
  getStreakLeaderboard,
  updateStreak
}; 