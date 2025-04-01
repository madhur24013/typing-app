const streakEnhancements = require('../models/streakEnhancements');
const streakModel = require('../models/streaks');
const db = require('../config/database');

/**
 * Controller for enhanced streak features
 * Handles streak ranks, visual effects, challenges, and social features
 */

// Get user's current streak rank and status
exports.getUserStreakRank = async (req, res) => {
  try {
    const userId = req.user.id;
    const rankData = await streakEnhancements.getUserStreakRank(userId);
    
    if (!rankData) {
      return res.status(404).json({
        success: false,
        message: 'No streak data found for this user'
      });
    }
    
    res.json({
      success: true,
      rankData
    });
  } catch (error) {
    console.error('Error getting user streak rank:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve streak rank'
    });
  }
};

// Check if user's streak is in danger
exports.checkStreakDanger = async (req, res) => {
  try {
    const userId = req.user.id;
    const dangerData = await streakEnhancements.checkStreakDanger(userId);
    
    res.json({
      success: true,
      dangerData
    });
  } catch (error) {
    console.error('Error checking streak danger:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check streak danger status'
    });
  }
};

// Get variable reward for current streak day
exports.getDailyReward = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's current streak
    const [streakData] = await db.query(
      'SELECT currentStreak FROM user_streaks WHERE userId = ?',
      [userId]
    );
    
    if (streakData.length === 0 || streakData[0].currentStreak === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active streak found'
      });
    }
    
    const currentStreak = streakData[0].currentStreak;
    
    // Check for exact day match in variable rewards
    const [exactDayReward] = await db.query(
      'SELECT * FROM streak_variable_rewards WHERE day_number = ? AND is_surprise = FALSE',
      [currentStreak]
    );
    
    if (exactDayReward.length > 0) {
      return res.json({
        success: true,
        rewardType: 'milestone',
        reward: exactDayReward[0]
      });
    }
    
    // Check for surprise rewards
    const [surpriseReward] = await db.query(
      'SELECT * FROM streak_variable_rewards WHERE day_number = ? AND is_surprise = TRUE',
      [currentStreak]
    );
    
    if (surpriseReward.length > 0) {
      // Check probability
      const probability = surpriseReward[0].probability || 1.0;
      const roll = Math.random();
      
      if (roll <= probability) {
        // For random multipliers, generate a specific value
        let rewardValue = surpriseReward[0].reward_value;
        
        if (surpriseReward[0].min_multiplier && surpriseReward[0].max_multiplier) {
          const min = surpriseReward[0].min_multiplier;
          const max = surpriseReward[0].max_multiplier;
          const multiplier = min + Math.random() * (max - min);
          rewardValue = multiplier.toFixed(1) + 'x ' + rewardValue;
        }
        
        // Log that this surprise reward was shown
        await db.query(
          `INSERT INTO streak_reward_logs (user_id, day_number, reward_id, is_surprise, shown_at)
           VALUES (?, ?, ?, TRUE, NOW())`,
          [userId, currentStreak, surpriseReward[0].id]
        );
        
        return res.json({
          success: true,
          rewardType: 'surprise',
          reward: {
            ...surpriseReward[0],
            reward_value: rewardValue
          }
        });
      }
    }
    
    // No special reward for today
    // Find the next milestone
    const [nextMilestone] = await db.query(
      'SELECT * FROM streak_variable_rewards WHERE day_number > ? AND is_surprise = FALSE ORDER BY day_number ASC LIMIT 1',
      [currentStreak]
    );
    
    let nextReward = null;
    if (nextMilestone.length > 0) {
      nextReward = {
        day_number: nextMilestone[0].day_number,
        days_remaining: nextMilestone[0].day_number - currentStreak,
        reward_type: nextMilestone[0].reward_type,
        description: nextMilestone[0].description
      };
    }
    
    res.json({
      success: true,
      rewardType: 'regular',
      streak: currentStreak,
      nextReward
    });
  } catch (error) {
    console.error('Error getting daily reward:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve daily reward'
    });
  }
};

