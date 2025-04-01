const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth');

// Middleware for Stripe webhooks to get raw body
const stripeWebhookMiddleware = (req, res, next) => {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
};

// Get current subscription (protected)
router.get('/', authenticate, subscriptionController.getUserSubscription);

// Get available subscription tiers and pricing (public)
router.get('/tiers', subscriptionController.getSubscriptionTiers);

// Create checkout session for a subscription purchase (protected)
router.post('/checkout', authenticate, subscriptionController.createCheckoutSession);

// Cancel current subscription (protected)
router.post('/cancel', authenticate, subscriptionController.cancelUserSubscription);

// Check if a user has access to a specific feature (protected)
router.get('/access/:feature', authenticate, subscriptionController.checkFeatureAccess);

// Purchase addon (protected)
router.post('/addon', authenticate, subscriptionController.purchaseAddon);

// Handle Stripe webhooks (special middleware to get raw body)
router.post(
  '/webhooks', 
  stripeWebhookMiddleware, 
  subscriptionController.handleStripeWebhook
);

module.exports = router; 