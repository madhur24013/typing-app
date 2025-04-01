/**
 * Notification routes for TypeShala
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateUser, authorizeAdmin } = require('../middleware/auth');

// Routes for user notifications
router.get('/user', authenticateUser, notificationController.getUserNotifications);
router.post('/mark-read', authenticateUser, notificationController.markAsRead);

// Admin only routes
router.post('/send', authenticateUser, authorizeAdmin, notificationController.sendUserNotification);
router.get('/check-analytics', authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const result = await notificationController.checkAnalyticsAlerts();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check analytics alerts',
      error: error.message
    });
  }
});

module.exports = router; 