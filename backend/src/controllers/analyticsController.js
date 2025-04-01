const db = require('../config/database');
const { pool } = require('../config/database');
const { logError, logInfo } = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');

/**
 * Track a streak-related event
 * @param {number} userId - User ID
 * @param {string} eventType - Type of event (view, claim_reward, use_freeze, etc)
 * @param {Object} eventData - Additional data about the event
 */
exports.trackStreakEvent = async (req, res) => {
  try {
    const { userId, eventType, eventData } = req.body;
    
    if (!userId || !eventType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: userId and eventType are required'
      });
    }
    
    const result = await db.query(
      `INSERT INTO analytics_events (user_id, event_type, event_data, timestamp)
       VALUES (?, ?, ?, NOW())`,
      [userId, eventType, JSON.stringify(eventData || {})]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking streak event:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: error.message
    });
  }
};

/**
 * Get streak engagement metrics for all users
 * @param {string} timeframe - Time period to analyze (day, week, month)
 */
exports.getStreakEngagementMetrics = async (req, res) => {
  try {
    const { timeframe = 'week' } = req.query;
    let timeConstraint;
    
    switch (timeframe) {
      case 'day':
        timeConstraint = 'AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
        break;
      case 'week':
        timeConstraint = 'AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
        break;
      case 'month':
        timeConstraint = 'AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        break;
      default:
        timeConstraint = 'AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
    }
    
    // Get active users with streaks
    const [activeUsersResult] = await db.query(
      `SELECT COUNT(DISTINCT user_id) as active_users
       FROM user_streaks 
       WHERE current_streak > 0 
       AND last_activity_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)`
    );
    
    // Get event distribution
    const [eventsResult] = await db.query(
      `SELECT event_type, COUNT(*) as count
       FROM analytics_events
       WHERE event_type LIKE 'streak_%'
       ${timeConstraint}
       GROUP BY event_type
       ORDER BY count DESC`
    );
    
    // Get streak retention impact
    const [retentionResult] = await db.query(
      `SELECT 
         AVG(
           CASE 
             WHEN us.current_streak >= 7 THEN 
               (SELECT COUNT(*) FROM typing_sessions 
                WHERE user_id = us.user_id 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))
             ELSE 0
           END
         ) as avg_sessions_with_streak,
         AVG(
           CASE 
             WHEN us.current_streak = 0 THEN 
               (SELECT COUNT(*) FROM typing_sessions 
                WHERE user_id = us.user_id 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))
             ELSE 0
           END
         ) as avg_sessions_no_streak
       FROM user_streaks us`
    );
    
    // Get reward claim effectiveness
    const [rewardsResult] = await db.query(
      `SELECT 
         r.reward_type,
         COUNT(uc.id) as times_claimed,
         AVG(us.current_streak) as avg_streak_length
       FROM streak_rewards r
       JOIN user_claimed_rewards uc ON r.id = uc.reward_id
       JOIN user_streaks us ON uc.user_id = us.user_id
       WHERE uc.claimed_at ${timeConstraint.replace('timestamp', 'uc.claimed_at')}
       GROUP BY r.reward_type
       ORDER BY times_claimed DESC`
    );
    
    // Get A/B test results if any experiments are running
    const [experimentResults] = await db.query(
      `SELECT 
         e.name,
         e.variant,
         COUNT(DISTINCT ae.user_id) as users,
         AVG(us.current_streak) as avg_streak
       FROM experiments e
       JOIN user_experiments ue ON e.id = ue.experiment_id
       JOIN analytics_events ae ON ue.user_id = ae.user_id
       JOIN user_streaks us ON ae.user_id = us.user_id
       WHERE e.feature = 'streaks'
       AND e.status = 'active'
       GROUP BY e.name, e.variant
       ORDER BY e.name, avg_streak DESC`
    );
    
    return res.status(200).json({
      success: true,
      metrics: {
        activeUsers: activeUsersResult[0]?.active_users || 0,
        eventDistribution: eventsResult,
        retentionImpact: {
          avgSessionsWithStreak: retentionResult[0]?.avg_sessions_with_streak || 0,
          avgSessionsNoStreak: retentionResult[0]?.avg_sessions_no_streak || 0,
          retentionLift: retentionResult[0]?.avg_sessions_with_streak > 0 && retentionResult[0]?.avg_sessions_no_streak > 0 
            ? ((retentionResult[0].avg_sessions_with_streak / retentionResult[0].avg_sessions_no_streak) - 1) * 100 
            : 0
        },
        rewardEffectiveness: rewardsResult,
        experiments: experimentResults
      }
    });
  } catch (error) {
    console.error('Error fetching streak engagement metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch streak engagement metrics',
      error: error.message
    });
  }
};

