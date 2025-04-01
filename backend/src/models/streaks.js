const db = require('../config/database');

/**
 * Streak and daily engagement model for TypeShala
 * Handles user streak tracking, daily rewards, and consistent usage patterns
 */

// Create streak tracking tables
const createStreakTables = async () => {
  try {
    // Create user streaks table
    const streaksTableQuery = `
      CREATE TABLE IF NOT EXISTS user_streaks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        currentStreak INT NOT NULL DEFAULT 0,
        longestStreak INT NOT NULL DEFAULT 0,
        lastActivityDate DATE,
        streakFreezeUsed BOOLEAN DEFAULT FALSE,
        streakFreezeCount INT DEFAULT 0,
        totalPracticeCount INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await db.query(streaksTableQuery);

    // Create daily activity log
    const activityLogQuery = `
      CREATE TABLE IF NOT EXISTS daily_activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        date DATE NOT NULL,
        practiceCount INT DEFAULT 0,
        totalTypingTime INT DEFAULT 0,
        charactersTyped INT DEFAULT 0, 
        wordsTyped INT DEFAULT 0,
        averageWPM DECIMAL(5,2) DEFAULT 0,
        averageAccuracy DECIMAL(5,2) DEFAULT 0,
        rewardsClaimed JSON,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY user_date (userId, date)
      )
    `;
    await db.query(activityLogQuery);

    // Create streak rewards table
    const streakRewardsQuery = `
      CREATE TABLE IF NOT EXISTS streak_rewards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        streakMilestone INT NOT NULL,
        rewardType VARCHAR(50) NOT NULL,
        rewardValue VARCHAR(255) NOT NULL,
        description TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.query(streakRewardsQuery);

    console.log('Streak tables created or already exist');
    return true;
  } catch (error) {
    console.error('Error creating streak tables:', error);
    return false;
  }
};

// Initialize streak data for a new user
const initializeUserStreak = async (userId) => {
  try {
    const [existing] = await db.query(
      'SELECT id FROM user_streaks WHERE userId = ?',
      [userId]
    );

    if (existing.length === 0) {
      await db.query(
        'INSERT INTO user_streaks (userId, currentStreak, longestStreak) VALUES (?, 0, 0)',
        [userId]
      );
    }
    return true;
  } catch (error) {
    console.error('Error initializing user streak:', error);
    throw error;
  }
};

