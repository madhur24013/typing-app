const db = require('../config/database');
const experimentRewards = require('../models/experimentRewards');

/**
 * Create a new experiment
 */
exports.createExperiment = async (req, res) => {
  try {
    const { name, feature, variants, description } = req.body;
    
    if (!name || !feature || !variants || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, feature, and variants are required'
      });
    }
    
    // Check if experiment already exists
    const [existingExperiment] = await db.query(
      `SELECT * FROM experiments WHERE name = ? AND feature = ?`,
      [name, feature]
    );
    
    if (existingExperiment.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An experiment with this name and feature already exists'
      });
    }
    
    // Insert each variant
    for (const variant of variants) {
      await db.query(
        `INSERT INTO experiments (name, feature, variant, description, status)
         VALUES (?, ?, ?, ?, 'draft')`,
        [name, feature, variant, description]
      );
    }
    
    return res.status(201).json({
      success: true,
      message: 'Experiment created successfully',
      experiment: {
        name,
        feature,
        variants,
        description,
        status: 'draft'
      }
    });
  } catch (error) {
    console.error('Error creating experiment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create experiment',
      error: error.message
    });
  }
};

/**
 * Update an existing experiment
 */
exports.updateExperiment = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, status } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Experiment ID is required'
      });
    }
    
    // Check if the experiment exists
    const [existingExperiment] = await db.query(
      `SELECT * FROM experiments WHERE id = ?`,
      [id]
    );
    
    if (existingExperiment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Experiment not found'
      });
    }
    
    // Update the experiment
    await db.query(
      `UPDATE experiments 
       SET description = ?, status = ? 
       WHERE id = ?`,
      [description, status, id]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Experiment updated successfully'
    });
  } catch (error) {
    console.error('Error updating experiment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update experiment',
      error: error.message
    });
  }
};

/**
 * Get all experiments
 */
exports.getAllExperiments = async (req, res) => {
  try {
    const [experiments] = await db.query(
      `SELECT name, feature, GROUP_CONCAT(variant) as variants, 
              description, status, start_date, end_date
       FROM experiments
       GROUP BY name, feature
       ORDER BY name`
    );
    
    // Format the experiments
    const formattedExperiments = experiments.map(exp => ({
      ...exp,
      variants: exp.variants.split(',')
    }));
    
    return res.status(200).json({
      success: true,
      experiments: formattedExperiments
    });
  } catch (error) {
    console.error('Error getting experiments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get experiments',
      error: error.message
    });
  }
};

/**
 * Get experiment results
 */
exports.getExperimentResults = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get experiment information
    const [experiment] = await db.query(
      `SELECT * FROM experiments WHERE id = ?`,
      [id]
    );
    
    if (experiment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Experiment not found'
      });
    }
    
    const experimentName = experiment[0].name;
    const experimentFeature = experiment[0].feature;
    
    // Get all variants for this experiment
    const [variants] = await db.query(
      `SELECT id, variant FROM experiments WHERE name = ? AND feature = ?`,
      [experimentName, experimentFeature]
    );
    
    // Get results for each variant
    const results = [];
    
    for (const variant of variants) {
      // Get users in this variant
      const [usersInVariant] = await db.query(
        `SELECT COUNT(DISTINCT user_id) as user_count
         FROM user_experiments
         WHERE experiment_id = ?`,
        [variant.id]
      );
      
      // Get metrics depending on the feature being tested
      let metrics = {};
      
      if (experimentFeature === 'streaks') {
        // For streak experiments, get retention metrics
        const [streakMetrics] = await db.query(
          `SELECT 
             AVG(us.current_streak) as avg_streak_length,
             AVG(us.longest_streak) as avg_longest_streak,
             COUNT(CASE WHEN us.current_streak >= 7 THEN 1 END) / COUNT(*) as weekly_retention_rate,
             AVG(
               (SELECT COUNT(*) FROM typing_sessions ts 
                WHERE ts.user_id = ue.user_id 
                AND ts.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))
             ) as avg_sessions_per_week
           FROM user_experiments ue
           JOIN user_streaks us ON ue.user_id = us.user_id
           WHERE ue.experiment_id = ?`,
          [variant.id]
        );
        
        metrics = streakMetrics[0];
      }
      
      results.push({
        variant: variant.variant,
        userCount: usersInVariant[0]?.user_count || 0,
        metrics
      });
    }
    
    return res.status(200).json({
      success: true,
      experiment: experiment[0],
      results
    });
  } catch (error) {
    console.error('Error getting experiment results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get experiment results',
      error: error.message
    });
  }
};

/**
 * Toggle experiment status (activate/deactivate)
 */
exports.toggleExperimentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Experiment ID and status are required'
      });
    }
    
    if (!['draft', 'active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: draft, active, completed, cancelled'
      });
    }
    
    // Get experiment information
    const [experiment] = await db.query(
      `SELECT * FROM experiments WHERE id = ?`,
      [id]
    );
    
    if (experiment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Experiment not found'
      });
    }
    
    const experimentName = experiment[0].name;
    const experimentFeature = experiment[0].feature;
    
    // Update status for all variants of this experiment
    await db.query(
      `UPDATE experiments 
       SET status = ?, 
           start_date = CASE 
                          WHEN ? = 'active' AND start_date IS NULL THEN NOW() 
                          ELSE start_date 
                        END,
           end_date = CASE 
                        WHEN ? IN ('completed', 'cancelled') THEN NOW() 
                        ELSE end_date 
                      END
       WHERE name = ? AND feature = ?`,
      [status, status, status, experimentName, experimentFeature]
    );
    
    return res.status(200).json({
      success: true,
      message: `Experiment status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating experiment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update experiment status',
      error: error.message
    });
  }
};

/**
 * Get rewards for a specific experiment variant
 */
exports.getVariantRewards = async (req, res) => {
  try {
    const { experiment, variant } = req.params;
    
    if (!experiment || !variant) {
      return res.status(400).json({
        success: false,
        message: 'Experiment and variant are required'
      });
    }
    
    const rewards = await experimentRewards.getVariantRewards(experiment, variant);
    
    return res.status(200).json({
      success: true,
      rewards
    });
  } catch (error) {
    console.error('Error getting variant rewards:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get variant rewards',
      error: error.message
    });
  }
}; 