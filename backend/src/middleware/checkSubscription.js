const subscriptionModel = require('../models/subscription');

/**
 * Middleware to check if a user has access to a specific feature based on subscription.
 * This can be used to protect routes that require premium features.
 * 
 * @param {string|string[]} feature - The feature(s) to check access for
 * @param {boolean} allowMultiple - If true, user needs access to ALL features in the array, otherwise ANY feature is sufficient
 * @returns {function} Express middleware function
 */
const checkFeatureAccess = (feature, allowMultiple = false) => {
  return async (req, res, next) => {
    try {
      // User must be authenticated to check subscription
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = req.user.id;
      
      // If checking multiple features
      if (Array.isArray(feature)) {
        const accessPromises = feature.map(feat => subscriptionModel.hasFeatureAccess(userId, feat));
        const accessResults = await Promise.all(accessPromises);
        
        // For multiple features, behavior depends on allowMultiple flag
        const hasAccess = allowMultiple 
          ? accessResults.every(access => access === true) // Require ALL features
          : accessResults.some(access => access === true);  // Require ANY feature
        
        if (hasAccess) {
          return next();
        } else {
          // Customize response based on the specific feature(s) required
          const featuresMessage = Array.isArray(feature) 
            ? feature.join(', ') 
            : feature;
          
          return res.status(403).json({ 
            error: 'Subscription required', 
            message: `This feature requires a subscription with access to: ${featuresMessage}`,
            requiredFeatures: feature
          });
        }
      }
      
      // Single feature check
      const hasAccess = await subscriptionModel.hasFeatureAccess(userId, feature);
      
      if (hasAccess) {
        return next();
      } else {
        return res.status(403).json({ 
          error: 'Subscription required', 
          message: `This feature requires a subscription with access to: ${feature}`,
          requiredFeature: feature
        });
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
      return res.status(500).json({ error: 'Error checking feature access' });
    }
  };
};

/**
 * Middleware to limit access based on document or content count.
 * Used to restrict users to their subscription limit for uploads.
 * 
 * @param {string} countType - Type of count to check (e.g., 'documents', 'competitions')
 * @param {function} countFetcher - Async function to fetch current count, receives userId as parameter
 * @returns {function} Express middleware function
 */
const checkCountLimit = (countType, countFetcher) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = req.user.id;
      
      // Get user's subscription
      const subscription = await subscriptionModel.getUserSubscription(userId);
      
      // Get the limit for this count type from the subscription
      const limit = subscription.features[`max${countType.charAt(0).toUpperCase() + countType.slice(1)}`];
      
      // If unlimited, continue
      if (limit === 'unlimited') {
        return next();
      }
      
      // Get current count
      const currentCount = await countFetcher(userId);
      
      // Check if user is at or over their limit
      if (currentCount >= limit) {
        return res.status(403).json({
          error: 'Limit exceeded',
          message: `You have reached your ${countType} limit (${limit}). Please upgrade your subscription for more.`,
          limit,
          currentCount
        });
      }
      
      // Add limit info to request for possible use in the route handler
      req.subscriptionLimit = {
        limit,
        currentCount,
        remaining: limit - currentCount
      };
      
      next();
    } catch (error) {
      console.error(`Error checking ${countType} limit:`, error);
      return res.status(500).json({ error: `Error checking ${countType} limit` });
    }
  };
};

/**
 * Middleware to check upload size limits based on subscription
 * 
 * @param {string} sizeField - Request field that contains file size in MB
 * @returns {function} Express middleware function
 */
const checkUploadSizeLimit = (sizeField = 'file.size') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = req.user.id;
      
      // Get user's subscription
      const subscription = await subscriptionModel.getUserSubscription(userId);
      
      // Get the size limit in MB
      const maxSizeMB = subscription.features.maxUploadSizeMB;
      
      // Get the file size from the request
      // This depends on how your file middleware works
      let fileSize;
      
      // Handle nested fields with dot notation
      if (sizeField.includes('.')) {
        const fields = sizeField.split('.');
        let value = req;
        for (const field of fields) {
          value = value[field];
          if (!value) break;
        }
        fileSize = value;
      } else {
        fileSize = req[sizeField];
      }
      
      // Convert bytes to MB if needed
      const fileSizeMB = fileSize / (1024 * 1024);
      
      if (fileSizeMB > maxSizeMB) {
        return res.status(403).json({
          error: 'File too large',
          message: `File size (${fileSizeMB.toFixed(2)} MB) exceeds your subscription limit (${maxSizeMB} MB)`,
          limit: maxSizeMB,
          fileSize: fileSizeMB
        });
      }
      
      next();
    } catch (error) {
      console.error('Error checking upload size limit:', error);
      return res.status(500).json({ error: 'Error checking upload size limit' });
    }
  };
};

/**
 * Middleware to add ads flag to the request based on subscription
 * Useful for routes that return content that might include ads
 */
const checkAdsEnabled = async (req, res, next) => {
  try {
    // Default to showing ads for non-authenticated users
    if (!req.user || !req.user.id) {
      req.showAds = true;
      return next();
    }
    
    const userId = req.user.id;
    
    // Get user's subscription
    const subscription = await subscriptionModel.getUserSubscription(userId);
    
    // Check if ads are enabled for this subscription
    req.showAds = subscription.features.adsEnabled;
    
    next();
  } catch (error) {
    console.error('Error checking ads status:', error);
    // Don't block the request, just default to showing ads
    req.showAds = true;
    next();
  }
};

module.exports = {
  checkFeatureAccess,
  checkCountLimit,
  checkUploadSizeLimit,
  checkAdsEnabled
}; 