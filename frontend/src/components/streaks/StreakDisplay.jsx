import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaFire, FaLock, FaTrophy, FaGift } from 'react-icons/fa';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { streakAPI } from '../../services/api';

const StreakDisplay = ({ onMilestoneClick, size = 'normal', className = '' }) => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);

  // Fetch streak data from API
  useEffect(() => {
    const fetchStreakData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await streakAPI.getUserStreak();
        setStreakData(response.data);
        
        // Track that streak data was viewed for analytics
        streakAPI.trackStreakEvent('streak_viewed', {
          currentStreak: response.data.currentStreak,
          deviceType: window.innerWidth <= 768 ? 'mobile' : 'desktop'
        }).catch(e => console.log('Analytics error:', e));
        
      } catch (error) {
        console.error('Error fetching streak data:', error);
        setError('Could not load streak data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStreakData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Handle milestone click
  const handleMilestoneClick = () => {
    if (onMilestoneClick) {
      onMilestoneClick(streakData.nextMilestone, streakData.nextReward);
    } else {
      setShowMilestoneModal(true);
      
      // Track modal open for analytics
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
      
      // Show success notification or update UI based on the reward
      // For this example, we'll just close the modal and refresh the streak data
      setShowMilestoneModal(false);
      
      // Refresh streak data
      const response = await streakAPI.getUserStreak();
      setStreakData(response.data);
      
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

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-pulse w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-red-500 ${className}`}>
        {error}
      </div>
    );
  }

  if (!user || !streakData) {
    return null;
  }

  // Determine streak icon and color based on streak length
  const getStreakStyle = (streakLength) => {
    if (streakLength >= 30) return "text-purple-500 dark:text-purple-400";
    if (streakLength >= 15) return "text-blue-500 dark:text-blue-400";
    if (streakLength >= 7) return "text-green-500 dark:text-green-400";
    if (streakLength >= 3) return "text-yellow-500 dark:text-yellow-400";
    return "text-orange-500 dark:text-orange-400";
  };

  // Format the streak display based on the size prop
  const formatStreakDisplay = () => {
    switch (size) {
      case 'small':
        return (
          <div className={`flex items-center text-sm ${className}`}>
            <FaFire className={`${getStreakStyle(streakData.currentStreak)} mr-1`} />
            <span>{streakData.currentStreak}</span>
          </div>
        );
      case 'large':
        return (
          <div className={`flex flex-col items-center ${className}`}>
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaFire 
                className={`text-4xl ${getStreakStyle(streakData.currentStreak)}`} 
              />
              {streakData.streakFreezeCount > 0 && (
                <motion.div 
                  className="absolute -top-1 -right-2 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  {streakData.streakFreezeCount}
                </motion.div>
              )}
            </motion.div>
            <div className="mt-2 text-2xl font-bold">{streakData.currentStreak}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">day streak</div>
            
            <div className="mt-4 w-full">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Current</span>
                <span>Next: {streakData.nextMilestone}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getStreakStyle(streakData.currentStreak)}`}
                  style={{ width: `${(streakData.currentStreak / streakData.nextMilestone) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400">
                {streakData.daysToNextMilestone} days to {streakData.nextReward?.description || 'next milestone'}
              </div>
            </div>
            
            <button 
              onClick={handleMilestoneClick}
              className="mt-3 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              View Rewards
            </button>
          </div>
        );
      default: // normal
        return (
          <div className={`flex items-center ${className}`}>
            <motion.div 
              className="relative cursor-pointer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMilestoneClick}
            >
              <FaFire 
                className={`text-2xl ${getStreakStyle(streakData.currentStreak)} mr-2`} 
              />
              {streakData.streakFreezeCount > 0 && (
                <motion.div 
                  className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  {streakData.streakFreezeCount}
                </motion.div>
              )}
            </motion.div>
            <div>
              <div className="flex items-center">
                <span className="font-bold mr-1">{streakData.currentStreak}</span>
                <span className="text-gray-600 dark:text-gray-400 text-sm">day streak</span>
                
                <div className="ml-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <FaTrophy className="mr-1 text-yellow-500" />
                  <span>Best: {streakData.longestStreak}</span>
                </div>
              </div>
              
              <div className="flex items-center mt-1">
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mr-2">
                  <div 
                    className={`h-1.5 rounded-full ${getStreakStyle(streakData.currentStreak)}`}
                    style={{ width: `${(streakData.currentStreak / streakData.nextMilestone) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {streakData.daysToNextMilestone} days to next reward
                </span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {formatStreakDisplay()}
      
      {/* Milestone Modal - only appears if onMilestoneClick is not provided */}
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
                <FaFire className={`${getStreakStyle(streakData.currentStreak)} mr-2 text-xl`} />
                <span className="font-bold">{streakData.currentStreak} day streak</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Keep practicing daily to unlock rewards and maintain your streak!
              </p>
            </div>
            
            <div className="space-y-3 mb-4">
              <h4 className="font-medium">Upcoming Rewards:</h4>
              
              {/* Next milestone reward - claimable if already reached */}
              <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="mr-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <FaGift className="text-blue-500 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{streakData.nextMilestone} Day Streak</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {streakData.nextReward?.description || 'Special reward'}
                  </div>
                </div>
                {streakData.currentStreak >= streakData.nextMilestone ? (
                  <button
                    onClick={() => handleClaimReward(streakData.nextMilestone)}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors"
                  >
                    Claim
                  </button>
                ) : (
                  <div className="text-sm font-medium text-blue-500 dark:text-blue-400">
                    {streakData.daysToNextMilestone} days left
                  </div>
                )}
              </div>
              
              {/* Display other future milestones */}
              {streakData.recentActivity && streakData.recentActivity.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Recent Activity:</h4>
                  <div className="space-y-1 text-sm">
                    {streakData.recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{format(new Date(activity.date), 'MMM d')}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {activity.practiceCount} sessions, {Math.round(activity.averageWPM)} WPM
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Streak freeze purchase option */}
            <div className="mb-4 p-3 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2">
                    <FaFire className="text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Streak Freeze</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Protects your streak for one missed day</div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    streakAPI.purchaseStreakFreeze(1)
                      .then(() => streakAPI.getUserStreak())
                      .then(response => setStreakData(response.data))
                      .catch(e => console.error('Error purchasing streak freeze:', e));
                  }}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                >
                  Get One
                </button>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                onClick={() => setShowMilestoneModal(false)}
              >
                Close
              </button>
              <button 
                className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                onClick={() => {
                  window.location.href = '/progress';
                  // Track navigation for analytics
                  streakAPI.trackStreakEvent('navigate_to_progress', {
                    fromModal: true
                  }).catch(e => console.log('Analytics error:', e));
                }}
              >
                View All Progress
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default StreakDisplay; 