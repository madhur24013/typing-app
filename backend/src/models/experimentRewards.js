/**
 * Model for experiment rewards - used for A/B testing different reward structures
 * This supports the analytics system by providing different reward variants to test
 */

const db = require('../config/database');

/**
 * Creates experiment rewards tables if they don't exist
 */
exports.initializeExperimentRewardsTables = async () => {
  try {
    // Create table for streak experiment variants
    await db.query(`
      CREATE TABLE IF NOT EXISTS streak_experiment_rewards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        experiment_name VARCHAR(100) NOT NULL,
        variant VARCHAR(50) NOT NULL,
        milestone INT NOT NULL,
        reward_type VARCHAR(50) NOT NULL,
        reward_value VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE KEY variant_milestone (variant, milestone)
      )
    `);
    
    // Insert default reward structures if the table is empty
    const [rewards] = await db.query('SELECT COUNT(*) as count FROM streak_experiment_rewards');
    
    if (rewards[0].count === 0) {
      // Control group - standard rewards
      await insertControlVariant();
      
      // Variable rewards (variant A) - different values for different days
      await insertVariableRewardsVariant();
      
      // Surprise rewards (variant B) - random bonus rewards
      await insertSurpriseRewardsVariant();
    }
    
    console.log('Experiment rewards tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing experiment rewards tables:', error);
    throw error;
  }
};

/**
 * Insert control variant rewards (standard)
 */