/**
 * Create analytics tables if they don't exist
 */
exports.initializeAnalyticsTables = async () => {
  try {
    // Create analytics_events table
    await db.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSON,
        timestamp DATETIME NOT NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_event_type (event_type),
        INDEX idx_timestamp (timestamp)
      )
    `);
    
    // Create experiments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS experiments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        feature VARCHAR(50) NOT NULL,
        variant VARCHAR(50) NOT NULL,
        description TEXT,
        status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
        start_date DATETIME,
        end_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_experiment_variant (name, variant)
      )
    `);
    
    // Create user_experiments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_experiments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        experiment_id INT NOT NULL,
        variant VARCHAR(50) NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_user_experiment (user_id, experiment_id)
      )
    `);
    
    console.log('Analytics tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing analytics tables:', error);
    throw error;
  }
};

/**
 * Get user's current A/B test variant for streak rewards
 * @param {number} userId - User ID
 */
exports.getUserExperimentVariant = async (req, res) => {
  try {
    const { userId, feature } = req.query;
    
    if (!userId || !feature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId and feature are required'
      });
    }
    
    // Check if user is already assigned to an experiment for this feature
    const [existingAssignment] = await db.query(
      `SELECT e.name, ue.variant
       FROM user_experiments ue
       JOIN experiments e ON ue.experiment_id = e.id
       WHERE ue.user_id = ?
       AND e.feature = ?
       AND e.status = 'active'`,
      [userId, feature]
    );
    
    if (existingAssignment.length > 0) {
      return res.status(200).json({
        success: true,
        experiment: existingAssignment[0].name,
        variant: existingAssignment[0].variant
      });
    }
    
    // Get active experiments for this feature
    const [activeExperiments] = await db.query(
      `SELECT id, name, variant
       FROM experiments
       WHERE feature = ?
       AND status = 'active'`,
      [feature]
    );
    
    if (activeExperiments.length === 0) {
      return res.status(200).json({
        success: true,
        experiment: null,
        variant: 'control'  // Default variant if no experiments are active
      });
    }
    
    // Group experiments by name to pick one randomly
    const experimentsByName = {};
    activeExperiments.forEach(exp => {
      if (!experimentsByName[exp.name]) {
        experimentsByName[exp.name] = [];
      }
      experimentsByName[exp.name].push(exp);
    });
    
    // Pick a random experiment name
    const experimentNames = Object.keys(experimentsByName);
    const selectedExperimentName = experimentNames[Math.floor(Math.random() * experimentNames.length)];
    
    // Pick a random variant from the selected experiment
    const variants = experimentsByName[selectedExperimentName];
    const selectedVariant = variants[Math.floor(Math.random() * variants.length)];
    
    // Assign user to the selected variant
    await db.query(
      `INSERT INTO user_experiments (user_id, experiment_id, variant)
       VALUES (?, ?, ?)`,
      [userId, selectedVariant.id, selectedVariant.variant]
    );
    
    return res.status(200).json({
      success: true,
      experiment: selectedVariant.name,
      variant: selectedVariant.variant
    });
  } catch (error) {
    console.error('Error getting user experiment variant:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user experiment variant',
      error: error.message
    });
  }
};

const getStreakAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's streak statistics
    const streakStatsQuery = `
      SELECT 
        us.current_streak,
        us.longest_streak,
        COUNT(DISTINCT dal.activity_date) as total_activities,
        COUNT(DISTINCT CASE WHEN dal.activity_date >= CURRENT_DATE - INTERVAL '7 days' THEN dal.activity_date END) as recent_activities
      FROM user_streaks us
      LEFT JOIN daily_activity_logs dal ON us.user_id = dal.user_id
      WHERE us.user_id = $1
      GROUP BY us.current_streak, us.longest_streak
    `;
    
    const streakStats = await pool.query(streakStatsQuery, [userId]);
    
    // Get battle statistics
    const battleStatsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_battles,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_battles,
        COUNT(*) FILTER (WHERE status = 'won') as won_battles
      FROM streak_battles
      WHERE challenger_id = $1 OR opponent_id = $1
    `;
    
    const battleStats = await pool.query(battleStatsQuery, [userId]);
    
    // Get team statistics
    const teamStatsQuery = `
      SELECT 
        COUNT(DISTINCT ts.id) as total_teams,
        COUNT(DISTINCT CASE WHEN ts.leader_id = $1 THEN ts.id END) as led_teams,
        AVG(ts.current_streak) as avg_team_streak
      FROM team_streaks ts
      JOIN team_members tm ON ts.id = tm.team_id
      WHERE tm.user_id = $1
    `;
    
    const teamStats = await pool.query(teamStatsQuery, [userId]);
    
    // Get activity distribution
    const activityQuery = `
      SELECT 
        activity_type,
        COUNT(*) as count
      FROM daily_activity_logs
      WHERE user_id = $1
      AND activity_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY activity_type
      ORDER BY count DESC
    `;
    
    const activityStats = await pool.query(activityQuery, [userId]);
    
    // Get streak milestones
    const milestonesQuery = `
      SELECT 
        milestone_type,
        COUNT(*) as count,
        MAX(achieved_at) as last_achieved
      FROM streak_milestones
      WHERE user_id = $1
      GROUP BY milestone_type
      ORDER BY count DESC
    `;
    
    const milestoneStats = await pool.query(milestonesQuery, [userId]);
    
    res.json({
      streak: streakStats.rows[0] || {
        current_streak: 0,
        longest_streak: 0,
        total_activities: 0,
        recent_activities: 0
      },
      battles: battleStats.rows[0] || {
        active_battles: 0,
        completed_battles: 0,
        won_battles: 0
      },
      teams: teamStats.rows[0] || {
        total_teams: 0,
        led_teams: 0,
        avg_team_streak: 0
      },
      activity: activityStats.rows,
      milestones: milestoneStats.rows
    });
  } catch (error) {
    logError('Error in getStreakAnalytics:', error);
    res.status(500).json({ error: 'Failed to fetch streak analytics' });
  }
};

