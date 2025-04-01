const { pool } = require('../../config/database');
const { getAvailableRewards, getRewardHistory, claimReward, useStreakFreeze } = require('../rewardsController');
const { logError } = require('../../utils/logger');

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../utils/logger');

describe('Rewards Controller', () => {
  let mockReq;
  let mockRes;
  let mockClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request and response
    mockReq = {
      user: { id: 1 },
      params: {},
      query: {}
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
  });

  describe('getAvailableRewards', () => {
    it('returns available rewards for user with existing streak', async () => {
      const mockStreak = { current_streak: 5 };
      const mockRewards = [
        { id: 1, name: 'Reward 1', required_streak: 3, claimed: false },
        { id: 2, name: 'Reward 2', required_streak: 5, claimed: true }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockStreak] }) // streak query
        .mockResolvedValueOnce({ rows: mockRewards }) // rewards query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }); // count query

      await getAvailableRewards(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        rewards: mockRewards,
        currentStreak: 5,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasMore: false
        }
      });
    });

    it('creates streak record if it does not exist', async () => {
      const mockNewStreak = { current_streak: 0 };
      const mockRewards = [
        { id: 1, name: 'Reward 1', required_streak: 0, claimed: false }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // streak query
        .mockResolvedValueOnce({ rows: [mockNewStreak] }) // create streak query
        .mockResolvedValueOnce({ rows: mockRewards }); // rewards query

      await getAvailableRewards(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_streaks'),
        [1]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        rewards: mockRewards,
        currentStreak: 0
      });
    });

    it('handles database errors gracefully', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValueOnce(error);

      await getAvailableRewards(mockReq, mockRes);

      expect(logError).toHaveBeenCalledWith('Error in getAvailableRewards:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch available rewards',
        details: expect.any(String)
      });
    });
  });

  describe('getRewardHistory', () => {
    it('returns paginated reward history', async () => {
      const mockHistory = [
        { id: 1, claimed_at: '2024-03-20', name: 'Reward 1' },
        { id: 2, claimed_at: '2024-03-19', name: 'Reward 2' }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: mockHistory }) // history query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }); // count query

      await getRewardHistory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        history: mockHistory,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasMore: false
        }
      });
    });

    it('handles database errors gracefully', async () => {
      const error = new Error('Database error');
      mockClient.query.mockRejectedValueOnce(error);

      await getRewardHistory(mockReq, mockRes);

      expect(logError).toHaveBeenCalledWith('Error in getRewardHistory:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch reward history',
        details: expect.any(String)
      });
    });
  });

  describe('claimReward', () => {
    it('successfully claims a reward', async () => {
      const rewardId = 1;
      mockReq.params.rewardId = rewardId;

      const mockReward = {
        id: rewardId,
        reward_type: 'bonus_points',
        reward_value: 100,
        required_streak: 3
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockReward] }) // reward query
        .mockResolvedValueOnce({ rows: [{ current_streak: 5 }] }) // streak query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // claim query
        .mockResolvedValueOnce({ rows: [{ points: 200 }] }); // points update query

      await claimReward(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        claimed: { id: 1 },
        reward: mockReward,
        effect: {
          type: 'bonus_points',
          points: 100,
          newTotal: 200
        }
      });
    });

    it('handles already claimed rewards', async () => {
      const rewardId = 1;
      mockReq.params.rewardId = rewardId;

      const mockReward = {
        id: rewardId,
        claimed_at: new Date().toISOString()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockReward] });

      await claimReward(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Reward already claimed'
      });
    });

    it('handles insufficient streak for reward', async () => {
      const rewardId = 1;
      mockReq.params.rewardId = rewardId;

      const mockReward = {
        id: rewardId,
        required_streak: 10
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockReward] }) // reward query
        .mockResolvedValueOnce({ rows: [{ current_streak: 5 }] }); // streak query

      await claimReward(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient streak to claim reward',
        requiredStreak: 10,
        currentStreak: 5
      });
    });

    it('handles database errors gracefully', async () => {
      const rewardId = 1;
      mockReq.params.rewardId = rewardId;

      const error = new Error('Database error');
      mockClient.query.mockRejectedValueOnce(error);

      await claimReward(mockReq, mockRes);

      expect(logError).toHaveBeenCalledWith('Error in claimReward:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to claim reward',
        details: expect.any(String)
      });
    });
  });

  describe('useStreakFreeze', () => {
    it('successfully uses a streak freeze', async () => {
      const freezeId = 1;
      mockReq.params.freezeId = freezeId;

      const mockFreeze = {
        id: freezeId,
        duration_days: 1
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockFreeze] }) // freeze query
        .mockResolvedValueOnce({ rows: [{ id: freezeId }] }) // use freeze query
        .mockResolvedValueOnce({ rows: [{ current_streak: 5 }] }); // streak update query

      await useStreakFreeze(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        freeze: { id: freezeId },
        streakProtected: true,
        currentStreak: 5
      });
    });

    it('handles non-existent or used freezes', async () => {
      const freezeId = 1;
      mockReq.params.freezeId = freezeId;

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await useStreakFreeze(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Streak freeze not found or already used'
      });
    });

    it('handles database errors gracefully', async () => {
      const freezeId = 1;
      mockReq.params.freezeId = freezeId;

      const error = new Error('Database error');
      mockClient.query.mockRejectedValueOnce(error);

      await useStreakFreeze(mockReq, mockRes);

      expect(logError).toHaveBeenCalledWith('Error in useStreakFreeze:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to use streak freeze',
        details: expect.any(String)
      });
    });
  });
}); 