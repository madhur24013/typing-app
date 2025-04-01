import api from './api';

class AnalyticsService {
  /**
   * Get user's streak heatmap data
   */
  async getStreakHeatmap() {
    const response = await api.get('/api/analytics/streak-heatmap');
    return response.data;
  }

  /**
   * Get streak consistency data
   */
  async getStreakConsistency() {
    const response = await api.get('/api/analytics/streak-consistency');
    return response.data;
  }

  /**
   * Get performance trends (WPM & accuracy)
   */
  async getPerformanceTrends() {
    const response = await api.get('/api/analytics/performance-trends');
    return response.data;
  }

  /**
   * Get personal bests and records
   */
  async getPersonalBests() {
    const response = await api.get('/api/analytics/personal-bests');
    return response.data;
  }

  /**
   * Get daily improvement score
   */
  async getDailyImprovement() {
    const response = await api.get('/api/analytics/daily-improvement');
    return response.data;
  }

  /**
   * Get milestone progress
   */
  async getMilestoneProgress() {
    const response = await api.get('/api/analytics/milestones');
    return response.data;
  }

  /**
   * Get streak stamina rating
   */
  async getStaminaRating() {
    const response = await api.get('/api/analytics/stamina-rating');
    return response.data;
  }

  /**
   * Get upcoming rewards
   */
  async getUpcomingRewards() {
    const response = await api.get('/api/analytics/upcoming-rewards');
    return response.data;
  }

  /**
   * Get competitive rankings
   */
  async getCompetitiveRankings() {
    const response = await api.get('/api/analytics/rankings');
    return response.data;
  }

  /**
   * Get friend comparisons
   */
  async getFriendComparisons() {
    const response = await api.get('/api/analytics/friend-comparisons');
    return response.data;
  }

  /**
   * Track a user action for analytics
   */
  async trackAction(action, metadata = {}) {
    await api.post('/api/analytics/track', {
      action,
      metadata,
      timestamp: new Date().toISOString()
    });
  }
}

export default new AnalyticsService(); 