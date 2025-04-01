const db = require('../config/database');

/**
 * Enhanced streak system inspired by Snapchat and Duolingo
 * Implements variable rewards, streak ranks, FOMO mechanics, and social features
 */

// Create enhanced streak tables
const createEnhancedStreakTables = async () => {
  try {
    // Create streak ranks table
    await db.query(`
      CREATE TABLE IF NOT EXISTS streak_ranks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        min_streak INT NOT NULL,
        color VARCHAR(20) NOT NULL,
        effect_name VARCHAR(50),
        icon_path VARCHAR(255),
        border_effect VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create streak visual effects table
    await db.query(`
      CREATE TABLE IF NOT EXISTS streak_visual_effects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        effect_type VARCHAR(50) NOT NULL,
        effect_value VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create streak battles table
    await db.query(`
      CREATE TABLE IF NOT EXISTS streak_battles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challenger_id INT NOT NULL,
        opponent_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('pending', 'active', 'completed', 'canceled') DEFAULT 'pending',
        winner_id INT,
        xp_reward INT DEFAULT 100,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (challenger_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (opponent_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create team streaks table
    await db.query(`
      CREATE TABLE IF NOT EXISTS streak_teams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_name VARCHAR(100) NOT NULL,
        created_by INT NOT NULL,
        team_streak INT DEFAULT 0,
        highest_streak INT DEFAULT 0,
        member_count INT DEFAULT 1,
        active_until DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create team members table
    await db.query(`
      CREATE TABLE IF NOT EXISTS streak_team_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity_date DATE,
        contribution_count INT DEFAULT 0,
        FOREIGN KEY (team_id) REFERENCES streak_teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY team_user (team_id, user_id)
      )
    `);

    // Create variable rewards table
    await db.query(`
      CREATE TABLE IF NOT EXISTS streak_variable_rewards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        day_number INT NOT NULL,
        is_surprise BOOLEAN DEFAULT FALSE,
        min_multiplier DECIMAL(3,1) DEFAULT 1.0,
        max_multiplier DECIMAL(3,1) DEFAULT 1.0,
        reward_type VARCHAR(50) NOT NULL,
        reward_value VARCHAR(100) NOT NULL,
        probability DECIMAL(5,4) DEFAULT 1.0000,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create streak recovery challenges table
    await db.query(`
      CREATE TABLE IF NOT EXISTS streak_recovery_challenges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challenge_type VARCHAR(50) NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        target_value INT NOT NULL,
        time_limit INT, // in seconds, NULL means no time limit
        xp_cost INT DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Enhanced streak tables created successfully');
    return true;
  } catch (error) {
    console.error('Error creating enhanced streak tables:', error);
    return false;
  }
};

// Initialize default streak ranks
const initializeStreakRanks = async () => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) as count FROM streak_ranks');
    
    if (rows[0].count === 0) {
      const ranks = [
        { name: 'Bronze', min_streak: 3, color: '#CD7F32', effect_name: 'flame_small', icon_path: '/assets/ranks/bronze.svg', border_effect: 'glow_bronze' },
        { name: 'Silver', min_streak: 10, color: '#C0C0C0', effect_name: 'flame_medium', icon_path: '/assets/ranks/silver.svg', border_effect: 'glow_silver' },
        { name: 'Gold', min_streak: 30, color: '#FFD700', effect_name: 'flame_large', icon_path: '/assets/ranks/gold.svg', border_effect: 'glow_gold' },
        { name: 'Diamond', min_streak: 100, color: '#B9F2FF', effect_name: 'flame_diamond', icon_path: '/assets/ranks/diamond.svg', border_effect: 'sparkle_diamond' },
        { name: 'Legendary', min_streak: 365, color: '#FF4500', effect_name: 'flame_legendary', icon_path: '/assets/ranks/legendary.svg', border_effect: 'aura_legendary' }
      ];
      
      for (const rank of ranks) {
        await db.query(
          'INSERT INTO streak_ranks (name, min_streak, color, effect_name, icon_path, border_effect) VALUES (?, ?, ?, ?, ?, ?)',
          [rank.name, rank.min_streak, rank.color, rank.effect_name, rank.icon_path, rank.border_effect]
        );
      }
      
      console.log('Default streak ranks initialized');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing streak ranks:', error);
    return false;
  }
};

// Initialize variable rewards
const initializeVariableRewards = async () => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) as count FROM streak_variable_rewards');
    
    if (rows[0].count === 0) {
      // Regular milestone rewards
      const regularRewards = [
        { day_number: 5, is_surprise: false, reward_type: 'xp', reward_value: '50', description: '50 XP Bonus' },
        { day_number: 10, is_surprise: false, reward_type: 'streak_freeze', reward_value: '1', description: 'Streak Freeze Protection' },
        { day_number: 15, is_surprise: false, reward_type: 'theme', reward_value: 'dark_flame', description: 'Dark Flame Theme' },
        { day_number: 30, is_surprise: false, reward_type: 'badge', reward_value: 'monthly_master', description: 'Monthly Master Badge' },
        { day_number: 50, is_surprise: false, reward_type: 'animation', reward_value: 'fire_trail', description: 'Fire Trail Cursor Effect' },
        { day_number: 100, is_surprise: false, reward_type: 'profile_frame', reward_value: 'century_frame', description: 'Century Streak Frame' }
      ];
      
      // Surprise rewards (rare, exciting, unexpected)
      const surpriseRewards = [
        { day_number: 7, is_surprise: true, min_multiplier: 2.0, max_multiplier: 2.0, reward_type: 'xp_multiplier', reward_value: '24h', probability: 0.7, description: '2x XP for 24 hours' },
        { day_number: 13, is_surprise: true, reward_type: 'badge', reward_value: 'lucky_13', probability: 0.5, description: 'Lucky 13 Badge' },
        { day_number: 20, is_surprise: true, min_multiplier: 1.5, max_multiplier: 3.0, reward_type: 'xp_multiplier', reward_value: '12h', probability: 0.6, description: 'Random XP Multiplier (1.5-3x) for 12 hours' },
        { day_number: 42, is_surprise: true, reward_type: 'theme', reward_value: 'galaxy_theme', probability: 0.8, description: 'Exclusive Galaxy Theme' },
        { day_number: 69, is_surprise: true, reward_type: 'badge', reward_value: 'nice', probability: 1.0, description: 'Nice! Badge' },
        { day_number: 99, is_surprise: true, reward_type: 'streak_freeze', reward_value: '3', probability: 0.9, description: '3 Streak Freezes (Tomorrow is a big day!)' }
      ];
      
      // Insert regular rewards
      for (const reward of regularRewards) {
        await db.query(
          'INSERT INTO streak_variable_rewards (day_number, is_surprise, reward_type, reward_value, probability, description) VALUES (?, ?, ?, ?, ?, ?)',
          [reward.day_number, reward.is_surprise, reward.reward_type, reward.reward_value, 1.0, reward.description]
        );
      }
      
      // Insert surprise rewards
      for (const reward of surpriseRewards) {
        await db.query(
          'INSERT INTO streak_variable_rewards (day_number, is_surprise, min_multiplier, max_multiplier, reward_type, reward_value, probability, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            reward.day_number, 
            reward.is_surprise, 
            reward.min_multiplier || 1.0, 
            reward.max_multiplier || 1.0, 
            reward.reward_type, 
            reward.reward_value, 
            reward.probability, 
            reward.description
          ]
        );
      }
      
      console.log('Variable rewards initialized');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing variable rewards:', error);
    return false;
  }
};

