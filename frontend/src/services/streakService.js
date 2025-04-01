import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Helper function to make authenticated API requests with proper error handling
 * @param {Function} apiCall - Async function that makes the API call
 * @returns {Promise<any>} - Response data or throws an error
 */
const safeApiCall = async (apiCall) => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    // Add request details to the error for better debugging
    if (error.config) {
      error.requestDetails = {
        url: error.config.url,
        method: error.config.method,
        data: error.config.data
      };
    }
    
    console.error('API call failed:', error);
    throw error;
  }
};

/**
 * Get auth header with token
 * @returns {Object} - Header object with Authorization
 */
const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// Streak Management
export const getUserStreak = async () => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/user`, getAuthHeader())
  );
};

export const updateStreak = async (activity) => {
  return safeApiCall(() => 
    axios.post(`${API_URL}/streaks/update`, { activity }, getAuthHeader())
  );
};

export const checkStreakDanger = async () => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/danger`, getAuthHeader())
  );
};

export const getRecoveryChallenge = async () => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/recovery`, getAuthHeader())
  );
};

export const completeRecoveryChallenge = async (challengeId) => {
  return safeApiCall(() => 
    axios.post(`${API_URL}/streaks/recovery/${challengeId}/complete`, {}, getAuthHeader())
  );
};

// Streak Battles
export const getActiveBattles = async () => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/battles/active`, getAuthHeader())
  );
};

export const getPendingBattles = async () => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/battles/pending`, getAuthHeader())
  );
};

export const createBattle = async (friendId, duration) => {
  return safeApiCall(() => 
    axios.post(`${API_URL}/streaks/battles`, { friendId, duration }, getAuthHeader())
  );
};

export const respondToBattle = async (battleId, accepted) => {
  return safeApiCall(() => 
    axios.put(`${API_URL}/streaks/battles/${battleId}/respond`, { accepted }, getAuthHeader())
  );
};

export const getBattleDetails = async (battleId) => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/battles/${battleId}`, getAuthHeader())
  );
};

// Team Streaks
export const getTeamStreaks = async () => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/teams`, getAuthHeader())
  );
};

export const joinTeam = async (teamId) => {
  return safeApiCall(() => 
    axios.post(`${API_URL}/streaks/teams/${teamId}/join`, {}, getAuthHeader())
  );
};

export const createTeam = async (teamData) => {
  return safeApiCall(() => 
    axios.post(`${API_URL}/streaks/teams`, teamData, getAuthHeader())
  );
};

export const leaveTeam = async (teamId) => {
  return safeApiCall(() => 
    axios.delete(`${API_URL}/streaks/teams/${teamId}/members/me`, getAuthHeader())
  );
};

// Streak Analytics
export const getStreakAnalytics = async (range = '30days') => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/analytics`, {
      ...getAuthHeader(),
      params: { range }
    })
  );
};

export const trackStreakEvent = async (eventType, eventData = {}) => {
  return safeApiCall(() => 
    axios.post(`${API_URL}/analytics/events`, {
      eventType,
      eventData,
      source: 'streak-system'
    }, getAuthHeader())
  );
};

// Streak Rewards
export const claimReward = async (rewardId) => {
  return safeApiCall(() => 
    axios.post(`${API_URL}/streaks/rewards/${rewardId}/claim`, {}, getAuthHeader())
  );
};

export const getAvailableRewards = async () => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/rewards`, getAuthHeader())
  );
};

export const getRewardHistory = async (page = 1, limit = 10) => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/rewards/history`, {
      ...getAuthHeader(),
      params: { page, limit }
    })
  );
};

// Streak Freezes
export const getStreakFreezes = async () => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/freezes`, getAuthHeader())
  );
};

export const useStreakFreeze = async (freezeId) => {
  return safeApiCall(() => 
    axios.post(`${API_URL}/streaks/freezes/${freezeId}/use`, {}, getAuthHeader())
  );
};

export const purchaseStreakFreeze = async () => {
  return safeApiCall(() => 
    axios.post(`${API_URL}/streaks/freezes/purchase`, {}, getAuthHeader())
  );
};

// Streak Settings
export const getStreakSettings = async () => {
  return safeApiCall(() => 
    axios.get(`${API_URL}/streaks/settings`, getAuthHeader())
  );
};

export const updateStreakSettings = async (settings) => {
  return safeApiCall(() => 
    axios.put(`${API_URL}/streaks/settings`, settings, getAuthHeader())
  );
}; 