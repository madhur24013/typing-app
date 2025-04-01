const { expect } = require('chai');
const sinon = require('sinon');
const experimentRewards = require('../models/experimentRewards');
const db = require('../config/database');

describe('Experiment Rewards Tests', () => {
  let dbQueryStub;

  beforeEach(() => {
    // Create a stub for the database query method
    dbQueryStub = sinon.stub(db, 'query');
  });

  afterEach(() => {
    // Restore the stub after each test
    dbQueryStub.restore();
  });

  describe('initializeExperimentRewardsTables', () => {
    it('should create tables and insert initial data if tables are empty', async () => {
      // Stub responses for table creation and initial data check
      dbQueryStub.onFirstCall().resolves([[{ count: 0 }]]); // Empty table
      dbQueryStub.onCall(1).resolves([{ affectedRows: 1 }]); // Control variant insertions
      dbQueryStub.onCall(2).resolves([{ affectedRows: 1 }]); // Variant A insertions
      dbQueryStub.onCall(3).resolves([{ affectedRows: 1 }]); // Variant B insertions

      const result = await experimentRewards.initializeExperimentRewardsTables();
      
      expect(result).to.be.true;
      expect(dbQueryStub.callCount).to.be.at.least(4);
      expect(dbQueryStub.getCall(0).args[0]).to.include('SELECT COUNT(*)');
    });

    it('should not insert data if tables already have data', async () => {
      // Stub responses to indicate tables already have data
      dbQueryStub.onFirstCall().resolves([[{ count: 10 }]]); // Non-empty table

      const result = await experimentRewards.initializeExperimentRewardsTables();
      
      expect(result).to.be.true;
      expect(dbQueryStub.callCount).to.equal(2); // One for create table, one for count
      expect(dbQueryStub.getCall(0).args[0]).to.include('SELECT COUNT(*)');
    });

    it('should throw an error if database operations fail', async () => {
      dbQueryStub.onFirstCall().rejects(new Error('Database error'));

      try {
        await experimentRewards.initializeExperimentRewardsTables();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Database error');
      }
    });
  });

  describe('getVariantRewards', () => {
    it('should return rewards for a specific variant', async () => {
      const mockRewards = [
        { 
          id: 1, 
          milestone: 5, 
          reward_type: 'badge', 
          reward_value: 'beginner_streak', 
          description: '5-Day Streak Badge'
        },
        {
          id: 2,
          milestone: 10,
          reward_type: 'badge',
          reward_value: 'consistent_10',
          description: '10-Day Consistency Badge'
        }
      ];

      dbQueryStub.resolves([mockRewards]);

      const result = await experimentRewards.getVariantRewards('streak_rewards', 'control');
      
      expect(result).to.deep.equal(mockRewards);
      expect(dbQueryStub.calledOnce).to.be.true;
      expect(dbQueryStub.firstCall.args[0]).to.include('WHERE experiment_name =');
      expect(dbQueryStub.firstCall.args[1]).to.deep.equal(['streak_rewards', 'control']);
    });

    it('should throw an error if database query fails', async () => {
      dbQueryStub.rejects(new Error('Failed to get rewards'));

      try {
        await experimentRewards.getVariantRewards('streak_rewards', 'control');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to get rewards');
      }
    });
  });

  describe('getMilestoneReward', () => {
    it('should return a specific milestone reward', async () => {
      const mockReward = {
        id: 1,
        milestone: 5,
        reward_type: 'badge',
        reward_value: 'beginner_streak',
        description: '5-Day Streak Badge'
      };

      dbQueryStub.resolves([[mockReward]]);

      const result = await experimentRewards.getMilestoneReward('streak_rewards', 'control', 5);
      
      expect(result).to.deep.equal(mockReward);
      expect(dbQueryStub.calledOnce).to.be.true;
      expect(dbQueryStub.firstCall.args[0]).to.include('WHERE experiment_name =');
      expect(dbQueryStub.firstCall.args[1]).to.deep.equal(['streak_rewards', 'control', 5]);
    });

    it('should return null if no reward exists for the milestone', async () => {
      dbQueryStub.resolves([[]]);

      const result = await experimentRewards.getMilestoneReward('streak_rewards', 'control', 999);
      
      expect(result).to.be.null;
      expect(dbQueryStub.calledOnce).to.be.true;
    });
  });

  describe('processSurpriseReward', () => {
    it('should process a random points reward correctly', async () => {
      // Stub Math.random to return a predictable value
      const randomStub = sinon.stub(Math, 'random').returns(0.5);
      
      // Points reward should be 20 + (0.5 * 81) = 60.5, which rounds to 60
      dbQueryStub.resolves([{ affectedRows: 1 }]);

      const result = await experimentRewards.processSurpriseReward('random_points', 123);
      
      expect(result.type).to.equal('surprise');
      expect(result.value).to.equal('random_points');
      expect(result.actualReward.type).to.equal('points');
      expect(result.actualReward.amount).to.be.within(20, 100);
      
      expect(dbQueryStub.calledOnce).to.be.true;
      expect(dbQueryStub.firstCall.args[0]).to.include('UPDATE user_progress SET points');
      
      randomStub.restore();
    });

    it('should process a mystery badge reward correctly', async () => {
      // Stub Math.random to return a predictable value
      const randomStub = sinon.stub(Math, 'random').returns(0.5);
      
      dbQueryStub.resolves([{ affectedRows: 1 }]);

      const result = await experimentRewards.processSurpriseReward('mystery_badge', 123);
      
      expect(result.type).to.equal('surprise');
      expect(result.value).to.equal('mystery_badge');
      expect(result.actualReward.type).to.equal('badge');
      expect(['surprise_box', 'lucky_star', 'hidden_gem', 'unexpected_gift']).to.include(result.actualReward.badge);
      
      expect(dbQueryStub.calledOnce).to.be.true;
      expect(dbQueryStub.firstCall.args[0]).to.include('INSERT INTO user_badges');
      
      randomStub.restore();
    });

    it('should process a double points day reward correctly', async () => {
      dbQueryStub.resolves([{ affectedRows: 1 }]);

      const result = await experimentRewards.processSurpriseReward('double_points_day', 123);
      
      expect(result.type).to.equal('surprise');
      expect(result.value).to.equal('double_points_day');
      expect(result.actualReward.type).to.equal('bonus');
      expect(result.actualReward.multiplier).to.equal(2);
      
      expect(dbQueryStub.calledOnce).to.be.true;
      expect(dbQueryStub.firstCall.args[0]).to.include('INSERT INTO user_bonuses');
    });

    it('should handle unknown surprise reward types', async () => {
      const result = await experimentRewards.processSurpriseReward('unknown_type', 123);
      
      expect(result.type).to.equal('surprise');
      expect(result.value).to.equal('unknown_type');
      expect(result.actualReward.type).to.equal('unknown');
      
      expect(dbQueryStub.called).to.be.false;
    });
  });
}); 