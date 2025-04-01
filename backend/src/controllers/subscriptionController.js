const subscriptionModel = require('../models/subscription');
const { SUBSCRIPTION_TIERS } = require('../models/subscription');

// Initialize Stripe with the secret key
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// Get user's current subscription
const getUserSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await subscriptionModel.getUserSubscription(userId);
    res.status(200).json(subscription);
  } catch (error) {
    console.error('Error getting user subscription:', error);
    res.status(500).json({ error: 'Failed to get subscription information' });
  }
};

// Get available subscription tiers and pricing
const getSubscriptionTiers = async (req, res) => {
  try {
    const tiers = subscriptionModel.getSubscriptionTiers();
    res.status(200).json(tiers);
  } catch (error) {
    console.error('Error getting subscription tiers:', error);
    res.status(500).json({ error: 'Failed to get subscription tiers' });
  }
};

// Create a checkout session for subscription purchase
const createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Payment processing is not configured' });
    }
    
    const { tier, billingType = 'monthly' } = req.body;
    const userId = req.user.id;
    
    // Get the tier pricing information
    const tiers = subscriptionModel.getSubscriptionTiers();
    const selectedTier = tiers.tiers[tier];
    
    if (!selectedTier) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }
    
    // If it's a team plan, make sure we have the number of users
    let quantity = 1;
    let amount = billingType === 'yearly' ? selectedTier.yearlyPrice : selectedTier.price;
    
    if (selectedTier.perUser && req.body.users) {
      quantity = parseInt(req.body.users);
      if (isNaN(quantity) || quantity < 1) {
        return res.status(400).json({ error: 'Invalid number of users' });
      }
    }
    
    // If it's enterprise, redirect to contact page
    if (tier === SUBSCRIPTION_TIERS.ENTERPRISE) {
      return res.status(200).json({
        redirectUrl: '/contact-sales',
        tier: SUBSCRIPTION_TIERS.ENTERPRISE
      });
    }
    
    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: req.user.email,
      client_reference_id: userId.toString(),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `TypeShala ${selectedTier.name} ${billingType === 'yearly' ? '(Yearly)' : '(Monthly)'}`,
              description: `Access to ${selectedTier.name} features in TypeShala`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
            recurring: {
              interval: billingType === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: quantity,
        },
      ],
      metadata: {
        userId: userId.toString(),
        tier: tier,
        billingType
      },
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
    });
    
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

// Handle webhook from Stripe for subscription events
const handleStripeWebhook = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Payment processing is not configured' });
    }
    
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!endpointSecret || !sig) {
      return res.status(400).json({ error: 'Missing Stripe webhook signature' });
    }
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
    
    // Handle the event based on its type
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // Fulfill the purchase
        await fulfillSubscription(session);
        break;
      }
      case 'invoice.paid': {
        // Continue the subscription
        const invoice = event.data.object;
        await updateSubscriptionPayment(invoice, 'paid');
        break;
      }
      case 'invoice.payment_failed': {
        // Notify the user about payment issues
        const invoice = event.data.object;
        await updateSubscriptionPayment(invoice, 'failed');
        break;
      }
      case 'customer.subscription.updated': {
        // Handle subscription updates
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        // Handle subscription cancellation
        const subscription = event.data.object;
        await handleSubscriptionCancellation(subscription);
        break;
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
};

// Internal functions for subscription management

// Fulfill a subscription purchase after successful checkout
const fulfillSubscription = async (session) => {
  try {
    const userId = session.metadata.userId;
    const tier = session.metadata.tier;
    const subscriptionId = session.subscription;
    
    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Calculate end date based on subscription period
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    // Update user subscription in database
    await subscriptionModel.updateSubscription(userId, {
      tier,
      paymentStatus: 'paid',
      paymentProvider: 'stripe',
      paymentId: subscriptionId,
      amount: (subscription.items.data[0].price.unit_amount / 100), // Convert from cents
      currency: subscription.currency,
      autoRenew: true,
      endDate: currentPeriodEnd
    });
    
    console.log(`Subscription fulfilled for user ${userId}, tier: ${tier}`);
    return true;
  } catch (error) {
    console.error('Error fulfilling subscription:', error);
    return false;
  }
};

// Update subscription payment status based on invoice events
const updateSubscriptionPayment = async (invoice, status) => {
  try {
    // Get the subscription
    const subscriptionId = invoice.subscription;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Find user from subscription metadata
    const userId = subscription.metadata.userId;
    if (!userId) {
      console.error('No userId found in subscription metadata');
      return false;
    }
    
    // Calculate new end date
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    // Update subscription in database
    await subscriptionModel.updateSubscription(userId, {
      paymentStatus: status,
      endDate: currentPeriodEnd
    });
    
    console.log(`Subscription payment ${status} for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error updating subscription payment to ${status}:`, error);
    return false;
  }
};

