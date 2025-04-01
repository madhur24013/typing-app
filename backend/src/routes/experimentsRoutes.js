const express = require('express');
const router = express.Router();
const experimentController = require('../controllers/experimentController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Admin routes for managing experiments
router.post('/create', [verifyToken, isAdmin], experimentController.createExperiment);
router.put('/:id', [verifyToken, isAdmin], experimentController.updateExperiment);
router.get('/all', [verifyToken, isAdmin], experimentController.getAllExperiments);
router.get('/:id/results', [verifyToken, isAdmin], experimentController.getExperimentResults);
router.post('/:id/toggle', [verifyToken, isAdmin], experimentController.toggleExperimentStatus);

// Routes for experiment rewards
router.get('/rewards/:experiment/:variant', verifyToken, experimentController.getVariantRewards);

module.exports = router; 