class AnalyticsController {
  /**
   * Get user's streak heatmap data
   */
  async getStreakHeatmap(req, res, next) {
    try {
      const userId = req.user.id;
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as activity_count,
          MAX(wpm) as max_wpm,
          AVG(accuracy) as avg_accuracy
        FROM typing_sessions
        WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '365 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const result = await pool.query(query, [userId]);
      res.json(result.rows);
    } catch (error) {
      next(new AppError('Failed to fetch streak heatmap', 500, error));
    }
  }

  /**
   * Get streak consistency data
   */
  async getStreakConsistency(req, res, next) {
    try {
      const userId = req.user.id;
      const query = `
        WITH daily_streaks AS (
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as sessions,
            MAX(wpm) as max_wpm,
            AVG(accuracy) as avg_accuracy
          FROM typing_sessions
          WHERE user_id = $1
          GROUP BY DATE(created_at)
        )
        SELECT 
          date,
          sessions,
          max_wpm,
          avg_accuracy,
          COUNT(*) OVER (ORDER BY date DESC) as streak_length
        FROM daily_streaks
        ORDER BY date DESC
      `;

      const result = await pool.query(query, [userId]);
      res.json(result.rows);
    } catch (error) {
      next(new AppError('Failed to fetch streak consistency', 500, error));
    }
  }