// Log user activity for today
const logDailyActivity = async (userId, activityData) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have a log for today
    const [existingRows] = await db.query(
      'SELECT id, practiceCount, totalTypingTime, charactersTyped, wordsTyped FROM daily_activity_log WHERE userId = ? AND date = ?',
      [userId, today]
    );
    
    const { 
      typingTime = 0, 
      charactersTyped = 0, 
      wordsTyped = 0,
      wpm = 0,
      accuracy = 0 
    } = activityData;
    
    if (existingRows.length > 0) {
      // Update existing record
      const existingData = existingRows[0];
      const newPracticeCount = existingData.practiceCount + 1;
      const newTotalTime = existingData.totalTypingTime + typingTime;
      const newCharsTyped = existingData.charactersTyped + charactersTyped;
      const newWordsTyped = existingData.wordsTyped + wordsTyped;
      
      // Calculate new averages
      const newWPM = calculateNewAverage(
        existingData.averageWPM, 
        existingData.practiceCount, 
        wpm
      );
      
      const newAccuracy = calculateNewAverage(
        existingData.averageAccuracy,
        existingData.practiceCount,
        accuracy
      );
      
      await db.query(
        `UPDATE daily_activity_log 
         SET practiceCount = ?, totalTypingTime = ?, charactersTyped = ?, 
         wordsTyped = ?, averageWPM = ?, averageAccuracy = ?
         WHERE id = ?`,
        [
          newPracticeCount, 
          newTotalTime, 
          newCharsTyped, 
          newWordsTyped,
          newWPM,
          newAccuracy,
          existingData.id
        ]
      );
    } else {
      // Create new record for today
      await db.query(
        `INSERT INTO daily_activity_log 
         (userId, date, practiceCount, totalTypingTime, charactersTyped, wordsTyped, averageWPM, averageAccuracy) 
         VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
        [userId, today, typingTime, charactersTyped, wordsTyped, wpm, accuracy]
      );
    }
    
    // Update user streak data
    await updateUserStreak(userId);
    
    return true;
  } catch (error) {
    console.error('Error logging daily activity:', error);
    throw error;
  }
};

// Helper to calculate new average when adding a value to an existing average
const calculateNewAverage = (currentAvg, currentCount, newValue) => {
  return ((currentAvg * currentCount) + newValue) / (currentCount + 1);
};

// Update user streak based on activity
const updateUserStreak = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get user's streak info
    const [streakData] = await db.query(
      'SELECT currentStreak, longestStreak, lastActivityDate, streakFreezeUsed, streakFreezeCount FROM user_streaks WHERE userId = ?',
      [userId]
    );
    
    if (streakData.length === 0) {
      await initializeUserStreak(userId);
      return await updateUserStreak(userId);
    }
    
    const userData = streakData[0];
    let { currentStreak, longestStreak, lastActivityDate, streakFreezeUsed, streakFreezeCount } = userData;
    
    // If no previous activity, this is the first day
    if (!lastActivityDate) {
      await db.query(
        'UPDATE user_streaks SET currentStreak = 1, longestStreak = 1, lastActivityDate = ?, totalPracticeCount = totalPracticeCount + 1 WHERE userId = ?',
        [today, userId]
      );
      return { currentStreak: 1, streakUpdated: true, streakIncreased: true };
    }
    
    // Convert date strings to Date objects for comparison
    const todayDate = new Date(today);
    const lastDate = new Date(lastActivityDate);
    
    // Calculate days difference
    const timeDiff = todayDate.getTime() - lastDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    let streakUpdated = false;
    let streakIncreased = false;
    
    // Same day - no streak change
    if (daysDiff === 0) {
      await db.query(
        'UPDATE user_streaks SET totalPracticeCount = totalPracticeCount + 1 WHERE userId = ?',
        [userId]
      );
      return { currentStreak, streakUpdated, streakIncreased };
    }
    
    // Next day - increase streak
    if (daysDiff === 1) {
      currentStreak += 1;
      longestStreak = Math.max(currentStreak, longestStreak);
      streakUpdated = true;
      streakIncreased = true;
    }
    // One day missed but has streak freeze
    else if (daysDiff === 2 && streakFreezeCount > 0 && !streakFreezeUsed) {
      streakFreezeUsed = true;
      streakFreezeCount -= 1;
      streakUpdated = true;
    }
    // Streak broken
    else {
      currentStreak = 1;
      streakUpdated = true;
    }
    
    // Update database with new streak values
    await db.query(
      `UPDATE user_streaks 
       SET currentStreak = ?, longestStreak = ?, lastActivityDate = ?, 
       streakFreezeUsed = ?, streakFreezeCount = ?, totalPracticeCount = totalPracticeCount + 1 
       WHERE userId = ?`,
      [currentStreak, longestStreak, today, false, streakFreezeCount, userId]
    );
    
    return { currentStreak, streakUpdated, streakIncreased };
  } catch (error) {
    console.error('Error updating user streak:', error);
    throw error;
  }
};

// Get streak data for a user
const getUserStreakData = async (userId) => {
  try {
    // Check if user has streak data
    const [streakData] = await db.query(
      'SELECT * FROM user_streaks WHERE userId = ?',
      [userId]
    );
    
    if (streakData.length === 0) {
      await initializeUserStreak(userId);
      return await getUserStreakData(userId);
    }
    
    const userData = streakData[0];
    
    // Get recent activity
    const [recentActivity] = await db.query(
      `SELECT date, practiceCount, totalTypingTime, charactersTyped, wordsTyped, averageWPM, averageAccuracy 
       FROM daily_activity_log 
       WHERE userId = ? 
       ORDER BY date DESC 
       LIMIT 7`,
      [userId]
    );

    // Check if user is part of an experiment
    let experimentVariant = 'control';
    try {
      const [userExperiment] = await db.query(
        `SELECT e.name, ue.variant 
         FROM user_experiments ue
         JOIN experiments e ON ue.experiment_id = e.id
         WHERE ue.user_id = ?
         AND e.feature = 'streaks'
         AND e.status = 'active'
         LIMIT 1`,
        [userId]
      );
      
      if (userExperiment.length > 0) {
        experimentVariant = userExperiment[0].variant;
      }
    } catch (err) {
      console.warn('Could not fetch experiment data:', err.message);
      // Fall back to control variant
    }
    
    // Get next milestone reward based on experiment variant
    let nextReward;
    const currentStreak = userData.currentStreak;
    
    try {
      // First try to get from experiment rewards
      const experimentRewardsModule = require('./experimentRewards');
      const experimentRewards = await experimentRewardsModule.getVariantRewards('streak_rewards', experimentVariant);
      
      // Find the next milestone that's larger than the current streak
      const nextMilestones = experimentRewards
        .filter(reward => reward.milestone > currentStreak)
        .sort((a, b) => a.milestone - b.milestone);
      
      if (nextMilestones.length > 0) {
        nextReward = {
          milestone: nextMilestones[0].milestone,
          type: nextMilestones[0].reward_type,
          value: nextMilestones[0].reward_value,
          description: nextMilestones[0].description
        };
      }
    } catch (err) {
      console.warn('Could not fetch experiment rewards:', err.message);
      // Fall back to standard rewards
    }
    
    // If we couldn't get experiment rewards, fall back to standard rewards
    if (!nextReward) {
      const [rewards] = await db.query(
        `SELECT * FROM streak_rewards 
         WHERE streakMilestone > ? AND isActive = TRUE 
         ORDER BY streakMilestone ASC 
         LIMIT 1`,
        [currentStreak]
      );
      
      if (rewards.length > 0) {
        nextReward = {
          milestone: rewards[0].streakMilestone,
          type: rewards[0].rewardType,
          value: rewards[0].rewardValue,
          description: rewards[0].description
        };
      } else {
        // Default reward if no streak rewards are configured
        nextReward = {
          milestone: Math.ceil((currentStreak + 1) / 5) * 5, // Round up to next multiple of 5
          type: 'badge',
          value: 'streak_milestone',
          description: 'Streak Milestone Achievement'
        };
      }
    }
    
    return {
      currentStreak: userData.currentStreak,
      longestStreak: userData.longestStreak,
      lastActivityDate: userData.lastActivityDate,
      streakFreezeCount: userData.streakFreezeCount,
      totalPracticeCount: userData.totalPracticeCount,
      recentActivity,
      nextMilestone: nextReward.milestone,
      daysToNextMilestone: nextReward.milestone - userData.currentStreak,
      nextReward,
      experimentVariant // Include the experiment variant for tracking
    };
  } catch (error) {
    console.error('Error getting user streak data:', error);
    throw error;
  }
};

// Add a streak freeze (protection against losing streak)
const addStreakFreeze = async (userId, count = 1) => {
  try {
    await db.query(
      'UPDATE user_streaks SET streakFreezeCount = streakFreezeCount + ? WHERE userId = ?',
      [count, userId]
    );
    return true;
  } catch (error) {
    console.error('Error adding streak freeze:', error);
    throw error;
  }
};

// Claim a streak milestone reward
const claimStreakReward = async (userId, milestone) => {
  try {
    // Check if the user has reached this milestone
    const [streakData] = await db.query(
      'SELECT currentStreak FROM user_streaks WHERE userId = ? AND currentStreak >= ?',
      [userId, milestone]
    );
    
    if (streakData.length === 0) {
      throw new Error('You have not reached this streak milestone yet.');
    }
    
    // Get experiment variant
    let experimentVariant = 'control';
    let experimentName = 'streak_rewards';
    
    try {
      const [userExperiment] = await db.query(
        `SELECT e.name, ue.variant 
         FROM user_experiments ue
         JOIN experiments e ON ue.experiment_id = e.id
         WHERE ue.user_id = ?
         AND e.feature = 'streaks'
         AND e.status = 'active'
         LIMIT 1`,
        [userId]
      );
      
      if (userExperiment.length > 0) {
        experimentVariant = userExperiment[0].variant;
        experimentName = userExperiment[0].name;
      }
    } catch (err) {
      console.warn('Could not fetch experiment data:', err.message);
      // Fall back to control variant
    }
    
    // Get the reward based on experiment variant and milestone
    let rewardData;
    
    try {
      // First try to get from experiment rewards
      const experimentRewardsModule = require('./experimentRewards');
      rewardData = await experimentRewardsModule.getMilestoneReward(experimentName, experimentVariant, milestone);
    } catch (err) {
      console.warn('Could not fetch experiment reward, falling back to standard:', err.message);
    }
    
    // If no experiment reward, fall back to standard rewards
    if (!rewardData) {
      const [rewards] = await db.query(
        'SELECT * FROM streak_rewards WHERE streakMilestone = ? AND isActive = TRUE',
        [milestone]
      );
      
      if (rewards.length === 0) {
        throw new Error('No reward found for this milestone.');
      }
      
      rewardData = {
        reward_type: rewards[0].rewardType,
        reward_value: rewards[0].rewardValue,
        description: rewards[0].description
      };
    }
    
    // Check if user has already claimed this reward
    const [claimedRewards] = await db.query(
      'SELECT rewardsClaimed FROM daily_activity_log WHERE userId = ? ORDER BY date DESC LIMIT 1',
      [userId]
    );
    
    let alreadyClaimed = false;
    
    if (claimedRewards.length > 0 && claimedRewards[0].rewardsClaimed) {
      const claimed = JSON.parse(claimedRewards[0].rewardsClaimed || '[]');
      alreadyClaimed = claimed.some(r => r.milestone === milestone);
    }
    
    if (alreadyClaimed) {
      throw new Error('This reward has already been claimed.');
    }
    
    // Process special reward type for surprise rewards
    let actualReward = {
      type: rewardData.reward_type,
      value: rewardData.reward_value
    };
    
    if (rewardData.reward_type === 'surprise') {
      try {
        const experimentRewardsModule = require('./experimentRewards');
        const surpriseResult = await experimentRewardsModule.processSurpriseReward(rewardData.reward_value, userId);
        actualReward = surpriseResult.actualReward;
      } catch (err) {
        console.error('Error processing surprise reward:', err);
        actualReward = {
          type: 'points',
          value: '50', // Fallback reward
          message: 'Surprise reward processing failed, here are some points instead!'
        };
      }
    } else {
      // Process standard reward
      await processReward(userId, rewardData.reward_type, rewardData.reward_value);
    }
    
    // Record the claim
    const today = new Date().toISOString().split('T')[0];
    const [todaysActivity] = await db.query(
      'SELECT id, rewardsClaimed FROM daily_activity_log WHERE userId = ? AND date = ?',
      [userId, today]
    );
    
    const rewardClaim = {
      milestone,
      rewardType: rewardData.reward_type,
      rewardValue: rewardData.reward_value,
      claimedAt: new Date().toISOString(),
      actualReward,
      experimentVariant
    };
    
    if (todaysActivity.length > 0) {
      const existing = todaysActivity[0];
      const rewards = JSON.parse(existing.rewardsClaimed || '[]');
      rewards.push(rewardClaim);
      
      await db.query(
        'UPDATE daily_activity_log SET rewardsClaimed = ? WHERE id = ?',
        [JSON.stringify(rewards), existing.id]
      );
    } else {
      // Create activity record for today if it doesn't exist
      await db.query(
        'INSERT INTO daily_activity_log (userId, date, rewardsClaimed) VALUES (?, ?, ?)',
        [userId, today, JSON.stringify([rewardClaim])]
      );
    }
    
    // Log for analytics
    try {
      const analyticsData = {
        userId,
        milestone,
        rewardType: rewardData.reward_type,
        experimentVariant,
        actualReward
      };
      
      await db.query(
        `INSERT INTO analytics_events (user_id, event_type, event_data, timestamp)
         VALUES (?, 'streak_reward_claimed', ?, NOW())`,
        [userId, JSON.stringify(analyticsData)]
      );
    } catch (err) {
      console.warn('Failed to log analytics event:', err);
    }
    
    return {
      success: true,
      milestone,
      reward: {
        type: rewardData.reward_type,
        value: rewardData.reward_value,
        description: rewardData.description,
        actualReward
      }
    };
  } catch (error) {
    console.error('Error claiming streak reward:', error);
    throw error;
  }
};

// Process the reward based on type
const processReward = async (userId, rewardType, rewardValue) => {
  try {
    switch (rewardType) {
      case 'badge':
        // Award badge to user
        await db.query(
          `INSERT INTO user_badges (userId, badgeId, earnedAt) 
           VALUES (?, ?, NOW()) 
           ON DUPLICATE KEY UPDATE earnedAt = NOW()`,
          [userId, rewardValue]
        );
        break;
        
      case 'points':
        // Add points to user
        const points = parseInt(rewardValue, 10);
        await db.query(
          'UPDATE user_progress SET points = points + ? WHERE userId = ?',
          [points, userId]
        );
        break;
        
      case 'feature':
        if (rewardValue === 'streak_freeze') {
          // Add streak freeze
          await addStreakFreeze(userId, 1);
        } else {
          // Unlock other premium features
          await db.query(
            `INSERT INTO user_unlocked_features (userId, featureId, unlockedAt) 
             VALUES (?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE unlockedAt = NOW()`,
            [userId, rewardValue]
          );
        }
        break;
        
      default:
        console.warn(`Unhandled reward type: ${rewardType}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error processing reward:', error);
    throw error;
  }
};

// Set up initial streak rewards
const setupInitialStreakRewards = async () => {
  try {
    const rewards = [
      { milestone: 3, type: 'streak_freeze', value: '1', description: 'Streak Freeze - Protects your streak for one missed day' },
      { milestone: 5, type: 'points', value: '50', description: '50 bonus points for reaching 5-day streak' },
      { milestone: 7, type: 'theme', value: 'dark_mode_pro', description: 'Unlock Pro Dark Mode Theme' },
      { milestone: 10, type: 'badge', value: 'consistent_10', description: '10-Day Consistency Badge' },
      { milestone: 15, type: 'streak_freeze', value: '2', description: 'Two Streak Freezes' },
      { milestone: 20, type: 'badge', value: 'dedicated_learner', description: 'Dedicated Learner Badge' },
      { milestone: 30, type: 'points', value: '150', description: '150 bonus points for amazing consistency' },
      { milestone: 50, type: 'badge', value: 'typing_devotee', description: 'Typing Devotee Badge' },
      { milestone: 75, type: 'theme', value: 'premium_theme_pack', description: 'Unlock Premium Theme Pack' },
      { milestone: 100, type: 'badge', value: 'typing_master', description: 'Typing Master Badge - 100 Day Streak' },
      { milestone: 150, type: 'points', value: '500', description: '500 bonus points for incredible dedication' },
      { milestone: 200, type: 'badge', value: 'typing_legend', description: 'Typing Legend Badge' },
      { milestone: 365, type: 'badge', value: 'annual_achiever', description: 'Annual Achiever Badge - One full year!' },
    ];
    
    // Check if rewards are already set up
    const [existingRows] = await db.query('SELECT COUNT(*) as count FROM streak_rewards');
    
    if (existingRows[0].count === 0) {
      // Insert rewards
      for (const reward of rewards) {
        await db.query(
          'INSERT INTO streak_rewards (streakMilestone, rewardType, rewardValue, description) VALUES (?, ?, ?, ?)',
          [reward.milestone, reward.type, reward.value, reward.description]
        );
      }
      console.log('Initial streak rewards created');
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up initial streak rewards:', error);
    return false;
  }
};

module.exports = {
  createStreakTables,
  initializeUserStreak,
  logDailyActivity,
  updateUserStreak,
  getUserStreakData,
  addStreakFreeze,
  claimStreakReward,
  setupInitialStreakRewards
}; 