const { pool } = require('../config/database');
const { logError } = require('../utils/logger');
const { error, isLoading, handleError, retryOperation } = require('../utils/useApiError');
const monitoring = require('./utils/monitoring');

/**
 * Get available rewards for a user based on their current streak
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAvailableRewards = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    
    await client.query('BEGIN');
    
    // Get user's current streak
    const streakQuery = `
      SELECT current_streak
      FROM user_streaks
      WHERE user_id = $1
    `;
    const streakResult = await client.query(streakQuery, [userId]);
    
    if (streakResult.rows.length === 0) {
      // Create user streak record if it doesn't exist
      const createStreakQuery = `
        INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
        VALUES ($1, 0, 0, CURRENT_DATE)
        RETURNING current_streak
      `;
      const newStreakResult = await client.query(createStreakQuery, [userId]);
      const currentStreak = newStreakResult.rows[0].current_streak;
      
      // Get available rewards based on streak
      const rewardsQuery = `
        SELECT 
          sr.*,
          CASE 
            WHEN ur.claimed_at IS NOT NULL THEN true
            ELSE false
          END as claimed
        FROM streak_rewards sr
        LEFT JOIN user_rewards ur ON sr.id = ur.reward_id AND ur.user_id = $1
        WHERE sr.required_streak <= $2
        ORDER BY sr.required_streak ASC
      `;
      
      const result = await client.query(rewardsQuery, [userId, currentStreak]);
      await client.query('COMMIT');
      
      return res.json({
        rewards: result.rows,
        currentStreak
      });
    }
    
    const currentStreak = streakResult.rows[0].current_streak;
    
    // Get available rewards based on streak with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const rewardsQuery = `
      SELECT 
        sr.*,
        CASE 
          WHEN ur.claimed_at IS NOT NULL THEN true
          ELSE false
        END as claimed
      FROM streak_rewards sr
      LEFT JOIN user_rewards ur ON sr.id = ur.reward_id AND ur.user_id = $1
      WHERE sr.required_streak <= $2
      ORDER BY sr.required_streak ASC
      LIMIT $3 OFFSET $4
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM streak_rewards sr
      WHERE sr.required_streak <= $1
    `;
    
    const result = await client.query(rewardsQuery, [userId, currentStreak, limit, offset]);
    const countResult = await client.query(countQuery, [currentStreak]);
    
    await client.query('COMMIT');
    
    const totalRewards = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRewards / limit);
    
    return res.json({
      rewards: result.rows,
      currentStreak,
      pagination: {
        total: totalRewards,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logError('Error in getAvailableRewards:', err);
    return res.status(500).json({ 
      error: 'Failed to fetch available rewards',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    client.release();
  }
};

/**
 * Get reward history for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRewardHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const historyQuery = `
      SELECT 
        ur.id,
        ur.claimed_at,
        sr.name,
        sr.description,
        sr.reward_type,
        sr.reward_value,
        sr.icon_url
      FROM user_rewards ur
      JOIN streak_rewards sr ON ur.reward_id = sr.id
      WHERE ur.user_id = $1
      ORDER BY ur.claimed_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_rewards
      WHERE user_id = $1
    `;
    
    const result = await pool.query(historyQuery, [userId, limit, offset]);
    const countResult = await pool.query(countQuery, [userId]);
    
    const totalRewards = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRewards / limit);
    
    return res.json({
      history: result.rows,
      pagination: {
        total: totalRewards,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (err) {
    logError('Error in getRewardHistory:', err);
    return res.status(500).json({ 
      error: 'Failed to fetch reward history',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Claim a reward
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const claimReward = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { rewardId } = req.params;
    
    if (!rewardId || !Number.isInteger(Number(rewardId)) || Number(rewardId) <= 0) {
      return res.status(400).json({ error: 'Invalid reward ID' });
    }
    
    // Start transaction
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    
    // Check if reward exists and is available
    const rewardQuery = `
      SELECT sr.*, ur.claimed_at
      FROM streak_rewards sr
      LEFT JOIN user_rewards ur ON sr.id = ur.reward_id AND ur.user_id = $1
      WHERE sr.id = $2
    `;
    
    const rewardResult = await client.query(rewardQuery, [userId, rewardId]);
    
    if (rewardResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reward not found' });
    }
    
    if (rewardResult.rows[0].claimed_at) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Reward already claimed' });
    }
    
    // Check if user meets streak requirement
    const streakQuery = `
      SELECT current_streak
      FROM user_streaks
      WHERE user_id = $1
    `;
    const streakResult = await client.query(streakQuery, [userId]);
    
    if (streakResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User streak record not found' });
    }
    
    const currentStreak = streakResult.rows[0].current_streak;
    
    if (currentStreak < rewardResult.rows[0].required_streak) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Insufficient streak to claim reward',
        requiredStreak: rewardResult.rows[0].required_streak,
        currentStreak: currentStreak
      });
    }
    
    // Claim reward
    const claimQuery = `
      INSERT INTO user_rewards (user_id, reward_id, claimed_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const result = await client.query(claimQuery, [userId, rewardId]);
    
    // Apply reward effects based on reward type
    const rewardType = rewardResult.rows[0].reward_type;
    const rewardValue = rewardResult.rows[0].reward_value;
    
    switch (rewardType) {
      case 'streak_freeze':
        // Check existing streak freezes limit (max 3)
        const freezeCountQuery = `
          SELECT COUNT(*) as count
          FROM streak_freezes
          WHERE user_id = $1 AND used_at IS NULL
        `;
        const freezeCount = await client.query(freezeCountQuery, [userId]);
        
        if (parseInt(freezeCount.rows[0].count) >= 3) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Maximum streak freezes limit reached (3)' });
        }
        
        const freezeQuery = `
          INSERT INTO streak_freezes (user_id, duration_days, created_at, expires_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days')
          RETURNING *
        `;
        const freezeResult = await client.query(freezeQuery, [userId, rewardValue]);
        
        await client.query('COMMIT');
        return res.json({
          claimed: result.rows[0],
          reward: rewardResult.rows[0],
          effect: {
            type: 'streak_freeze',
            details: freezeResult.rows[0]
          }
        });
        
      case 'bonus_points':
        const pointsQuery = `
          UPDATE users 
          SET points = points + $1 
          WHERE id = $2
          RETURNING points
        `;
        const pointsResult = await client.query(pointsQuery, [rewardValue, userId]);
        
        await client.query('COMMIT');
        return res.json({
          claimed: result.rows[0],
          reward: rewardResult.rows[0],
          effect: {
            type: 'bonus_points',
            points: rewardValue,
            newTotal: pointsResult.rows[0].points
          }
        });
        
      case 'badge':
        const badgeQuery = `
          INSERT INTO user_badges (user_id, badge_id, awarded_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          RETURNING *
        `;
        const badgeResult = await client.query(badgeQuery, [userId, rewardValue]);
        
        await client.query('COMMIT');
        return res.json({
          claimed: result.rows[0],
          reward: rewardResult.rows[0],
          effect: {
            type: 'badge',
            details: badgeResult.rows[0]
          }
        });
        
      case 'theme_unlock':
        const themeQuery = `
          INSERT INTO user_themes (user_id, theme_id, unlocked_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          RETURNING *
        `;
        const themeResult = await client.query(themeQuery, [userId, rewardValue]);
        
        await client.query('COMMIT');
        return res.json({
          claimed: result.rows[0],
          reward: rewardResult.rows[0],
          effect: {
            type: 'theme_unlock',
            details: themeResult.rows[0]
          }
        });
        
      default:
        // Generic reward with no special effect
        await client.query('COMMIT');
        return res.json({
          claimed: result.rows[0],
          reward: rewardResult.rows[0]
        });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    logError('Error in claimReward:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Reward already claimed' });
    }
    
    return res.status(500).json({ 
      error: 'Failed to claim reward',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

/**
 * Use a streak freeze to prevent streak loss
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const useStreakFreeze = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { freezeId } = req.params;
    
    if (!freezeId || !Number.isInteger(Number(freezeId)) || Number(freezeId) <= 0) {
      return res.status(400).json({ error: 'Invalid freeze ID' });
    }
    
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    
    // Check if freeze exists and is available
    const freezeQuery = `
      SELECT *
      FROM streak_freezes
      WHERE id = $1 AND user_id = $2 AND used_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    `;
    
    const freezeResult = await client.query(freezeQuery, [freezeId, userId]);
    
    if (freezeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Streak freeze not found or already used' });
    }
    
    // Mark freeze as used
    const useQuery = `
      UPDATE streak_freezes
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(useQuery, [freezeId]);
    
    // Update user's last activity date to today to prevent streak loss
    const updateStreakQuery = `
      UPDATE user_streaks
      SET last_activity_date = CURRENT_DATE
      WHERE user_id = $1
      RETURNING *
    `;
    
    const streakResult = await client.query(updateStreakQuery, [userId]);
    
    await client.query('COMMIT');
    
    // Track analytics
    const analyticsQuery = `
      INSERT INTO analytics_events (user_id, event_type, event_data, created_at)
      VALUES ($1, 'STREAK_FREEZE_USED', $2, CURRENT_TIMESTAMP)
    `;
    
    const eventData = {
      freezeId: freezeId,
      streakBefore: streakResult.rows[0].current_streak
    };
    
    await pool.query(analyticsQuery, [userId, JSON.stringify(eventData)]);
    
    return res.json({
      success: true,
      freeze: result.rows[0],
      streakProtected: true,
      currentStreak: streakResult.rows[0].current_streak
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logError('Error in useStreakFreeze:', error);
    return res.status(500).json({ 
      error: 'Failed to use streak freeze',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

monitoring.start({
  metrics: ['analytics', 'performance', 'errors'],
  alertThresholds: {
    errorRate: 0.01,
    responseTime: 1000,
    memoryUsage: 0.8
  }
});

module.exports = {
  getAvailableRewards,
  getRewardHistory,
  claimReward,
  useStreakFreeze
}; 