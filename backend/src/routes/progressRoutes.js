const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// User progress routes
router.get('/me', progressController.getUserProgress);
router.post('/update', progressController.updateProgress);
router.post('/check-streak', progressController.checkStreak);

// Badges
router.get('/badges', progressController.getUserBadges);

// Leaderboards
router.get('/leaderboard', progressController.getLeaderboard);

module.exports = router; 