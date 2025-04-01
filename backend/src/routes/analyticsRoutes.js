const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateUser } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateUser);

// Streak analytics endpoints
router.get('/streak-heatmap', analyticsController.getStreakHeatmap);
router.get('/streak-consistency', analyticsController.getStreakConsistency);
router.get('/performance-trends', analyticsController.getPerformanceTrends);
router.get('/personal-bests', analyticsController.getPersonalBests);
router.get('/daily-improvement', analyticsController.getDailyImprovement);
router.get('/milestones', analyticsController.getMilestoneProgress);
router.get('/stamina-rating', analyticsController.getStaminaRating);
router.get('/upcoming-rewards', analyticsController.getUpcomingRewards);
router.get('/rankings', analyticsController.getCompetitiveRankings);
router.get('/friend-comparisons', analyticsController.getFriendComparisons);

// Analytics tracking endpoint
router.post('/track', analyticsController.trackAction);

module.exports = router; 