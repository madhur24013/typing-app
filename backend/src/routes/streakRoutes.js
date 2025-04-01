const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const streakController = require('../controllers/streakController');
const battleController = require('../controllers/battleController');
const teamController = require('../controllers/teamController');
const analyticsController = require('../controllers/analyticsController');
const rewardsController = require('../controllers/rewardsController');

// Streak Management Routes
router.get('/user', authenticateToken, streakController.getUserStreak);
router.post('/update', authenticateToken, streakController.updateStreak);

// Streak Battle Routes
router.get('/battles/active', authenticateToken, battleController.getActiveBattles);
router.get('/battles/pending', authenticateToken, battleController.getPendingBattles);
router.post('/battles', authenticateToken, battleController.createBattle);
router.post('/battles/:battleId/respond', authenticateToken, battleController.respondToBattle);

// Team Streak Routes
router.get('/teams', authenticateToken, teamController.getTeamStreaks);
router.post('/teams', authenticateToken, teamController.createTeam);
router.post('/teams/:teamId/join', authenticateToken, teamController.joinTeam);

// Analytics Routes
router.get('/analytics', authenticateToken, analyticsController.getStreakAnalytics);

// Rewards Routes
router.get('/rewards', authenticateToken, rewardsController.getAvailableRewards);
router.post('/rewards/:rewardId/claim', authenticateToken, rewardsController.claimReward);

module.exports = router; 