const insertControlVariant = async () => {
  const controlRewards = [
    // Basic milestones
    { milestone: 5, type: 'badge', value: 'beginner_streak', description: '5-Day Streak Badge' },
    { milestone: 10, type: 'badge', value: 'consistent_10', description: '10-Day Consistency Badge' },
    { milestone: 25, type: 'badge', value: 'dedicated_25', description: '25-Day Dedication Badge' },
    { milestone: 50, type: 'badge', value: 'committed_50', description: '50-Day Commitment Badge' },
    { milestone: 100, type: 'badge', value: 'master_100', description: '100-Day Mastery Badge' },
    
    // Points rewards
    { milestone: 7, type: 'points', value: '50', description: '50 Bonus Points for 7-Day Streak' },
    { milestone: 30, type: 'points', value: '200', description: '200 Bonus Points for 30-Day Streak' },
    
    // Feature rewards
    { milestone: 15, type: 'feature', value: 'streak_freeze', description: 'Streak Freeze (1)' },
    { milestone: 60, type: 'feature', value: 'premium_theme', description: 'Exclusive Theme' }
  ];
  
  for (const reward of controlRewards) {
    await db.query(
      `INSERT INTO streak_experiment_rewards 
       (experiment_name, variant, milestone, reward_type, reward_value, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['streak_rewards', 'control', reward.milestone, reward.type, reward.value, reward.description]
    );
  }
};

/**
 * Insert variable rewards variant (A)
 */
const insertVariableRewardsVariant = async () => {
  const variableRewards = [
    // Basic milestones with increasing value
    { milestone: 3, type: 'points', value: '25', description: 'Quick Start: 25 Points' },
    { milestone: 5, type: 'badge', value: 'beginner_streak', description: '5-Day Streak Badge' },
    { milestone: 7, type: 'points', value: '75', description: 'One Week: 75 Points' },
    { milestone: 10, type: 'badge', value: 'consistent_10', description: '10-Day Consistency Badge' },
    { milestone: 14, type: 'points', value: '150', description: 'Two Weeks: 150 Points' },
    { milestone: 15, type: 'feature', value: 'streak_freeze', description: 'Streak Freeze (1)' },
    { milestone: 21, type: 'points', value: '250', description: 'Three Weeks: 250 Points' },
    { milestone: 25, type: 'badge', value: 'dedicated_25', description: '25-Day Dedication Badge' },
    { milestone: 30, type: 'feature', value: 'premium_theme', description: 'Exclusive Theme' },
    { milestone: 40, type: 'points', value: '400', description: '40 Days: 400 Points' },
    { milestone: 50, type: 'badge', value: 'committed_50', description: '50-Day Commitment Badge' },
    { milestone: 60, type: 'feature', value: 'streak_freeze', description: 'Streak Freeze (2)' },
    { milestone: 75, type: 'points', value: '750', description: '75 Days: 750 Points' },
    { milestone: 100, type: 'badge', value: 'master_100', description: '100-Day Mastery Badge' }
  ];
  
  for (const reward of variableRewards) {
    await db.query(
      `INSERT INTO streak_experiment_rewards 
       (experiment_name, variant, milestone, reward_type, reward_value, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['streak_rewards', 'variant_a', reward.milestone, reward.type, reward.value, reward.description]
    );
  }
};

/**
 * Insert surprise rewards variant (B)
 */
const insertSurpriseRewardsVariant = async () => {
  // Base rewards are same as control
  const baseRewards = [
    { milestone: 5, type: 'badge', value: 'beginner_streak', description: '5-Day Streak Badge' },
    { milestone: 10, type: 'badge', value: 'consistent_10', description: '10-Day Consistency Badge' },
    { milestone: 25, type: 'badge', value: 'dedicated_25', description: '25-Day Dedication Badge' },
    { milestone: 50, type: 'badge', value: 'committed_50', description: '50-Day Commitment Badge' },
    { milestone: 100, type: 'badge', value: 'master_100', description: '100-Day Mastery Badge' },
    { milestone: 7, type: 'points', value: '50', description: '50 Bonus Points for 7-Day Streak' },
    { milestone: 30, type: 'points', value: '200', description: '200 Bonus Points for 30-Day Streak' },
    { milestone: 15, type: 'feature', value: 'streak_freeze', description: 'Streak Freeze (1)' },
    { milestone: 60, type: 'feature', value: 'premium_theme', description: 'Exclusive Theme' }
  ];
  
  // Add surprise rewards
  const surpriseRewards = [
    { milestone: 8, type: 'surprise', value: 'random_points', description: 'Random Points Bonus (20-100)' },
    { milestone: 12, type: 'surprise', value: 'mystery_badge', description: 'Mystery Badge' },
    { milestone: 18, type: 'surprise', value: 'random_feature', description: 'Random Feature Unlock' },
    { milestone: 22, type: 'surprise', value: 'double_points_day', description: 'Double Points Day' },
    { milestone: 33, type: 'surprise', value: 'big_bonus', description: 'Big Surprise Bonus' },
    { milestone: 42, type: 'surprise', value: 'special_theme', description: 'Special Limited Theme' },
    { milestone: 65, type: 'surprise', value: 'mega_points', description: 'Mega Points Surprise (100-500)' },
    { milestone: 88, type: 'surprise', value: 'ultimate_reward', description: 'Ultimate Surprise Reward' }
  ];
  
  // Insert all rewards
  const allRewards = [...baseRewards, ...surpriseRewards];
  
  for (const reward of allRewards) {
    await db.query(
      `INSERT INTO streak_experiment_rewards 
       (experiment_name, variant, milestone, reward_type, reward_value, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['streak_rewards', 'variant_b', reward.milestone, reward.type, reward.value, reward.description]
    );
  }
};

/**
 * Get rewards for a specific experiment variant
 * @param {string} experimentName - Name of the experiment
 * @param {string} variant - Variant name (control, variant_a, variant_b, etc.)
 */
exports.getVariantRewards = async (experimentName, variant) => {
  try {
    const [rewards] = await db.query(
      `SELECT * FROM streak_experiment_rewards
       WHERE experiment_name = ? 
       AND variant = ?
       AND is_active = TRUE
       ORDER BY milestone ASC`,
      [experimentName, variant]
    );
    
    return rewards;
  } catch (error) {
    console.error('Error getting variant rewards:', error);
    throw error;
  }
};

/**
 * Get reward information for a specific milestone in a variant
 * @param {string} experimentName - Name of the experiment
 * @param {string} variant - Variant name
 * @param {number} milestone - Milestone to retrieve
 */
exports.getMilestoneReward = async (experimentName, variant, milestone) => {
  try {
    const [rewards] = await db.query(
      `SELECT * FROM streak_experiment_rewards
       WHERE experiment_name = ? 
       AND variant = ?
       AND milestone = ?
       AND is_active = TRUE`,
      [experimentName, variant, milestone]
    );
    
    return rewards[0] || null;
  } catch (error) {
    console.error('Error getting milestone reward:', error);
    throw error;
  }
};

/**
 * Process a surprise reward for variant B
 * @param {string} rewardValue - Type of surprise reward
 * @param {number} userId - User ID
 */
exports.processSurpriseReward = async (rewardValue, userId) => {
  try {
    let reward = {
      type: 'surprise',
      value: rewardValue,
      actualReward: null
    };
    
    switch (rewardValue) {
      case 'random_points':
        // Generate random points between 20-100
        const points = Math.floor(Math.random() * 81) + 20; // 20-100
        await db.query(
          `UPDATE user_progress SET points = points + ? WHERE user_id = ?`,
          [points, userId]
        );
        reward.actualReward = { type: 'points', amount: points };
        break;
        
      case 'mystery_badge':
        const badges = ['surprise_box', 'lucky_star', 'hidden_gem', 'unexpected_gift'];
        const badge = badges[Math.floor(Math.random() * badges.length)];
        // Give random mystery badge
        await db.query(
          `INSERT INTO user_badges (user_id, badge_id, earned_at)
           VALUES (?, ?, NOW())`,
          [userId, badge]
        );
        reward.actualReward = { type: 'badge', badge: badge };
        break;
        
      case 'double_points_day':
        // Set a flag for double points for 24 hours
        await db.query(
          `INSERT INTO user_bonuses (user_id, bonus_type, bonus_value, expires_at)
           VALUES (?, 'points_multiplier', '2', DATE_ADD(NOW(), INTERVAL 1 DAY))`,
          [userId]
        );
        reward.actualReward = { type: 'bonus', multiplier: 2, duration: '24 hours' };
        break;
        
      // More cases for other surprise types...
      
      default:
        reward.actualReward = { type: 'unknown', message: 'Surprise not implemented yet' };
    }
    
    return reward;
  } catch (error) {
    console.error('Error processing surprise reward:', error);
    throw error;
  }
}; 