// Initialize recovery challenges
const initializeRecoveryChallenges = async () => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) as count FROM streak_recovery_challenges');
    
    if (rows[0].count === 0) {
      const challenges = [
        { challenge_type: 'wpm', difficulty: 'easy', target_value: 40, time_limit: 60, xp_cost: 50, description: 'Type at 40 WPM for 1 minute' },
        { challenge_type: 'wpm', difficulty: 'medium', target_value: 60, time_limit: 60, xp_cost: 30, description: 'Type at 60 WPM for 1 minute' },
        { challenge_type: 'wpm', difficulty: 'hard', target_value: 80, time_limit: 60, xp_cost: 0, description: 'Type at 80 WPM for 1 minute' },
        
        { challenge_type: 'accuracy', difficulty: 'easy', target_value: 90, time_limit: 120, xp_cost: 50, description: 'Type with 90% accuracy for 2 minutes' },
        { challenge_type: 'accuracy', difficulty: 'medium', target_value: 95, time_limit: 120, xp_cost: 30, description: 'Type with 95% accuracy for 2 minutes' },
        { challenge_type: 'accuracy', difficulty: 'hard', target_value: 98, time_limit: 120, xp_cost: 0, description: 'Type with 98% accuracy for 2 minutes' },
        
        { challenge_type: 'word_count', difficulty: 'easy', target_value: 100, time_limit: 300, xp_cost: 50, description: 'Type 100 words in 5 minutes' },
        { challenge_type: 'word_count', difficulty: 'medium', target_value: 200, time_limit: 300, xp_cost: 30, description: 'Type 200 words in 5 minutes' },
        { challenge_type: 'word_count', difficulty: 'hard', target_value: 300, time_limit: 300, xp_cost: 0, description: 'Type 300 words in 5 minutes' }
      ];
      
      for (const challenge of challenges) {
        await db.query(
          'INSERT INTO streak_recovery_challenges (challenge_type, difficulty, target_value, time_limit, xp_cost, description) VALUES (?, ?, ?, ?, ?, ?)',
          [challenge.challenge_type, challenge.difficulty, challenge.target_value, challenge.time_limit, challenge.xp_cost, challenge.description]
        );
      }
      
      console.log('Recovery challenges initialized');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing recovery challenges:', error);
    return false;
  }
};

