import axios from 'axios';
import {
  getUserStreak,
  updateStreak,
  getActiveBattles,
  getPendingBattles,
  createBattle,
  respondToBattle,
  getTeamStreaks,
  joinTeam,
  leaveTeam,
  getStreakAnalytics,
  getStreakRewards,
  claimReward,
  getStreakFreezes,
  purchaseFreeze
} from '../streakService';

// Mock axios
jest.mock('axios');

describe('streakService', () => {
  const mockToken = 'mock-token';
  const mockUserId = '123';

  beforeEach(() => {
    // Set up auth token
    localStorage.setItem('token', mockToken);
    localStorage.setItem('userId', mockUserId);
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getUserStreak', () => {
    it('fetches user streak data successfully', async () => {
      const mockResponse = {
        data: {
          currentStreak: 5,
          longestStreak: 10,
          lastActivityDate: '2024-03-19'
        }
      };
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await getUserStreak();

      expect(axios.get).toHaveBeenCalledWith(
        `/api/streaks/user/${mockUserId}`,
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('handles error when fetching user streak', async () => {
      const error = new Error('Failed to fetch streak');
      axios.get.mockRejectedValueOnce(error);

      await expect(getUserStreak()).rejects.toThrow('Failed to fetch streak');
    });
  });

  describe('updateStreak', () => {
    it('updates user streak successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          newStreak: 6
        }
      };
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await updateStreak();

      expect(axios.post).toHaveBeenCalledWith(
        `/api/streaks/update`,
        {},
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('handles error when updating streak', async () => {
      const error = new Error('Failed to update streak');
      axios.post.mockRejectedValueOnce(error);

      await expect(updateStreak()).rejects.toThrow('Failed to update streak');
    });
  });

  describe('battle operations', () => {
    it('fetches active battles successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            challenger_username: 'user1',
            opponent_username: 'user2',
            challenger_streak: 5,
            opponent_streak: 3
          }
        ]
      };
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await getActiveBattles();

      expect(axios.get).toHaveBeenCalledWith(
        `/api/streaks/battles/active`,
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('creates a new battle successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          battleId: 1
        }
      };
      axios.post.mockResolvedValueOnce(mockResponse);

      const opponentId = '456';
      const duration = 7;
      const result = await createBattle(opponentId, duration);

      expect(axios.post).toHaveBeenCalledWith(
        `/api/streaks/battles`,
        { opponentId, duration },
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('responds to battle challenge successfully', async () => {
      const mockResponse = {
        data: {
          success: true
        }
      };
      axios.post.mockResolvedValueOnce(mockResponse);

      const battleId = 1;
      const accepted = true;
      const result = await respondToBattle(battleId, accepted);

      expect(axios.post).toHaveBeenCalledWith(
        `/api/streaks/battles/${battleId}/respond`,
        { accepted },
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('team operations', () => {
    it('fetches team streaks successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            name: 'Team A',
            currentStreak: 5,
            memberCount: 3
          }
        ]
      };
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await getTeamStreaks();

      expect(axios.get).toHaveBeenCalledWith(
        `/api/streaks/teams`,
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('joins a team successfully', async () => {
      const mockResponse = {
        data: {
          success: true
        }
      };
      axios.post.mockResolvedValueOnce(mockResponse);

      const teamId = 1;
      const result = await joinTeam(teamId);

      expect(axios.post).toHaveBeenCalledWith(
        `/api/streaks/teams/${teamId}/join`,
        {},
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('rewards and freezes', () => {
    it('fetches streak rewards successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            type: 'STREAK_FREEZE',
            requiredStreak: 5
          }
        ]
      };
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await getStreakRewards();

      expect(axios.get).toHaveBeenCalledWith(
        `/api/streaks/rewards`,
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('claims a reward successfully', async () => {
      const mockResponse = {
        data: {
          success: true
        }
      };
      axios.post.mockResolvedValueOnce(mockResponse);

      const rewardId = 1;
      const result = await claimReward(rewardId);

      expect(axios.post).toHaveBeenCalledWith(
        `/api/streaks/rewards/${rewardId}/claim`,
        {},
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('purchases a streak freeze successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          freezeId: 1
        }
      };
      axios.post.mockResolvedValueOnce(mockResponse);

      const duration = 24;
      const result = await purchaseFreeze(duration);

      expect(axios.post).toHaveBeenCalledWith(
        `/api/streaks/freezes`,
        { duration },
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('analytics', () => {
    it('fetches streak analytics successfully', async () => {
      const mockResponse = {
        data: {
          weeklyActivity: [5, 3, 7, 4, 6, 2, 1],
          streakDistribution: {
            '1-7': 10,
            '8-14': 5,
            '15+': 2
          }
        }
      };
      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await getStreakAnalytics();

      expect(axios.get).toHaveBeenCalledWith(
        `/api/streaks/analytics`,
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });
  });
}); 