// Get recovery challenges after losing a streak
exports.getRecoveryChallenges = async (req, res) => {
  try {
    const userId = req.user.id;
    const challenges = await streakEnhancements.getRecoveryChallenges(userId);
    
    res.json({
      success: true,
      ...challenges
    });
  } catch (error) {
    console.error('Error getting recovery challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recovery challenges'
    });
  }
};

// Complete a recovery challenge
exports.completeRecoveryChallenge = async (req, res) => {
  try {
    const userId = req.user.id;
    const { challengeId, performance } = req.body;
    
    if (!challengeId || !performance) {
      return res.status(400).json({
        success: false,
        message: 'Challenge ID and performance data are required'
      });
    }
    
    // Get challenge details
    const [challengeData] = await db.query(
      'SELECT * FROM streak_recovery_challenges WHERE id = ?',
      [challengeId]
    );
    
    if (challengeData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    const challenge = challengeData[0];
    
    // Check if user meets the challenge requirements
    let challengePassed = false;
    
    switch (challenge.challenge_type) {
      case 'wpm':
        challengePassed = performance.wpm >= challenge.target_value;
        break;
      case 'accuracy':
        challengePassed = performance.accuracy >= challenge.target_value;
        break;
      case 'word_count':
        challengePassed = performance.wordCount >= challenge.target_value;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid challenge type'
        });
    }
    
    if (!challengePassed) {
      return res.json({
        success: false,
        passed: false,
        message: 'Challenge requirements not met',
        required: challenge.target_value,
        achieved: performance[challenge.challenge_type === 'word_count' ? 'wordCount' : challenge.challenge_type]
      });
    }
    
    // Get the lost streak value
    const [streakHistory] = await db.query(
      `SELECT previous_streak FROM streak_history 
       WHERE user_id = ? AND change_type = 'reset' 
       ORDER BY changed_at DESC LIMIT 1`,
      [userId]
    );
    
    if (streakHistory.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No streak reset history found'
      });
    }
    
    const lostStreak = streakHistory[0].previous_streak;
    
    // Restore the streak (possibly with a small penalty)
    let restoredStreak = lostStreak;
    if (challenge.difficulty === 'medium') {
      // 5% penalty for medium difficulty
      restoredStreak = Math.floor(lostStreak * 0.95);
    } else if (challenge.difficulty === 'easy') {
      // 10% penalty for easy difficulty
      restoredStreak = Math.floor(lostStreak * 0.9);
    }
    
    // Ensure minimum 1 day streak
    restoredStreak = Math.max(1, restoredStreak);
    
    // Update the streak
    await streakModel.updateUserStreak(userId, {
      currentStreak: restoredStreak,
      lastActivityDate: new Date()
    });
    
    // Log the restoration
    await db.query(
      `INSERT INTO streak_history (user_id, previous_streak, new_streak, change_type, change_reason, changed_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, 0, restoredStreak, 'recovery', `Recovery challenge: ${challenge.description}`]
    );
    
    // Apply XP cost if any
    if (challenge.xp_cost > 0) {
      await db.query(
        `UPDATE users SET xp = GREATEST(0, xp - ?) WHERE id = ?`,
        [challenge.xp_cost, userId]
      );
    }
    
    res.json({
      success: true,
      passed: true,
      restoredStreak,
      originalStreak: lostStreak,
      xpCost: challenge.xp_cost
    });
  } catch (error) {
    console.error('Error completing recovery challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process challenge completion'
    });
  }
};

// Create a streak battle challenge
exports.createStreakBattle = async (req, res) => {
  try {
    const challengerId = req.user.id;
    const { opponentId, durationDays = 7 } = req.body;
    
    if (!opponentId) {
      return res.status(400).json({
        success: false,
        message: 'Opponent ID is required'
      });
    }
    
    // Validate opponent exists
    const [opponentData] = await db.query(
      'SELECT id, username FROM users WHERE id = ?',
      [opponentId]
    );
    
    if (opponentData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Opponent not found'
      });
    }
    
    // Check if there's an active battle between these users
    const [existingBattle] = await db.query(
      `SELECT * FROM streak_battles 
       WHERE ((challenger_id = ? AND opponent_id = ?) OR (challenger_id = ? AND opponent_id = ?))
       AND status IN ('pending', 'active')`,
      [challengerId, opponentId, opponentId, challengerId]
    );
    
    if (existingBattle.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A streak battle already exists between these users',
        battle: existingBattle[0]
      });
    }
    
    // Calculate start and end dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    
    // Create the battle
    const [result] = await db.query(
      `INSERT INTO streak_battles (challenger_id, opponent_id, start_date, end_date, status, xp_reward, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, NOW())`,
      [challengerId, opponentId, startDate, endDate, durationDays * 20] // 20 XP per day of the challenge
    );
    
    const battleId = result.insertId;
    
    // Get battle details
    const [battleData] = await db.query(
      `SELECT sb.*, 
        u1.username as challenger_name, 
        u2.username as opponent_name
       FROM streak_battles sb
       JOIN users u1 ON sb.challenger_id = u1.id
       JOIN users u2 ON sb.opponent_id = u2.id
       WHERE sb.id = ?`,
      [battleId]
    );
    
    res.json({
      success: true,
      message: 'Streak battle created successfully',
      battle: battleData[0]
    });
  } catch (error) {
    console.error('Error creating streak battle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create streak battle'
    });
  }
};

// Accept a streak battle challenge
exports.respondToStreakBattle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { battleId, accept } = req.body;
    
    if (!battleId) {
      return res.status(400).json({
        success: false,
        message: 'Battle ID is required'
      });
    }
    
    // Validate battle exists and user is the opponent
    const [battleData] = await db.query(
      'SELECT * FROM streak_battles WHERE id = ? AND opponent_id = ? AND status = "pending"',
      [battleId, userId]
    );
    
    if (battleData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Streak battle not found or you are not authorized to respond'
      });
    }
    
    if (accept) {
      // Accept the challenge
      await db.query(
        'UPDATE streak_battles SET status = "active" WHERE id = ?',
        [battleId]
      );
      
      res.json({
        success: true,
        message: 'Streak battle accepted',
        battleId
      });
    } else {
      // Decline the challenge
      await db.query(
        'UPDATE streak_battles SET status = "canceled" WHERE id = ?',
        [battleId]
      );
      
      res.json({
        success: true,
        message: 'Streak battle declined',
        battleId
      });
    }
  } catch (error) {
    console.error('Error responding to streak battle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to streak battle'
    });
  }
};

// Get active streak battles for a user
exports.getUserStreakBattles = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get battles where user is challenger or opponent
    const [battles] = await db.query(
      `SELECT sb.*, 
        u1.username as challenger_name, 
        u2.username as opponent_name,
        us1.currentStreak as challenger_streak,
        us2.currentStreak as opponent_streak
       FROM streak_battles sb
       JOIN users u1 ON sb.challenger_id = u1.id
       JOIN users u2 ON sb.opponent_id = u2.id
       LEFT JOIN user_streaks us1 ON sb.challenger_id = us1.userId
       LEFT JOIN user_streaks us2 ON sb.opponent_id = us2.userId
       WHERE (sb.challenger_id = ? OR sb.opponent_id = ?)
       AND sb.status IN ('pending', 'active')
       ORDER BY sb.created_at DESC`,
      [userId, userId]
    );
    
    res.json({
      success: true,
      battles
    });
  } catch (error) {
    console.error('Error getting user streak battles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve streak battles'
    });
  }
};

// Initialize system
exports.initializeSystem = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Administrator access required'
      });
    }
    
    const result = await streakEnhancements.initializeEnhancedStreakFeatures();
    
    if (result) {
      res.json({
        success: true,
        message: 'Enhanced streak system initialized successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error initializing enhanced streak system'
      });
    }
  } catch (error) {
    console.error('Error initializing streak system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize streak system'
    });
  }
}; 