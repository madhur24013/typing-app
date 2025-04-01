/**
 * Admin routes for TypeShala
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const subscriptionController = require('../controllers/subscriptionController');
const experimentsController = require('../controllers/experimentsController');
const { authenticateUser, authorizeAdmin } = require('../middleware/auth');

// Apply middleware to all routes
router.use(authenticateUser, authorizeAdmin);

// Dashboard stats
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/revenue', adminController.getRevenueStats);
router.get('/dashboard/users', adminController.getUserStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);

// Subscription management
router.get('/subscriptions', subscriptionController.getAllSubscriptions);
router.post('/subscriptions/update', subscriptionController.updateSubscriptionTier);
router.post('/subscriptions/features', subscriptionController.addCustomFeature);

// Document management
router.get('/documents', adminController.getAllDocuments);
router.post('/documents', adminController.createDocument);
router.put('/documents/:documentId', adminController.updateDocument);
router.delete('/documents/:documentId', adminController.deleteDocument);

// Analytics routes
router.get('/analytics/summary', adminController.getAnalyticsSummary);
router.get('/analytics/retention', adminController.getRetentionAnalytics);
router.get('/analytics/users', adminController.getUserAnalytics);
router.get('/analytics/typing', adminController.getTypingAnalytics);

// Analytics alerts management
router.get('/analytics/alerts', adminController.getAnalyticsAlerts);
router.post('/analytics/alerts/:alertId/process', adminController.processAnalyticsAlert);
router.delete('/analytics/alerts/:alertId', adminController.deleteAnalyticsAlert);

// Experiment management
router.get('/experiments', experimentsController.getAllExperiments);
router.post('/experiments', experimentsController.createExperiment);
router.put('/experiments/:experimentId', experimentsController.updateExperiment);
router.delete('/experiments/:experimentId', experimentsController.deleteExperiment);
router.post('/experiments/promote-variant', experimentsController.promoteExperimentVariant);

module.exports = router; 