import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFire, FaTrophy, FaGift, FaLock, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import { GiFireShield } from 'react-icons/gi';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { streakAPI } from '../../services/api';
import AnimatedStreakCounter from './AnimatedStreakCounter';

/**
 * EnhancedStreakDisplay
 * An improved streak display with animation, rewards, and psychological triggers
 */
const EnhancedStreakDisplay = ({ onMilestoneClick, className = '' }) => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState(null);
  const [rankData, setRankData] = useState(null);
  const [dangerData, setDangerData] = useState(null);
  const [dailyReward, setDailyReward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [surpriseAnimation, setSurpriseAnimation] = useState(false);

  // Fetch all streak-related data
  useEffect(() => {
    const fetchStreakData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Regular streak data from the base API
        const streakResponse = await streakAPI.getUserStreak();
        setStreakData(streakResponse.data);
        
        // Get streak rank data
        const rankResponse = await fetch('/api/streaks/enhanced/rank', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (rankResponse.ok) {
          const rankJson = await rankResponse.json();
          setRankData(rankJson.rankData);
        }
        
        // Check for streak danger
        const dangerResponse = await fetch('/api/streaks/enhanced/danger-check', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (dangerResponse.ok) {
          const dangerJson = await dangerResponse.json();
          setDangerData(dangerJson.dangerData);
        }
        
        // Get daily reward or surprise
        const rewardResponse = await fetch('/api/streaks/enhanced/daily-reward', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (rewardResponse.ok) {
          const rewardJson = await rewardResponse.json();
          
          if (rewardJson.success) {
            setDailyReward(rewardJson);
            
            // If it's a surprise reward, show animation after a delay
            if (rewardJson.rewardType === 'surprise') {
              setTimeout(() => {
                setSurpriseAnimation(true);
                setShowRewardModal(true);
              }, 1500);
            }
          }
        }
        
        // Track analytics event
        streakAPI.trackStreakEvent('enhanced_streak_viewed', {
          currentStreak: streakResponse.data.currentStreak,
          dangerLevel: dangerJson?.dangerData?.dangerLevel || 'none',
          rewardType: rewardJson?.rewardType || 'none'
        }).catch(e => console.log('Analytics error:', e));
        
      } catch (error) {
        console.error('Error fetching enhanced streak data:', error);
        setError('Could not load streak data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStreakData();
  }, [user]);

  // Handle milestone click
  const handleMilestoneClick = () => {
    if (onMilestoneClick) {
      onMilestoneClick(streakData.nextMilestone, streakData.nextReward);
    } else {
      setShowMilestoneModal(true);
      
      // Track milestone modal open for analytics
      streakAPI.trackStreakEvent('milestone_modal_opened', {
        currentStreak: streakData.currentStreak,
        nextMilestone: streakData.nextMilestone
      }).catch(e => console.log('Analytics error:', e));
    }
  };
  
  // Handle claiming a reward
  const handleClaimReward = async (milestone) => {
    try {
      const result = await streakAPI.claimReward(milestone);
      
      // Close the milestone modal
      setShowMilestoneModal(false);
      
      // Refresh streak data
      const response = await streakAPI.getUserStreak();
      setStreakData(response.data);
      
      // Get updated rank data
      const rankResponse = await fetch('/api/streaks/enhanced/rank', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (rankResponse.ok) {
        const rankJson = await rankResponse.json();
        setRankData(rankJson.rankData);
      }
      
      // Track reward claim for analytics
      streakAPI.trackStreakEvent('reward_claimed', {
        milestone,
        rewardType: result.reward.type,
        rewardValue: result.reward.value
      }).catch(e => console.log('Analytics error:', e));
      
      return result;
    } catch (error) {
      console.error('Error claiming reward:', error);
      // Show error notification
      return null;
    }
  };
  
  // Handle freeze purchase
  const handlePurchaseFreeze = async () => {
    try {
      await streakAPI.purchaseStreakFreeze();
      
      // Refresh streak data
      const response = await streakAPI.getUserStreak();
      setStreakData(response.data);
      
      // Refresh danger data
      const dangerResponse = await fetch('/api/streaks/enhanced/danger-check', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (dangerResponse.ok) {
        const dangerJson = await dangerResponse.json();
        setDangerData(dangerJson.dangerData);
      }
      
      // Track freeze purchase for analytics
      streakAPI.trackStreakEvent('streak_freeze_purchased', {
        currentStreak: streakData.currentStreak,
        dangerLevel: dangerData?.dangerLevel || 'none'
      }).catch(e => console.log('Analytics error:', e));
      
    } catch (error) {
      console.error('Error purchasing streak freeze:', error);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-300 dark:bg-gray-700 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`text-sm text-red-500 p-4 ${className}`}>
        {error}
      </div>
    );
  }

  // If no user or streak data, show nothing
  if (!user || !streakData) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 ${className}`}>
      {/* Streak Header with Counter */}
      <div className="flex items-center justify-between mb-4">
        <AnimatedStreakCounter
          streak={streakData.currentStreak}
          size="large"
          showRank={true}
          danger={dangerData?.inDanger}
          hoursRemaining={dangerData?.hoursRemaining}
          pulseOnMount={true}
        />
        
        {/* Streak Protection */}
        {streakData.streakFreezeCount > 0 && (
          <motion.div 
            className="flex items-center text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full"
            whileHover={{ scale: 1.05 }}
          >
            <GiFireShield className="mr-1" />
            <span>{streakData.streakFreezeCount} Freeze{streakData.streakFreezeCount !== 1 ? 's' : ''}</span>
          </motion.div>
        )}
      </div>
      
      {/* Streak Records */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex items-center">
          <FaTrophy className="mr-1 text-yellow-500" />
          <span>Best: {streakData.longestStreak} days</span>
        </div>
        <div>
          Total practice sessions: {streakData.totalPracticeCount}
        </div>
      </div>
      
      {/* Danger Alert */}
      <AnimatePresence>
        {dangerData?.inDanger && (
          <motion.div 
            className={`mb-4 p-3 rounded-md flex items-center ${
              dangerData.dangerLevel === 'critical' 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <FaExclamationTriangle className="mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">
                {dangerData.dangerLevel === 'critical' 
                  ? 'Critical! Your streak is about to expire!' 
                  : 'Warning! Protect your streak today!'}
              </p>
              <p className="text-sm">
                {dangerData.hoursRemaining <= 0 
                  ? 'Only minutes remaining to practice today!' 
                  : `${dangerData.hoursRemaining} hours, ${dangerData.minutesRemaining} minutes left`}
              </p>
            </div>
            
            {/* Streak protect button */}
            {dangerData.hasFreezes ? (
              <button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium"
                onClick={() => console.log('Apply streak freeze')}
              >
                Use Freeze
              </button>
            ) : (
              <button 
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium"
                onClick={handlePurchaseFreeze}
              >
                Get Freeze
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Progress to Next Milestone */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Current: {streakData.currentStreak}</span>
          <span>Next: {streakData.nextMilestone}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
          <motion.div 
            className="h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
            initial={{ width: 0 }}
            animate={{ 
              width: `${Math.min(100, (streakData.currentStreak / streakData.nextMilestone) * 100)}%` 
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {streakData.daysToNextMilestone} days to {streakData.nextReward?.description || 'next milestone'}
          </span>
          <button 
            onClick={handleMilestoneClick}
            className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded-md transition-colors flex items-center"
          >
            <FaGift className="mr-1 text-purple-500" />
            View Rewards
          </button>
        </div>
      </div>
      
      {/* Daily Reward or Surprise (if available) */}
      <AnimatePresence>
        {dailyReward?.rewardType === 'milestone' && (
          <motion.div 
            className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 p-3 rounded-md mt-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaGift className="text-amber-500 mr-2 text-xl" />
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-300">Milestone Reward Unlocked!</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">{dailyReward.reward.description}</p>
                </div>
              </div>
              <button 
                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-md text-sm"
                onClick={() => setShowRewardModal(true)}
              >
                Claim
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Recent Progress */}
      {streakData.recentActivity && streakData.recentActivity.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Activity</h4>
          <div className="space-y-2">
            {streakData.recentActivity.slice(0, 3).map((activity, index) => (
              <div key={index} className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                <span>{format(new Date(activity.date), 'MMM d')}</span>
                <div className="flex items-center">
                  <span className="mr-2">{activity.practiceCount} sessions</span>
                  <span>{Math.round(activity.averageWPM)} WPM</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Surprise Reward Animation */}
      <AnimatePresence>
        {surpriseAnimation && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSurpriseAnimation(false)}
          >
            <motion.div
              className="bg-yellow-400 rounded-lg p-8 flex flex-col items-center"
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ 
                scale: [0.5, 1.2, 1],
                rotate: [-10, 10, 0]
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div
                animate={{ 
                  y: [0, -20, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  repeat: Infinity,
                  repeatType: "mirror",
                  duration: 1.5
                }}
              >
                <FaGift className="text-6xl text-white mb-4" />
              </motion.div>
              <motion.h3 
                className="text-2xl font-bold text-white mb-2"
                animate={{
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  repeat: Infinity,
                  repeatType: "mirror",
                  duration: 2
                }}
              >
                SURPRISE REWARD!
              </motion.h3>
              <p className="text-white text-center mb-4">
                You unlocked a special reward for your {streakData.currentStreak}-day streak!
              </p>
              <button 
                className="bg-white text-yellow-500 px-6 py-2 rounded-full font-bold hover:bg-yellow-100 transition-colors"
                onClick={() => {
                  setSurpriseAnimation(false);
                  setShowRewardModal(true);
                }}
              >
                CLAIM NOW
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Modals */}
      {/* Milestone Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 className="text-xl font-bold mb-4">Streak Rewards</h3>
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <AnimatedStreakCounter
                  streak={streakData.currentStreak}
                  size="small"
                  showRank={true}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Keep practicing daily to unlock rewards and maintain your streak!
              </p>
            </div>
            
            {/* Current Rank */}
            {rankData && (
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                <h4 className="font-medium mb-1">Current Rank: <span className={`text-${rankData.currentRank.color.replace('#', '')}`}>{rankData.currentRank.name}</span></h4>
                {rankData.nextRank && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Next rank: {rankData.nextRank.name} (in {rankData.nextRank.daysToNext} days)
                  </p>
                )}
              </div>
            )}
            
            {/* Upcoming Rewards */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Upcoming Rewards</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {/* Sample upcoming rewards - in a real app, fetch from API */}
                <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mr-3">
                    <FaGift className="text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{streakData.nextMilestone} Day Streak</span>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                        {streakData.daysToNextMilestone} days left
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {streakData.nextReward?.description || 'Special milestone reward'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                onClick={() => setShowMilestoneModal(false)}
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Reward Modal */}
      {showRewardModal && dailyReward && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 className="text-xl font-bold mb-4">
              {dailyReward.rewardType === 'surprise' ? 'Surprise Reward!' : 'Milestone Reward'}
            </h3>
            
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mr-4">
                  <FaGift className="text-amber-500 text-2xl" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-amber-700 dark:text-amber-400">
                    {dailyReward.reward.description}
                  </h4>
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    For maintaining a {streakData.currentStreak}-day streak!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-center mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {dailyReward.rewardType === 'surprise' 
                  ? 'You earned a special surprise reward! These are rare and only appear on certain days.'
                  : 'Congratulations on reaching this milestone! Keep up the great work!'}
              </p>
            </div>
            
            <div className="flex justify-center space-x-3">
              <button 
                className="px-6 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                onClick={() => setShowRewardModal(false)}
              >
                Awesome!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default EnhancedStreakDisplay; 