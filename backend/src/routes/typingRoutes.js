const express = require('express');
const router = express.Router();
const typingController = require('../controllers/typingController');
const { authenticate } = require('../middleware/auth');

// All routes are protected and require authentication
router.use(authenticate);

// Sessions
router.post('/sessions', typingController.startSession);
router.put('/sessions/:id', typingController.updateSession);
router.put('/sessions/:id/complete', typingController.completeSession);
router.get('/sessions', typingController.getSessionHistory);

// Error tracking
router.post('/sessions/:id/errors', typingController.trackError);

// Statistics
router.get('/stats', typingController.getUserStats);

module.exports = router; 