// Handle subscription updates
const handleSubscriptionUpdate = async (subscription) => {
  try {
    // Find user from subscription metadata
    const userId = subscription.metadata.userId;
    if (!userId) {
      console.error('No userId found in subscription metadata');
      return false;
    }
    
    // Update end date
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    // Check subscription status
    let paymentStatus = 'active';
    if (subscription.status === 'past_due') {
      paymentStatus = 'past_due';
    } else if (subscription.status === 'unpaid') {
      paymentStatus = 'unpaid';
    } else if (subscription.status === 'canceled') {
      paymentStatus = 'canceled';
    }
    
    // Update subscription in database
    await subscriptionModel.updateSubscription(userId, {
      paymentStatus,
      autoRenew: subscription.cancel_at_period_end === false,
      endDate: currentPeriodEnd
    });
    
    console.log(`Subscription updated for user ${userId}, status: ${paymentStatus}`);
    return true;
  } catch (error) {
    console.error('Error handling subscription update:', error);
    return false;
  }
};

// Handle subscription cancellation
const handleSubscriptionCancellation = async (subscription) => {
  try {
    // Find user from subscription metadata
    const userId = subscription.metadata.userId;
    if (!userId) {
      console.error('No userId found in subscription metadata');
      return false;
    }
    
    // Update subscription in database
    await subscriptionModel.updateSubscription(userId, {
      tier: SUBSCRIPTION_TIERS.FREE,
      paymentStatus: 'canceled',
      autoRenew: false,
      // Let them keep access until the end date
      endDate: new Date(subscription.current_period_end * 1000)
    });
    
    console.log(`Subscription canceled for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
    return false;
  }
};

// User initiated cancellation of subscription
const cancelUserSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the current subscription
    const subscription = await subscriptionModel.getUserSubscription(userId);
    
    // If it's already a free tier, no need to cancel
    if (subscription.tier === SUBSCRIPTION_TIERS.FREE) {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }
    
    // Cancel in Stripe if we have a subscription ID
    if (stripe && subscription.paymentId) {
      await stripe.subscriptions.update(subscription.paymentId, {
        cancel_at_period_end: true
      });
    }
    
    // Update in our database
    const result = await subscriptionModel.cancelSubscription(userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// One-time purchases for add-ons (theme packs, powerups, etc)
const purchaseAddon = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Payment processing is not configured' });
    }
    
    const { addonId, addonType } = req.body;
    const userId = req.user.id;
    
    // Get addon information from a config
    const addonConfig = {
      'theme_pack_1': { name: 'Premium Theme Pack', price: 3.99, featureName: 'themePack', featureValue: 'theme_pack_1' },
      'powerup_pack_1': { name: 'Competition Powerups', price: 2.99, featureName: 'powerupPack', featureValue: 'powerup_pack_1' },
      'certificate_1': { name: 'Digital Certificate', price: 4.99, featureName: 'certificate', featureValue: 'certificate_1' }
    };
    
    const addon = addonConfig[addonId];
    if (!addon) {
      return res.status(400).json({ error: 'Invalid addon' });
    }
    
    // Create a checkout session for the one-time purchase
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: req.user.email,
      client_reference_id: userId.toString(),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `TypeShala - ${addon.name}`,
              description: `One-time purchase of ${addon.name} for TypeShala`,
            },
            unit_amount: Math.round(addon.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId.toString(),
        addonId,
        addonType,
        featureName: addon.featureName,
        featureValue: addon.featureValue
      },
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/purchase/cancel`,
    });
    
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating addon checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

// Fulfill a one-time addon purchase
const fulfillAddonPurchase = async (session) => {
  try {
    const userId = session.metadata.userId;
    const featureName = session.metadata.featureName;
    const featureValue = session.metadata.featureValue;
    
    // Get the user's subscription to find the subscriptionId
    const subscription = await subscriptionModel.getUserSubscription(userId);
    
    // Add the feature to the user's subscription
    await subscriptionModel.addCustomFeature(
      subscription.id,
      featureName,
      featureValue
    );
    
    console.log(`Addon ${featureName} fulfilled for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error fulfilling addon purchase:', error);
    return false;
  }
};

// Process a successful addon purchase from webhook
// (This should be called from the handleStripeWebhook for checkout.session.completed)
const processAddonPurchase = async (session) => {
  // Check if this is an addon purchase
  if (session.metadata && session.metadata.addonId) {
    await fulfillAddonPurchase(session);
  }
};

// Check if a user has access to a specific feature
const checkFeatureAccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const { feature } = req.params;
    
    const hasAccess = await subscriptionModel.hasFeatureAccess(userId, feature);
    res.status(200).json({ hasAccess });
  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(500).json({ error: 'Failed to check feature access' });
  }
};

module.exports = {
  getUserSubscription,
  getSubscriptionTiers,
  createCheckoutSession,
  handleStripeWebhook,
  cancelUserSubscription,
  purchaseAddon,
  checkFeatureAccess
}; 