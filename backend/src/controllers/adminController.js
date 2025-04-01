// Add these functions to handle analytics alerts

/**
 * Get all analytics alerts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAnalyticsAlerts = async (req, res) => {
  try {
    const { limit = 50, offset = 0, processed = 'all' } = req.query;
    
    let query = `
      SELECT * FROM analytics_alerts
    `;
    
    if (processed !== 'all') {
      const isProcessed = processed === 'true' || processed === '1';
      query += ` WHERE is_processed = ${isProcessed ? 'TRUE' : 'FALSE'}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    
    const [alerts] = await db.query(query, [parseInt(limit), parseInt(offset)]);
    
    // Get total count for pagination
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM analytics_alerts ${processed !== 'all' 
        ? `WHERE is_processed = ${processed === 'true' || processed === '1' ? 'TRUE' : 'FALSE'}` 
        : ''}`
    );
    
    return res.status(200).json({
      success: true,
      alerts,
      total: countResult[0].total
    });
  } catch (error) {
    console.error('Error getting analytics alerts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get analytics alerts',
      error: error.message
    });
  }
};

/**
 * Process an analytics alert and mark it as processed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.processAnalyticsAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { actions } = req.body;
    
    // Check if alert exists
    const [alertCheck] = await db.query(
      'SELECT * FROM analytics_alerts WHERE id = ?',
      [alertId]
    );
    
    if (alertCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    // Mark as processed
    await db.query(
      'UPDATE analytics_alerts SET is_processed = TRUE WHERE id = ?',
      [alertId]
    );
    
    // Log the action taken (if any)
    if (actions && Object.keys(actions).length > 0) {
      await db.query(
        `INSERT INTO admin_actions 
         (user_id, action_type, target_type, target_id, details, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          req.user.id,
          'process_alert',
          'analytics_alert',
          alertId,
          JSON.stringify(actions)
        ]
      );
    }
    
    return res.status(200).json({
      success: true,
      message: 'Alert processed successfully'
    });
  } catch (error) {
    console.error('Error processing analytics alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process analytics alert',
      error: error.message
    });
  }
};

/**
 * Delete an analytics alert
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteAnalyticsAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    
    // Check if alert exists
    const [alertCheck] = await db.query(
      'SELECT * FROM analytics_alerts WHERE id = ?',
      [alertId]
    );
    
    if (alertCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    // Delete the alert
    await db.query(
      'DELETE FROM analytics_alerts WHERE id = ?',
      [alertId]
    );
    
    // Log the action
    await db.query(
      `INSERT INTO admin_actions 
       (user_id, action_type, target_type, target_id, details, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        req.user.id,
        'delete_alert',
        'analytics_alert',
        alertId,
        JSON.stringify({ alert_type: alertCheck[0].alert_type })
      ]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting analytics alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete analytics alert',
      error: error.message
    });
  }
}; 