// Get user streak rank based on current streak
const getUserStreakRank = async (userId) => {
  try {
    // Get user's current streak
    const [streakData] = await db.query(
      'SELECT currentStreak FROM user_streaks WHERE userId = ?',
      [userId]
    );
    
    if (streakData.length === 0) {
      return null;
    }
    
    const currentStreak = streakData[0].currentStreak;
    
    // Get the highest rank the user qualifies for
    const [rankData] = await db.query(
      'SELECT * FROM streak_ranks WHERE min_streak <= ? ORDER BY min_streak DESC LIMIT 1',
      [currentStreak]
    );
    
    if (rankData.length === 0) {
      return null; // No rank yet
    }
    
    // Get next rank if available
    const [nextRankData] = await db.query(
      'SELECT * FROM streak_ranks WHERE min_streak > ? ORDER BY min_streak ASC LIMIT 1',
      [currentStreak]
    );
    
    const nextRank = nextRankData.length > 0 ? {
      name: nextRankData[0].name,
      min_streak: nextRankData[0].min_streak,
      daysToNext: nextRankData[0].min_streak - currentStreak
    } : null;
    
    return {
      currentRank: rankData[0],
      nextRank,
      currentStreak
    };
  } catch (error) {
    console.error('Error getting user streak rank:', error);
    throw error;
  }
};

