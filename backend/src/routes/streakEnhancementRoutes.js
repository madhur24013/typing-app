const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const streakEnhancementController = require('../controllers/streakEnhancementController');

/**
 * Enhanced streak system routes
 * Handles streak ranks, psychological triggers, challenges, and social features
 */

// Initialize enhanced streak system (admin only)
router.post('/initialize', authenticateToken, streakEnhancementController.initializeSystem);

// Get user's streak rank and stats
router.get('/rank', authenticateToken, streakEnhancementController.getUserStreakRank);

// Check if streak is in danger
router.get('/danger-check', authenticateToken, streakEnhancementController.checkStreakDanger);

// Get today's reward or surprise (based on streak day)
router.get('/daily-reward', authenticateToken, streakEnhancementController.getDailyReward);

// Streak recovery endpoints
router.get('/recovery-challenges', authenticateToken, streakEnhancementController.getRecoveryChallenges);
router.post('/recovery-complete', authenticateToken, streakEnhancementController.completeRecoveryChallenge);

// Social streak features
router.post('/battles', authenticateToken, streakEnhancementController.createStreakBattle);
router.post('/battles/respond', authenticateToken, streakEnhancementController.respondToStreakBattle);
router.get('/battles', authenticateToken, streakEnhancementController.getUserStreakBattles);

module.exports = router; 