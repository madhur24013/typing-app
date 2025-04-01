const db = require('../config/database');

// Define subscription tiers and their features
const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  PROFESSIONAL: 'professional',
  TEAM: 'team',
  ENTERPRISE: 'enterprise'
};

// Define features associated with each tier
const TIER_FEATURES = {
  [SUBSCRIPTION_TIERS.FREE]: {
    maxDocuments: 5,
    maxCompetitions: 3,
    adsEnabled: true,
    analyticsLevel: 'basic',
    customThemes: false,
    teamMembers: 0,
    apiAccess: false,
    maxUploadSizeMB: 5,
    premiumCourses: false,
    offlineAccess: false
  },
  [SUBSCRIPTION_TIERS.PREMIUM]: {
    maxDocuments: 50,
    maxCompetitions: 10,
    adsEnabled: false,
    analyticsLevel: 'advanced',
    customThemes: true,
    teamMembers: 0,
    apiAccess: false,
    maxUploadSizeMB: 20,
    premiumCourses: true,
    offlineAccess: true
  },
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
    maxDocuments: 200,
    maxCompetitions: 'unlimited',
    adsEnabled: false,
    analyticsLevel: 'professional',
    customThemes: true,
    teamMembers: 0,
    apiAccess: true,
    maxUploadSizeMB: 50,
    premiumCourses: true,
    offlineAccess: true
  },
  [SUBSCRIPTION_TIERS.TEAM]: {
    maxDocuments: 100,
    maxCompetitions: 'unlimited',
    adsEnabled: false,
    analyticsLevel: 'advanced',
    customThemes: true,
    teamMembers: 10,
    apiAccess: false,
    maxUploadSizeMB: 30,
    premiumCourses: true,
    offlineAccess: true
  },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    maxDocuments: 'unlimited',
    maxCompetitions: 'unlimited',
    adsEnabled: false,
    analyticsLevel: 'enterprise',
    customThemes: true,
    teamMembers: 'unlimited',
    apiAccess: true,
    maxUploadSizeMB: 100,
    premiumCourses: true,
    offlineAccess: true
  }
};

// Create subscriptions table
const createSubscriptionTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        tier VARCHAR(20) NOT NULL DEFAULT 'free',
        startDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        endDate DATETIME,
        paymentStatus VARCHAR(20) NOT NULL DEFAULT 'none',
        paymentProvider VARCHAR(20),
        paymentId VARCHAR(255),
        amount DECIMAL(10, 2),
        currency VARCHAR(3) DEFAULT 'USD',
        autoRenew BOOLEAN DEFAULT FALSE,
        lastUpdated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        metadata JSON,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    await db.query(query);
    console.log('Subscriptions table created or already exists');
    
    // Create subscription_features table for detailed feature access
    const featureTableQuery = `
      CREATE TABLE IF NOT EXISTS subscription_features (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subscriptionId INT NOT NULL,
        featureName VARCHAR(50) NOT NULL,
        featureValue VARCHAR(50) NOT NULL,
        expiryDate DATETIME,
        FOREIGN KEY (subscriptionId) REFERENCES subscriptions(id) ON DELETE CASCADE
      )
    `;
    await db.query(featureTableQuery);
    console.log('Subscription features table created or already exists');
    
    return true;
  } catch (error) {
    console.error('Error creating subscription tables:', error);
    return false;
  }
};

