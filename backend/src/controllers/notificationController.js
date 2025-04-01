/**
 * Notification controller for TypeShala
 * Handles user notifications and automated alerts for analytics findings
 */
const db = require('../config/database');
const { safeAnalyticsCall } = require('../utils/errorHandler');

/**
 * Send a notification to a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendUserNotification = async (req, res) => {
  try {
    const { userId, title, message, type, actionUrl } = req.body;
    
    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, title, and message are required'
      });
    }
    
    const notificationType = type || 'info';
    
    const [result] = await db.query(
      `INSERT INTO user_notifications 
       (user_id, title, message, type, action_url, created_at, is_read) 
       VALUES (?, ?, ?, ?, ?, NOW(), false)`,
      [userId, title, message, notificationType, actionUrl || null]
    );
    
    return res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      notificationId: result.insertId
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};

/**
 * Get notifications for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, includeRead = false } = req.query;
    
    let query = `
      SELECT id, title, message, type, action_url, created_at, is_read 
      FROM user_notifications 
      WHERE user_id = ?
    `;
    
    if (!includeRead || includeRead === 'false') {
      query += ' AND is_read = false';
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    const [notifications] = await db.query(query, [userId, parseInt(limit), parseInt(offset)]);
    
    // Get total count for pagination
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM user_notifications WHERE user_id = ? ${!includeRead || includeRead === 'false' ? 'AND is_read = false' : ''}`,
      [userId]
    );
    
    return res.status(200).json({
      success: true,
      notifications,
      total: countResult[0].total
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
};

/**
 * Mark notifications as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds array is required'
      });
    }
    
    await db.query(
      `UPDATE user_notifications 
       SET is_read = true 
       WHERE user_id = ? AND id IN (?)`,
      [userId, notificationIds]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
};

/**
 * Initialize notification tables
 */
exports.initializeNotificationTables = async () => {
  try {
    // Create notifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
        action_url VARCHAR(255),
        created_at DATETIME NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);
    
    // Create analytics alerts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS analytics_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        alert_type VARCHAR(50) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        threshold_value DECIMAL(10,2) NOT NULL,
        current_value DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at DATETIME NOT NULL,
        is_processed BOOLEAN DEFAULT FALSE,
        INDEX idx_alert_type (alert_type),
        INDEX idx_created_at (created_at)
      )
    `);
    
    console.log('Notification tables initialized');
    return true;
  } catch (error) {
    console.error('Error initializing notification tables:', error);
    throw error;
  }
};

/**
 * Check for significant analytics findings and generate alerts
 * This is meant to be called by a scheduled job
 */
exports.checkAnalyticsAlerts = async () => {
  try {
    const alerts = [];
    
    // Check for streak retention impact
    await safeAnalyticsCall(async () => {
      const [retentionResult] = await db.query(`
        SELECT 
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
        FROM user_streaks us
      `);
      
      if (retentionResult.length > 0) {
        const withStreak = retentionResult[0].avg_sessions_with_streak || 0;
        const noStreak = retentionResult[0].avg_sessions_no_streak || 0;
        
        if (noStreak > 0) {
          const retentionLift = ((withStreak / noStreak) - 1) * 100;
          
          // If retention lift is significant (>= 20%), create an alert
          if (retentionLift >= 20) {
            alerts.push({
              alert_type: 'retention_lift',
              metric_name: 'streak_retention_impact',
              threshold_value: 20,
              current_value: retentionLift,
              description: `Streak users have ${retentionLift.toFixed(1)}% higher weekly activity than non-streak users`,
              created_at: new Date()
            });
          }
        }
      }
    }, 'streak retention impact check');
    
    // Check for experiment variants performing significantly better
    await safeAnalyticsCall(async () => {
      const [experimentResults] = await db.query(`
        SELECT 
          e.name,
          e.variant,
          AVG(us.current_streak) as avg_streak
        FROM experiments e
        JOIN user_experiments ue ON e.id = ue.experiment_id
        JOIN user_streaks us ON ue.user_id = us.user_id
        WHERE e.feature = 'streaks'
        AND e.status = 'active'
        GROUP BY e.name, e.variant
        ORDER BY e.name, avg_streak DESC
      `);
      
      // Group by experiment name
      const experiments = {};
      experimentResults.forEach(result => {
        if (!experiments[result.name]) {
          experiments[result.name] = [];
        }
        experiments[result.name].push(result);
      });
      
      // For each experiment, check if any variant is performing >30% better than control
      Object.values(experiments).forEach(variants => {
        // Find control variant
        const control = variants.find(v => v.variant === 'control');
        if (control) {
          variants.forEach(variant => {
            if (variant.variant !== 'control') {
              const improvement = ((variant.avg_streak / control.avg_streak) - 1) * 100;
              
              if (improvement >= 30) {
                alerts.push({
                  alert_type: 'experiment_significance',
                  metric_name: `${variant.name}_${variant.variant}`,
                  threshold_value: 30,
                  current_value: improvement,
                  description: `Experiment variant ${variant.variant} for ${variant.name} is performing ${improvement.toFixed(1)}% better than control`,
                  created_at: new Date()
                });
              }
            }
          });
        }
      });
    }, 'experiment variant check');
    
    // Insert alerts into database
    if (alerts.length > 0) {
      for (const alert of alerts) {
        await db.query(
          `INSERT INTO analytics_alerts 
           (alert_type, metric_name, threshold_value, current_value, description, created_at, is_processed)
           VALUES (?, ?, ?, ?, ?, ?, false)`,
          [
            alert.alert_type,
            alert.metric_name,
            alert.threshold_value,
            alert.current_value,
            alert.description,
            alert.created_at
          ]
        );
      }
      
      // Notify admins
      await notifyAdminsOfAlerts(alerts);
    }
    
    return {
      success: true,
      alertsGenerated: alerts.length
    };
  } catch (error) {
    console.error('Error checking analytics alerts:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Notify admin users of significant analytics findings
 * @param {Array} alerts - List of alerts to send
 */
const notifyAdminsOfAlerts = async (alerts) => {
  try {
    // Get all admin users
    const [admins] = await db.query(
      'SELECT id FROM users WHERE role = "admin"'
    );
    
    if (admins.length === 0) {
      return;
    }
    
    // Create notifications for each admin
    for (const admin of admins) {
      for (const alert of alerts) {
        await db.query(
          `INSERT INTO user_notifications 
           (user_id, title, message, type, action_url, created_at, is_read) 
           VALUES (?, ?, ?, ?, ?, NOW(), false)`,
          [
            admin.id,
            'Analytics Alert: ' + alert.alert_type.replace('_', ' '),
            alert.description,
            'info',
            '/admin/analytics'
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

/**
 * Schedule the analytics check job to run daily
 */
exports.scheduleAnalyticsCheck = () => {
  // This would typically use a scheduler like node-cron
  // For simplicity, we'll just set up a daily interval
  setInterval(async () => {
    try {
      await exports.checkAnalyticsAlerts();
      console.log('Analytics check completed:', new Date());
    } catch (error) {
      console.error('Error running scheduled analytics check:', error);
    }
  }, 24 * 60 * 60 * 1000); // Run once every 24 hours
}; 