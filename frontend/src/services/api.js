import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with proper defaults
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add authorization header to requests when token exists
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Authentication API service
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyToken: () => api.get('/auth/verify'),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', {
    currentPassword,
    newPassword
  }),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  getProfile: () => api.get('/users/profile')
};

// Document API service
export const documentsAPI = {
  uploadDocument: (formData) => api.post('/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  getUserDocuments: () => api.get('/documents'),
  getDocument: (id) => api.get(`/documents/${id}`),
  getDocumentPage: (id, page) => api.get(`/documents/${id}/page/${page}`),
  downloadDocument: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  deleteDocument: (id) => api.delete(`/documents/${id}`)
};

// Typing API service
export const typingAPI = {
  startSession: (documentId) => api.post('/typing/sessions', { documentId }),
  updateSession: (sessionId, data) => api.put(`/typing/sessions/${sessionId}`, data),
  completeSession: (sessionId, data) => api.post(`/typing/sessions/${sessionId}/complete`, data),
  getSession: (sessionId) => api.get(`/typing/sessions/${sessionId}`),
  getUserSessions: () => api.get('/typing/sessions'),
  getUserStats: () => api.get('/typing/stats'),
  getRecentStats: () => api.get('/typing/stats/recent'),
  getWordErrorFrequency: () => api.get('/typing/errors/words'),
  getCharErrorFrequency: () => api.get('/typing/errors/chars')
};

// Progress and Gamification API service
export const progressAPI = {
  getUserProgress: () => api.get('/progress'),
  updateProgress: (data) => api.post('/progress/update', data),
  getUserBadges: () => api.get('/progress/badges'),
  getLeaderboard: (type = 'speed', timeframe = 'week') => 
    api.get(`/progress/leaderboard?type=${type}&timeframe=${timeframe}`)
};

// Streak API service
export const streakAPI = {
  // Get the user's current streak data
  getUserStreak: () => api.get('/streaks'),
  
  // Log user activity and update streak
  logActivity: (activityData) => api.post('/streaks/activity', activityData),
  
  // Claim a reward for reaching a streak milestone
  claimReward: (milestone) => api.post(`/streaks/rewards/${milestone}/claim`),
  
  // Get available rewards and milestones
  getRewardOptions: () => api.get('/streaks/rewards'),
  
  // Purchase a streak freeze to protect streak
  purchaseStreakFreeze: (quantity = 1) => api.post('/streaks/freeze/purchase', { quantity }),
  
  // Get streak leaderboard
  getStreakLeaderboard: () => api.get('/streaks/leaderboard'),
  
  // Track an analytics event related to streaks
  trackStreakEvent: async (userId, eventType, eventData = {}) => {
    try {
      const response = await axios.post('/api/analytics/track-event', {
        userId,
        eventType,
        eventData
      });
      return response.data;
    } catch (error) {
      console.error('Error tracking streak event:', error);
      throw error;
    }
  },
  
  // Get experiment variant for a specific feature
  getRewardVariant: async (userId, feature) => {
    try {
      const response = await axios.get('/api/analytics/experiment-variant', {
        params: { userId, feature }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting experiment variant:', error);
      return { success: false, variant: 'control' };
    }
  }
};

// Analytics API functions
export const analyticsAPI = {
  // Get streak engagement metrics (admin only)
  getStreakEngagementMetrics: async (timeframe = 'week') => {
    try {
      const response = await axios.get('/api/analytics/streak-metrics', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching streak metrics:', error);
      throw error;
    }
  }
};

// Experiment API functions
export const experimentAPI = {
  // Get all experiments
  getAllExperiments: async () => {
    try {
      const response = await axios.get('/api/experiments/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching experiments:', error);
      throw error;
    }
  },

  // Create a new experiment
  createExperiment: async (experimentData) => {
    try {
      const response = await axios.post('/api/experiments/create', experimentData);
      return response.data;
    } catch (error) {
      console.error('Error creating experiment:', error);
      throw error;
    }
  },

  // Update an experiment
  updateExperiment: async (id, updateData) => {
    try {
      const response = await axios.put(`/api/experiments/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating experiment:', error);
      throw error;
    }
  },

  // Toggle experiment status (activate/deactivate)
  toggleExperimentStatus: async (id, status) => {
    try {
      const response = await axios.post(`/api/experiments/${id}/toggle`, { status });
      return response.data;
    } catch (error) {
      console.error('Error toggling experiment status:', error);
      throw error;
    }
  },

  // Get experiment results
  getExperimentResults: async (id) => {
    try {
      const response = await axios.get(`/api/experiments/${id}/results`);
      return response.data;
    } catch (error) {
      console.error('Error fetching experiment results:', error);
      throw error;
    }
  },
  
  // Get experiment variant rewards
  getVariantRewards: async (experimentName, variant) => {
    try {
      const response = await axios.get(`/api/experiments/rewards/${experimentName}/${variant}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching variant rewards:', error);
      throw error;
    }
  }
};

// Subscription API service
export const subscriptionAPI = {
  getUserSubscription: () => api.get('/subscription'),
  getSubscriptionTiers: () => api.get('/subscription/tiers'),
  createCheckoutSession: (data) => api.post('/subscription/checkout', data),
  cancelSubscription: () => api.post('/subscription/cancel'),
  checkFeatureAccess: (feature) => api.get(`/subscription/access/${feature}`),
  purchaseAddon: (data) => api.post('/subscription/addon', data)
};

// Premium Content API service
export const premiumContentAPI = {
  getAvailableContent: (filters = {}) => api.get('/premium-content', { params: filters }),
  getContentDetails: (contentId) => api.get(`/premium-content/${contentId}`),
  purchaseContent: (contentId) => api.post(`/premium-content/${contentId}/purchase`),
  getUserPurchasedContent: () => api.get('/premium-content/purchased'),
  updateContentProgress: (contentId, itemId, data) => 
    api.post(`/premium-content/${contentId}/items/${itemId}/progress`, data),
  getUserContentProgress: (contentId) => api.get(`/premium-content/${contentId}/progress`)
};

// Multiplayer API service
export const multiplayerAPI = {
  getActiveCompetitions: () => api.get('/multiplayer/competitions'),
  createCompetition: (data) => api.post('/multiplayer/competitions', data),
  getCompetition: (id) => api.get(`/multiplayer/competitions/${id}`),
  joinCompetition: (id) => api.post(`/multiplayer/competitions/${id}/join`),
  leaveCompetition: (id) => api.post(`/multiplayer/competitions/${id}/leave`),
  completeCompetition: (id, data) => api.post(`/multiplayer/competitions/${id}/complete`, data),
  getCompetitionResults: (id) => api.get(`/multiplayer/competitions/${id}/results`)
};

export default {
  authAPI,
  documentsAPI,
  typingAPI,
  progressAPI,
  streakAPI,
  subscriptionAPI,
  premiumContentAPI,
  multiplayerAPI,
  analyticsAPI,
  experimentAPI
}; 