// Create or get user subscription
const getUserSubscription = async (userId) => {
  try {
    // Check if user already has a subscription
    let [rows] = await db.query(
      'SELECT * FROM subscriptions WHERE userId = ?',
      [userId]
    );
    
    // If no subscription exists, create a free subscription
    if (rows.length === 0) {
      await db.query(
        'INSERT INTO subscriptions (userId, tier) VALUES (?, ?)',
        [userId, SUBSCRIPTION_TIERS.FREE]
      );
      
      [rows] = await db.query(
        'SELECT * FROM subscriptions WHERE userId = ?',
        [userId]
      );
    }
    
    // Get the subscription with features
    const subscription = rows[0];
    subscription.features = TIER_FEATURES[subscription.tier];
    
    // Check for any additional features
    const [additionalFeatures] = await db.query(
      'SELECT * FROM subscription_features WHERE subscriptionId = ? AND (expiryDate IS NULL OR expiryDate > NOW())',
      [subscription.id]
    );
    
    // Add any custom features to the subscription
    if (additionalFeatures.length > 0) {
      additionalFeatures.forEach(feature => {
        subscription.features[feature.featureName] = feature.featureValue;
      });
    }
    
    return subscription;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
};

// Update user subscription
const updateSubscription = async (userId, subscriptionData) => {
  try {
    const { tier, paymentStatus, paymentProvider, paymentId, amount, currency, autoRenew, endDate } = subscriptionData;
    
    // If changing to a paid tier, set an end date 30 days from now if not specified
    const subscriptionEndDate = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // Get the current subscription
    const [rows] = await db.query(
      'SELECT id FROM subscriptions WHERE userId = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      // Create new subscription
      await db.query(
        `INSERT INTO subscriptions 
         (userId, tier, paymentStatus, paymentProvider, paymentId, amount, currency, autoRenew, endDate, lastUpdated) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [userId, tier, paymentStatus, paymentProvider, paymentId, amount, currency, autoRenew, subscriptionEndDate]
      );
    } else {
      // Update existing subscription
      await db.query(
        `UPDATE subscriptions SET 
         tier = ?, paymentStatus = ?, paymentProvider = ?, paymentId = ?, 
         amount = ?, currency = ?, autoRenew = ?, endDate = ?, lastUpdated = NOW()
         WHERE userId = ?`,
        [tier, paymentStatus, paymentProvider, paymentId, amount, currency, autoRenew, subscriptionEndDate, userId]
      );
    }
    
    return await getUserSubscription(userId);
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

// Add a custom feature to a subscription (one-time purchases, promotional features)
const addCustomFeature = async (subscriptionId, featureName, featureValue, expiryDate = null) => {
  try {
    await db.query(
      `INSERT INTO subscription_features (subscriptionId, featureName, featureValue, expiryDate)
       VALUES (?, ?, ?, ?)`,
      [subscriptionId, featureName, featureValue, expiryDate]
    );
    
    return {
      success: true,
      message: `Feature ${featureName} added to subscription`
    };
  } catch (error) {
    console.error('Error adding custom feature:', error);
    throw error;
  }
};

// Check if a user has access to a specific feature
const hasFeatureAccess = async (userId, featureName) => {
  try {
    const subscription = await getUserSubscription(userId);
    return !!subscription.features[featureName];
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
};

// Get all subscription tiers for pricing display
const getSubscriptionTiers = () => {
  return {
    tiers: {
      [SUBSCRIPTION_TIERS.FREE]: {
        name: 'Free',
        price: 0,
        features: TIER_FEATURES[SUBSCRIPTION_TIERS.FREE],
        popular: false
      },
      [SUBSCRIPTION_TIERS.PREMIUM]: {
        name: 'Premium',
        price: 5.99,
        yearlyPrice: 59.99,
        features: TIER_FEATURES[SUBSCRIPTION_TIERS.PREMIUM],
        popular: true
      },
      [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
        name: 'Professional',
        price: 12.99,
        yearlyPrice: 129.99,
        features: TIER_FEATURES[SUBSCRIPTION_TIERS.PROFESSIONAL],
        popular: false
      },
      [SUBSCRIPTION_TIERS.TEAM]: {
        name: 'Team',
        price: 39.99,
        yearlyPrice: 399.99,
        features: TIER_FEATURES[SUBSCRIPTION_TIERS.TEAM],
        popular: false,
        perUser: true
      },
      [SUBSCRIPTION_TIERS.ENTERPRISE]: {
        name: 'Enterprise',
        price: 'Custom',
        features: TIER_FEATURES[SUBSCRIPTION_TIERS.ENTERPRISE],
        popular: false,
        contactSales: true
      }
    },
    constants: SUBSCRIPTION_TIERS
  };
};

// Process subscription cancellation
const cancelSubscription = async (userId) => {
  try {
    // Keep the subscription but mark it to expire naturally
    await db.query(
      `UPDATE subscriptions SET 
       autoRenew = FALSE,
       lastUpdated = NOW()
       WHERE userId = ?`,
      [userId]
    );
    
    return {
      success: true,
      message: 'Subscription has been canceled and will expire at the end of the billing period'
    };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

module.exports = {
  createSubscriptionTable,
  getUserSubscription,
  updateSubscription,
  addCustomFeature,
  hasFeatureAccess,
  getSubscriptionTiers,
  cancelSubscription,
  SUBSCRIPTION_TIERS,
  TIER_FEATURES
}; 