// Check for streak danger (user about to lose their streak)
const checkStreakDanger = async (userId) => {
  try {
    // Get user's current streak and last activity date
    const [streakData] = await db.query(
      'SELECT currentStreak, lastActivityDate, streakFreezeCount FROM user_streaks WHERE userId = ?',
      [userId]
    );
    
    if (streakData.length === 0) {
      return { inDanger: false };
    }
    
    const { currentStreak, lastActivityDate, streakFreezeCount } = streakData[0];
    
    // Calculate hours since last activity
    const lastActivity = new Date(lastActivityDate);
    const now = new Date();
    const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
    
    // Danger levels
    let dangerLevel = 'none';
    let hoursRemaining = 24 - hoursSinceActivity;
    
    if (hoursRemaining <= 1) {
      dangerLevel = 'critical';
    } else if (hoursRemaining <= 3) {
      dangerLevel = 'high';
    } else if (hoursRemaining <= 6) {
      dangerLevel = 'medium';
    } else if (hoursRemaining <= 12) {
      dangerLevel = 'low';
    }
    
    return {
      inDanger: dangerLevel !== 'none',
      dangerLevel,
      hoursRemaining: Math.max(0, Math.floor(hoursRemaining)),
      minutesRemaining: Math.max(0, Math.floor((hoursRemaining % 1) * 60)),
      currentStreak,
      hasFreezes: streakFreezeCount > 0,
      freezeCount: streakFreezeCount
    };
  } catch (error) {
    console.error('Error checking streak danger:', error);
    throw error;
  }
};

// Get available streak recovery challenges
const getRecoveryChallenges = async (userId) => {
  try {
    // Check if user has lost streak recently (within 48 hours)
    const [streakHistory] = await db.query(
      `SELECT 
        sh.previous_streak, 
        sh.new_streak, 
        sh.change_type, 
        sh.changed_at 
      FROM streak_history sh
      WHERE sh.user_id = ? 
      AND sh.change_type = 'reset'
      AND sh.changed_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
      ORDER BY sh.changed_at DESC 
      LIMIT 1`,
      [userId]
    );
    
    if (streakHistory.length === 0) {
      return { eligible: false, reason: 'no_recent_loss' };
    }
    
    const lostStreak = streakHistory[0].previous_streak;
    
    // Higher streaks get harder challenges but more time to recover
    let difficulty, recoverabilityHours;
    
    if (lostStreak >= 100) {
      difficulty = 'hard';
      recoverabilityHours = 72; // 3 days to recover a 100+ streak
    } else if (lostStreak >= 30) {
      difficulty = 'medium';
      recoverabilityHours = 48; // 2 days to recover a 30+ streak
    } else if (lostStreak >= 7) {
      difficulty = 'easy';
      recoverabilityHours = 24; // 1 day to recover a 7+ streak
    } else {
      return { eligible: false, reason: 'streak_too_small' };
    }
    
    // Check if enough time has passed since streak reset
    const resetTime = new Date(streakHistory[0].changed_at);
    const now = new Date();
    const hoursSinceReset = (now - resetTime) / (1000 * 60 * 60);
    
    if (hoursSinceReset > recoverabilityHours) {
      return { eligible: false, reason: 'too_late', hoursSinceReset, recoverabilityHours };
    }
    
    // Get available challenges based on difficulty
    const [challenges] = await db.query(
      'SELECT * FROM streak_recovery_challenges WHERE difficulty = ?',
      [difficulty]
    );
    
    return {
      eligible: true,
      lostStreak,
      hoursSinceReset,
      hoursRemaining: recoverabilityHours - hoursSinceReset,
      challenges
    };
  } catch (error) {
    console.error('Error getting recovery challenges:', error);
    throw error;
  }
};

// Initialize all enhanced streak features
const initializeEnhancedStreakFeatures = async () => {
  try {
    await createEnhancedStreakTables();
    await initializeStreakRanks();
    await initializeVariableRewards();
    await initializeRecoveryChallenges();
    return true;
  } catch (error) {
    console.error('Error initializing enhanced streak features:', error);
    return false;
  }
};

module.exports = {
  createEnhancedStreakTables,
  initializeStreakRanks,
  initializeVariableRewards,
  initializeRecoveryChallenges,
  getUserStreakRank,
  checkStreakDanger,
  getRecoveryChallenges,
  initializeEnhancedStreakFeatures
}; 