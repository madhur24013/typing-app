const { expect } = require('chai');
const sinon = require('sinon');
const streakModel = require('../models/streaks');
const db = require('../config/database');

describe('Streak System Tests', () => {
  let dbQueryStub;
  let clock;

  beforeEach(() => {
    // Create a stub for the database query method
    dbQueryStub = sinon.stub(db, 'query');
    
    // Use fake timers for date manipulation
    clock = sinon.useFakeTimers(new Date('2023-06-01T12:00:00Z').getTime());
  });

  afterEach(() => {
    // Restore the stub and clock after each test
    dbQueryStub.restore();
    clock.restore();
  });

  describe('updateUserStreak', () => {
    it('should initialize streak for a new user', async () => {
      // First call to check if streak exists - returns empty
      dbQueryStub.onFirstCall().resolves([[]]);
      
      // Second call for streak initialization - returns success
      dbQueryStub.onSecondCall().resolves([{ insertId: 1 }]);
      
      // Third call for retrieving the new streak - returns the initialized streak
      dbQueryStub.onThirdCall().resolves([[{
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        streakFreezeUsed: false,
        streakFreezeCount: 0
      }]]);
      
      // Fourth call for updating streak - returns success
      dbQueryStub.onCall(3).resolves([{ affectedRows: 1 }]);

      const result = await streakModel.updateUserStreak(1);
      
      expect(result).to.be.an('object');
      expect(result.currentStreak).to.equal(1);
      expect(result.streakUpdated).to.be.true;
      expect(result.streakIncreased).to.be.true;
      
      // Verify correct database calls
      expect(dbQueryStub.getCall(0).args[0]).to.include('SELECT');
      expect(dbQueryStub.getCall(1).args[0]).to.include('INSERT');
      expect(dbQueryStub.getCall(3).args[0]).to.include('UPDATE');
    });

    it('should increment streak for consecutive days', async () => {
      const yesterday = new Date('2023-05-31T12:00:00Z').toISOString().split('T')[0];
      
      // First call returns existing streak data
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: yesterday,
        streakFreezeUsed: false,
        streakFreezeCount: 1
      }]]);
      
      // Second call for updating the streak
      dbQueryStub.onSecondCall().resolves([{ affectedRows: 1 }]);

      const result = await streakModel.updateUserStreak(1);
      
      expect(result).to.be.an('object');
      expect(result.currentStreak).to.equal(6);
      expect(result.streakUpdated).to.be.true;
      expect(result.streakIncreased).to.be.true;
      
      // Verify database update call had the correct values
      const updateCall = dbQueryStub.getCall(1);
      expect(updateCall.args[0]).to.include('UPDATE user_streaks');
      expect(updateCall.args[1]).to.include(6); // currentStreak
      expect(updateCall.args[1]).to.include(10); // longestStreak should stay the same
    });

    it('should update longest streak when current streak exceeds it', async () => {
      const yesterday = new Date('2023-05-31T12:00:00Z').toISOString().split('T')[0];
      
      // First call returns existing streak data where currentStreak equals longestStreak
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 10,
        longestStreak: 10,
        lastActivityDate: yesterday,
        streakFreezeUsed: false,
        streakFreezeCount: 1
      }]]);
      
      // Second call for updating the streak
      dbQueryStub.onSecondCall().resolves([{ affectedRows: 1 }]);

      const result = await streakModel.updateUserStreak(1);
      
      expect(result.currentStreak).to.equal(11);
      
      // Verify database update
      const updateCall = dbQueryStub.getCall(1);
      expect(updateCall.args[1]).to.include(11); // New currentStreak
      expect(updateCall.args[1]).to.include(11); // New longestStreak
    });

    it('should not increase streak for same-day activity', async () => {
      const today = new Date('2023-06-01T12:00:00Z').toISOString().split('T')[0];
      
      // First call returns existing streak data with today's date
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: today, // Already logged activity today
        streakFreezeUsed: false,
        streakFreezeCount: 1
      }]]);
      
      // Second call for updating practice count only
      dbQueryStub.onSecondCall().resolves([{ affectedRows: 1 }]);

      const result = await streakModel.updateUserStreak(1);
      
      expect(result.currentStreak).to.equal(5); // No change
      expect(result.streakUpdated).to.be.false;
      expect(result.streakIncreased).to.be.false;
      
      // Verify we only update the practice count, not the streak
      const updateCall = dbQueryStub.getCall(1);
      expect(updateCall.args[0]).to.include('totalPracticeCount');
      expect(updateCall.args[0]).not.to.include('currentStreak');
    });

    it('should reset streak when more than one day is missed', async () => {
      const threeDaysAgo = new Date('2023-05-29T12:00:00Z').toISOString().split('T')[0];
      
      // First call returns existing streak data from 3 days ago
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 15,
        longestStreak: 20,
        lastActivityDate: threeDaysAgo,
        streakFreezeUsed: false,
        streakFreezeCount: 0
      }]]);
      
      // Second call for updating the streak (reset to 1)
      dbQueryStub.onSecondCall().resolves([{ affectedRows: 1 }]);

      const result = await streakModel.updateUserStreak(1);
      
      expect(result.currentStreak).to.equal(1); // Reset to 1
      expect(result.streakUpdated).to.be.true;
      expect(result.streakIncreased).to.be.false;
      
      // Verify database update resets streak but keeps longestStreak
      const updateCall = dbQueryStub.getCall(1);
      expect(updateCall.args[1]).to.include(1); // Reset currentStreak
      expect(updateCall.args[1]).to.include(20); // Maintain longestStreak
    });

    it('should use streak freeze when one day is missed and user has freezes', async () => {
      const twoDaysAgo = new Date('2023-05-30T12:00:00Z').toISOString().split('T')[0];
      
      // First call returns existing streak data from 2 days ago
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 7,
        longestStreak: 10,
        lastActivityDate: twoDaysAgo,
        streakFreezeUsed: false,
        streakFreezeCount: 2
      }]]);
      
      // Second call for updating the streak (using freeze)
      dbQueryStub.onSecondCall().resolves([{ affectedRows: 1 }]);

      const result = await streakModel.updateUserStreak(1);
      
      expect(result.streakUpdated).to.be.true;
      
      // Verify database update uses streak freeze
      const updateCall = dbQueryStub.getCall(1);
      expect(updateCall.args[1]).to.include(7); // Maintain currentStreak
      expect(updateCall.args[1]).to.include(false); // Reset streakFreezeUsed
      expect(updateCall.args[1]).to.include(1); // Decrement streakFreezeCount
    });

    it('should not use streak freeze when already used', async () => {
      const twoDaysAgo = new Date('2023-05-30T12:00:00Z').toISOString().split('T')[0];
      
      // First call returns existing streak data from 2 days ago with freeze already used
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 7,
        longestStreak: 10,
        lastActivityDate: twoDaysAgo,
        streakFreezeUsed: true, // Already used
        streakFreezeCount: 1
      }]]);
      
      // Second call for updating the streak (reset to 1)
      dbQueryStub.onSecondCall().resolves([{ affectedRows: 1 }]);

      const result = await streakModel.updateUserStreak(1);
      
      expect(result.currentStreak).to.equal(1); // Reset to 1
      
      // Verify database update resets streak
      const updateCall = dbQueryStub.getCall(1);
      expect(updateCall.args[1][0]).to.equal(1); // Reset currentStreak
    });
  });

  describe('getUserStreakData', () => {
    it('should initialize streak data if not found', async () => {
      // First call returns no streak data
      dbQueryStub.onFirstCall().resolves([[]]);
      
      // Second call for initializing streak
      dbQueryStub.onSecondCall().resolves([{ insertId: 1 }]);
      
      // Third call for retrieving the newly created streak data
      dbQueryStub.onThirdCall().resolves([[{
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        streakFreezeCount: 0,
        totalPracticeCount: 0
      }]]);
      
      // Fourth call for retrieving recent activity
      dbQueryStub.onCall(3).resolves([[]]);
      
      // Fifth call for retrieving next reward
      dbQueryStub.onCall(4).resolves([[]]);

      const result = await streakModel.getUserStreakData(1);
      
      expect(result).to.be.an('object');
      expect(result.currentStreak).to.equal(0);
      expect(result.nextMilestone).to.equal(5); // First milestone
      expect(result.daysToNextMilestone).to.equal(5);
    });

    it('should return complete streak data with activity and rewards', async () => {
      // First call returns streak data
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 8,
        longestStreak: 15,
        lastActivityDate: '2023-06-01',
        streakFreezeCount: 1,
        totalPracticeCount: 42
      }]]);
      
      // Second call returns recent activity
      dbQueryStub.onSecondCall().resolves([[
        {
          date: '2023-06-01',
          practiceCount: 3,
          totalTypingTime: 1500,
          charactersTyped: 5000,
          wordsTyped: 1000,
          averageWPM: 65.5,
          averageAccuracy: 98.2
        },
        {
          date: '2023-05-31',
          practiceCount: 2,
          totalTypingTime: 1200,
          charactersTyped: 4200,
          wordsTyped: 840,
          averageWPM: 60.2,
          averageAccuracy: 97.5
        }
      ]]);
      
      // Third call returns next reward
      dbQueryStub.onThirdCall().resolves([[{
        id: 4,
        streakMilestone: 10,
        rewardType: 'badge',
        rewardValue: 'consistent_10',
        description: '10-Day Consistency Badge',
        isActive: true
      }]]);

      const result = await streakModel.getUserStreakData(1);
      
      expect(result).to.be.an('object');
      expect(result.currentStreak).to.equal(8);
      expect(result.longestStreak).to.equal(15);
      expect(result.recentActivity).to.be.an('array').with.lengthOf(2);
      expect(result.nextMilestone).to.equal(10);
      expect(result.nextReward).to.be.an('object');
      expect(result.nextReward.description).to.equal('10-Day Consistency Badge');
      expect(result.daysToNextMilestone).to.equal(2);
    });
  });

  describe('claimStreakReward', () => {
    it('should not allow claiming for unearned milestones', async () => {
      // First call checks if user has reached milestone
      dbQueryStub.onFirstCall().resolves([[]]);
      
      try {
        await streakModel.claimStreakReward(1, 10);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('not reached this streak milestone');
      }
    });

    it('should allow claiming a milestone reward', async () => {
      const today = new Date('2023-06-01T12:00:00Z').toISOString().split('T')[0];
      
      // First call checks if user has reached milestone
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 10
      }]]);
      
      // Second call gets the reward
      dbQueryStub.onSecondCall().resolves([[{
        id: 4,
        streakMilestone: 10,
        rewardType: 'badge',
        rewardValue: 'consistent_10',
        description: '10-Day Consistency Badge',
        isActive: true
      }]]);
      
      // Third call checks if reward was already claimed
      dbQueryStub.onThirdCall().resolves([[]]);
      
      // Fourth call for inserting claim record
      dbQueryStub.onCall(3).resolves([{ insertId: 1 }]);

      const result = await streakModel.claimStreakReward(1, 10);
      
      expect(result).to.be.an('object');
      expect(result.success).to.be.true;
      expect(result.reward.type).to.equal('badge');
      expect(result.reward.value).to.equal('consistent_10');
    });

    it('should prevent claiming already claimed rewards', async () => {
      const today = new Date('2023-06-01T12:00:00Z').toISOString().split('T')[0];
      
      // First call checks if user has reached milestone
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 10
      }]]);
      
      // Second call gets the reward
      dbQueryStub.onSecondCall().resolves([[{
        id: 4,
        streakMilestone: 10,
        rewardType: 'badge',
        rewardValue: 'consistent_10',
        description: '10-Day Consistency Badge',
        isActive: true
      }]]);
      
      // Third call checks if reward was already claimed - returns claimed
      dbQueryStub.onThirdCall().resolves([[{
        rewardsClaimed: JSON.stringify([{
          milestone: 10,
          rewardId: 4,
          claimedAt: '2023-06-01T10:00:00Z'
        }])
      }]]);
      
      try {
        await streakModel.claimStreakReward(1, 10);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('already been claimed');
      }
    });
  });

  describe('Integration scenarios', () => {
    it('should handle a complex streak pattern - daily activity for a week', async () => {
      let date = new Date('2023-06-01T12:00:00Z');
      
      // Setup db stubs for a new user
      dbQueryStub.onFirstCall().resolves([[]]);
      dbQueryStub.onSecondCall().resolves([{ insertId: 1 }]);
      
      // Initialize user and verify streak is 1
      await streakModel.initializeUserStreak(1);
      
      // First day activity (June 1)
      dbQueryStub.reset();
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        streakFreezeUsed: false,
        streakFreezeCount: 0
      }]]);
      dbQueryStub.onSecondCall().resolves([{ affectedRows: 1 }]);
      
      let result = await streakModel.updateUserStreak(1);
      expect(result.currentStreak).to.equal(1);
      
      // Advance clock one day (June 2)
      clock.tick(24 * 60 * 60 * 1000);
      date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      // Second day activity
      dbQueryStub.reset();
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: '2023-06-01',
        streakFreezeUsed: false,
        streakFreezeCount: 0
      }]]);
      dbQueryStub.onSecondCall().resolves([{ affectedRows: 1 }]);
      
      result = await streakModel.updateUserStreak(1);
      expect(result.currentStreak).to.equal(2);
      
      // Advance clock one day (June 3)
      clock.tick(24 * 60 * 60 * 1000);
      date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      // Third day activity
      dbQueryStub.reset();
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 2,
        longestStreak: 2,
        lastActivityDate: '2023-06-02',
        streakFreezeUsed: false,
        streakFreezeCount: 0
      }]]);
      dbQueryStub.onSecondCall().resolves([{ affectedRows: 1 }]);
      
      result = await streakModel.updateUserStreak(1);
      expect(result.currentStreak).to.equal(3);
      
      // Skip a day (June 4 - no activity)
      clock.tick(24 * 60 * 60 * 1000);
      
      // Add streak freeze to user
      dbQueryStub.reset();
      dbQueryStub.onFirstCall().resolves([{ affectedRows: 1 }]);
      await streakModel.addStreakFreeze(1, 1);
      
      // Advance clock another day (June 5)
      clock.tick(24 * 60 * 60 * 1000);
      
      // Activity after missing a day, but with streak freeze
      dbQueryStub.reset();
      dbQueryStub.onFirstCall().resolves([[{
        currentStreak: 3,
        longestStreak: 3,
        lastActivityDate: '2023-06-03',
        streakFreezeUsed: false,
        streakFreezeCount: 1
      }]]);
      dbQueryStub.onSecondCall().resolves([{ affectedRows: 1 }]);
      
      result = await streakModel.updateUserStreak(1);
      expect(result.streakUpdated).to.be.true;
      // Streak is preserved with freeze
      expect(result.currentStreak).to.equal(3);
    });
  });
}); 