  /**
   * Get performance trends (WPM & accuracy)
   */
  async getPerformanceTrends(req, res, next) {
    try {
      const userId = req.user.id;
      const query = `
        SELECT 
          DATE(created_at) as date,
          AVG(wpm) as wpm,
          AVG(accuracy) as accuracy
        FROM typing_sessions
        WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      const result = await pool.query(query, [userId]);
      res.json(result.rows);
    } catch (error) {
      next(new AppError('Failed to fetch performance trends', 500, error));
    }
  }

  /**
   * Get personal bests and records
   */
  async getPersonalBests(req, res, next) {
    try {
      const userId = req.user.id;
      const query = `
        WITH streak_data AS (
          SELECT 
            COUNT(*) as streak_length
          FROM typing_sessions
          WHERE user_id = $1
          GROUP BY DATE(created_at)
        ),
        performance_data AS (
          SELECT 
            MAX(wpm) as best_wpm,
            MAX(accuracy) as best_accuracy
          FROM typing_sessions
          WHERE user_id = $1
        )
        SELECT 
          (SELECT MAX(streak_length) FROM streak_data) as longest_streak,
          (SELECT best_wpm FROM performance_data) as best_wpm,
          (SELECT best_accuracy FROM performance_data) as best_accuracy
      `;

      const result = await pool.query(query, [userId]);
      res.json(result.rows[0]);
    } catch (error) {
      next(new AppError('Failed to fetch personal bests', 500, error));
    }
  }

  /**
   * Get daily improvement score
   */
  async getDailyImprovement(req, res, next) {
    try {
      const userId = req.user.id;
      const query = `
        WITH daily_stats AS (
          SELECT 
            DATE(created_at) as date,
            AVG(wpm) as avg_wpm,
            AVG(accuracy) as avg_accuracy
          FROM typing_sessions
          WHERE user_id = $1
          AND created_at >= NOW() - INTERVAL '7 days'
          GROUP BY DATE(created_at)
        )
        SELECT 
          date,
          avg_wpm,
          avg_accuracy,
          LAG(avg_wpm) OVER (ORDER BY date) as prev_wpm,
          LAG(avg_accuracy) OVER (ORDER BY date) as prev_accuracy
        FROM daily_stats
        ORDER BY date DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [userId]);
      const today = result.rows[0];
      
      const improvement = {
        wpm: today.prev_wpm ? ((today.avg_wpm - today.prev_wpm) / today.prev_wpm) * 100 : 0,
        accuracy: today.prev_accuracy ? ((today.avg_accuracy - today.prev_accuracy) / today.prev_accuracy) * 100 : 0
      };

      res.json(improvement);
    } catch (error) {
      next(new AppError('Failed to fetch daily improvement', 500, error));
    }
  }

  /**
   * Get milestone progress
   */
  async getMilestoneProgress(req, res, next) {
    try {
      const userId = req.user.id;
      const query = `
        WITH streak_data AS (
          SELECT 
            COUNT(*) as streak_length
          FROM typing_sessions
          WHERE user_id = $1
          GROUP BY DATE(created_at)
        )
        SELECT 
          milestone,
          progress,
          days_until
        FROM (
          SELECT 
            CASE 
              WHEN streak_length >= 100 THEN '100 Days'
              WHEN streak_length >= 50 THEN '50 Days'
              WHEN streak_length >= 30 THEN '30 Days'
              WHEN streak_length >= 7 THEN '7 Days'
              ELSE 'First Week'
            END as milestone,
            CASE 
              WHEN streak_length >= 100 THEN 100
              WHEN streak_length >= 50 THEN (streak_length / 50) * 100
              WHEN streak_length >= 30 THEN (streak_length / 30) * 100
              WHEN streak_length >= 7 THEN (streak_length / 7) * 100
              ELSE (streak_length / 7) * 100
            END as progress,
            CASE 
              WHEN streak_length < 100 THEN 100 - streak_length
              WHEN streak_length < 50 THEN 50 - streak_length
              WHEN streak_length < 30 THEN 30 - streak_length
              WHEN streak_length < 7 THEN 7 - streak_length
              ELSE 0
            END as days_until
          FROM streak_data
        ) milestones
        ORDER BY days_until ASC
      `;

      const result = await pool.query(query, [userId]);
      res.json(result.rows);
    } catch (error) {
      next(new AppError('Failed to fetch milestone progress', 500, error));
    }
  }

  /**
   * Get streak stamina rating
   */
  async getStaminaRating(req, res, next) {
    try {
      const userId = req.user.id;
      const query = `
        WITH streak_data AS (
          SELECT 
            COUNT(*) as streak_length,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_streaks
          FROM typing_sessions
          WHERE user_id = $1
          GROUP BY DATE(created_at)
        )
        SELECT 
          CASE 
            WHEN MAX(streak_length) >= 100 AND MAX(recent_streaks) >= 30 THEN 'Legendary'
            WHEN MAX(streak_length) >= 50 AND MAX(recent_streaks) >= 20 THEN 'Diamond'
            WHEN MAX(streak_length) >= 30 AND MAX(recent_streaks) >= 15 THEN 'Gold'
            WHEN MAX(streak_length) >= 15 AND MAX(recent_streaks) >= 10 THEN 'Silver'
            ELSE 'Bronze'
          END as rating,
          CASE 
            WHEN MAX(streak_length) >= 100 AND MAX(recent_streaks) >= 30 THEN 'Unstoppable typing machine!'
            WHEN MAX(streak_length) >= 50 AND MAX(recent_streaks) >= 20 THEN 'Incredible dedication!'
            WHEN MAX(streak_length) >= 30 AND MAX(recent_streaks) >= 15 THEN 'Great consistency!'
            WHEN MAX(streak_length) >= 15 AND MAX(recent_streaks) >= 10 THEN 'Keep it up!'
            ELSE 'Just getting started!'
          END as description
        FROM streak_data
      `;

      const result = await pool.query(query, [userId]);
      res.json(result.rows[0]);
    } catch (error) {
      next(new AppError('Failed to fetch stamina rating', 500, error));
    }
  }

  /**
   * Get upcoming rewards
   */
  async getUpcomingRewards(req, res, next) {
    try {
      const userId = req.user.id;
      const query = `
        WITH streak_data AS (
          SELECT 
            COUNT(*) as streak_length
          FROM typing_sessions
          WHERE user_id = $1
          GROUP BY DATE(created_at)
        )
        SELECT 
          milestone,
          reward,
          days_until
        FROM (
          SELECT 
            CASE 
              WHEN streak_length < 100 THEN '100 Day Streak'
              WHEN streak_length < 50 THEN '50 Day Streak'
              WHEN streak_length < 30 THEN '30 Day Streak'
              WHEN streak_length < 7 THEN '7 Day Streak'
              ELSE NULL
            END as milestone,
            CASE 
              WHEN streak_length < 100 THEN 'Special Profile Badge + 1000 XP'
              WHEN streak_length < 50 THEN 'Exclusive Theme + 500 XP'
              WHEN streak_length < 30 THEN 'Custom Cursor + 300 XP'
              WHEN streak_length < 7 THEN '100 XP'
              ELSE NULL
            END as reward,
            CASE 
              WHEN streak_length < 100 THEN 100 - streak_length
              WHEN streak_length < 50 THEN 50 - streak_length
              WHEN streak_length < 30 THEN 30 - streak_length
              WHEN streak_length < 7 THEN 7 - streak_length
              ELSE NULL
            END as days_until
          FROM streak_data
        ) rewards
        WHERE milestone IS NOT NULL
        ORDER BY days_until ASC
      `;

      const result = await pool.query(query, [userId]);
      res.json(result.rows);
    } catch (error) {
      next(new AppError('Failed to fetch upcoming rewards', 500, error));
    }
  }

  /**
   * Get competitive rankings
   */
  async getCompetitiveRankings(req, res, next) {
    try {
      const userId = req.user.id;
      const query = `
        WITH user_rankings AS (
          SELECT 
            user_id,
            COUNT(*) as streak_count,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank,
            PERCENT_RANK() OVER (ORDER BY COUNT(*)) * 100 as percentile
          FROM typing_sessions
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY user_id
        )
        SELECT 
          rank as user_rank,
          percentile,
          streak_count
        FROM user_rankings
        WHERE user_id = $1
      `;

      const result = await pool.query(query, [userId]);
      res.json(result.rows[0]);
    } catch (error) {
      next(new AppError('Failed to fetch competitive rankings', 500, error));
    }
  }

  /**
   * Get friend comparisons
   */
  async getFriendComparisons(req, res, next) {
    try {
      const userId = req.user.id;
      const query = `
        WITH user_streaks AS (
          SELECT 
            user_id,
            COUNT(*) as streak_count
          FROM typing_sessions
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY user_id
        ),
        friend_streaks AS (
          SELECT 
            f.friend_id,
            u.name,
            u.avatar,
            COALESCE(us.streak_count, 0) as streak_count
          FROM friendships f
          JOIN users u ON u.id = f.friend_id
          LEFT JOIN user_streaks us ON us.user_id = f.friend_id
          WHERE f.user_id = $1
          AND f.status = 'accepted'
        )
        SELECT 
          name,
          avatar,
          streak_count - (SELECT streak_count FROM user_streaks WHERE user_id = $1) as difference,
          CASE 
            WHEN streak_count > (SELECT streak_count FROM user_streaks WHERE user_id = $1) THEN true
            ELSE false
          END as ahead
        FROM friend_streaks
        ORDER BY ABS(difference) DESC
        LIMIT 5
      `;

      const result = await pool.query(query, [userId]);
      res.json(result.rows);
    } catch (error) {
      next(new AppError('Failed to fetch friend comparisons', 500, error));
    }
  }

  /**
   * Track user action for analytics
   */
  async trackAction(req, res, next) {
    try {
      const userId = req.user.id;
      const { action, metadata } = req.body;

      const query = `
        INSERT INTO analytics_events (user_id, action, metadata)
        VALUES ($1, $2, $3)
      `;

      await pool.query(query, [userId, action, metadata]);
      res.status(201).json({ success: true });
    } catch (error) {
      next(new AppError('Failed to track action', 500, error));
    }
  }
}

module.exports = new AnalyticsController(); 