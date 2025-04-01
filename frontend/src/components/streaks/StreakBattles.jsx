import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFire, FaTrophy, FaUserFriends, FaCheck, FaTimes, FaChess, FaChessKnight } from 'react-icons/fa';
import { GiCrossedSwords, GiPodiumWinner, GiFist } from 'react-icons/gi';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { format, formatDistance } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import AnimatedStreakCounter from './AnimatedStreakCounter';
import ErrorBoundary from '../common/ErrorBoundary';
import useApiError from '../../hooks/useApiError';
import { 
  getActiveBattles, 
  getPendingBattles, 
  createBattle, 
  respondToBattle,
  trackStreakEvent,
  getBattleDetails
} from '../../services/streakService';

/**
 * StreakBattles component
 * Implements social competitive features for streaks to enhance engagement
 */
const StreakBattles = ({ className = '', onBattleCreated, onBattleEnded }) => {
  const { user } = useAuth();
  const [activeBattles, setActiveBattles] = useState([]);
  const [pendingBattles, setPendingBattles] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewBattleModal, setShowNewBattleModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [battleDuration, setBattleDuration] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const {
    error: apiError,
    isLoading,
    handleError,
    retryOperation,
    clearError
  } = useApiError();

  // Track component mount for analytics
  useEffect(() => {
    trackStreakEvent('streak_battles_view', { userId: user?.id });
    
    return () => {
      // Clean up any pending operations
    };
  }, [user]);

  // Fetch data with retry logic
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [activeBattlesData, pendingBattlesData, friendsData] = await Promise.all([
        getActiveBattles(),
        getPendingBattles(),
        fetch('/api/friends').then(res => res.json())
      ]);

      setActiveBattles(activeBattlesData);
      setPendingBattles(pendingBattlesData);
      setFriends(friendsData.friends);
      setRetryCount(0);
    } catch (err) {
      setError(err.message || 'Failed to load battles');
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchData, 1000 * retryCount); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle battle creation with proper error handling
  const handleCreateBattle = async () => {
    if (!selectedFriend || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      
      const battle = await createBattle(selectedFriend.id, battleDuration);
      await trackStreakEvent('streak_battle_created', {
        opponentId: selectedFriend.id,
        duration: battleDuration
      });

      setActiveBattles(prev => [...prev, battle]);
      setShowNewBattleModal(false);
      setSelectedFriend(null);
      setBattleDuration(7);
    } catch (err) {
      setError(err.message || 'Failed to create battle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle battle response with proper error handling
  const handleBattleResponse = async (battleId, accepted) => {
    try {
      setError(null);
      await respondToBattle(battleId, accepted);
      await trackStreakEvent('streak_battle_response', {
        battleId,
        accepted
      });

      setPendingBattles(prev => prev.filter(battle => battle.id !== battleId));
      if (accepted) {
        const battle = pendingBattles.find(b => b.id === battleId);
        setActiveBattles(prev => [...prev, battle]);
      }
    } catch (err) {
      setError(err.message || 'Failed to respond to battle');
    }
  };

  // View detailed battle stats
  const handleViewBattleDetails = async (battleId) => {
    try {
      const details = await getBattleDetails(battleId);
      // You could open a modal or navigate to a detail page here
      console.log('Battle details:', details);
      
      // Track battle details viewed
      trackStreakEvent('streak_battle_details_viewed', { battleId });
    } catch (error) {
      handleError(error, 'Failed to load battle details');
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4 text-gray-600">Loading battles...</span>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700">{error}</p>
        </div>
        {retryCount < MAX_RETRIES && (
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Retry ({MAX_RETRIES - retryCount} attempts left)
          </button>
        )}
      </div>
    );
  }

  // Show empty state
  if (!activeBattles.length && !pendingBattles.length) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 mb-4">No active streak battles</p>
        <button
          onClick={() => setShowNewBattleModal(true)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
          disabled={!friends.length}
        >
          Challenge Friend
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary onRetry={fetchData} errorMessage="Failed to load streak battles">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center">
            <GiCrossedSwords className="mr-2 text-amber-500" />
            Streak Battles
          </h3>
          <button 
            onClick={() => setShowNewBattleModal(true)}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-sm px-3 py-1 rounded-md hover:from-amber-600 hover:to-yellow-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || friends.length === 0}
          >
            <FaUserFriends className="mr-1" />
            Challenge Friend
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-lg p-4 mb-4 flex items-center justify-between"
          >
            <div className="flex items-center">
              <FiAlertCircle className="flex-shrink-0 w-5 h-5 text-red-500 mr-3" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button 
              onClick={clearError}
              className="text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}

        {/* Active Battles */}
        {activeBattles.length > 0 ? (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Active Challenges</h4>
            <div className="space-y-3">
              {activeBattles.map(battle => (
                <motion.div 
                  key={battle.id} 
                  className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg p-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleViewBattleDetails(battle.id)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium">
                      {battle.challenger_id === user?.id ? (
                        <span>You vs. <span className="font-bold">{battle.opponent_name}</span></span>
                      ) : (
                        <span><span className="font-bold">{battle.challenger_name}</span> vs. You</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Ends {format(new Date(battle.end_date), 'MMM d')}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex-1 text-center p-1 border-r border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                        {battle.challenger_id === user?.id ? 'Your Streak' : `${battle.challenger_name}'s Streak`}
                      </div>
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {battle.challenger_streak || 0}
                      </div>
                    </div>
                    <div className="flex-1 text-center p-1">
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                        {battle.opponent_id === user?.id ? 'Your Streak' : `${battle.opponent_name}'s Streak`}
                      </div>
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {battle.opponent_streak || 0}
                      </div>
                    </div>
                  </div>
                  
                  {/* Winning indicator */}
                  {battle.challenger_streak !== battle.opponent_streak && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center text-xs">
                      {((battle.challenger_id === user?.id && battle.challenger_streak > battle.opponent_streak) ||
                        (battle.opponent_id === user?.id && battle.opponent_streak > battle.challenger_streak)) ? (
                        <span className="text-green-600 dark:text-green-400 font-medium flex items-center justify-center">
                          <GiPodiumWinner className="mr-1" /> Currently Winning
                        </span>
                      ) : (
                        <span className="text-red-500 dark:text-red-400 font-medium flex items-center justify-center">
                          <GiFist className="mr-1" /> Need to catch up!
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 text-center bg-gray-50 dark:bg-gray-700 rounded-lg">
            <GiCrossedSwords className="mx-auto text-2xl text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No active streak battles. Challenge a friend to see who can maintain a longer streak!
            </p>
          </div>
        )}

        {/* Pending Battle Invites */}
        {pendingBattles.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pending Challenges</h4>
            <div className="space-y-3">
              {pendingBattles.map(battle => (
                <motion.div 
                  key={battle.id} 
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {battle.opponent_id === user?.id ? (
                    // User needs to respond to this challenge
                    <>
                      <div className="flex items-center mb-3">
                        <FaChessKnight className="text-blue-500 mr-2" />
                        <div>
                          <div className="font-medium">Challenge from {battle.challenger_name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {formatDistance(new Date(battle.created_at), new Date(), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        <p>
                          {battle.challenger_name} has challenged you to a {formatDistance(new Date(battle.start_date), new Date(battle.end_date))} streak battle!
                          Win {battle.xp_reward || 100} XP by maintaining a longer streak.
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1 rounded-md text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleBattleResponse(battle.id, true)}
                          disabled={isLoading}
                        >
                          <FaCheck className="mr-1" /> Accept
                        </button>
                        <button 
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1 rounded-md text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleBattleResponse(battle.id, false)}
                          disabled={isLoading}
                        >
                          <FaTimes className="mr-1" /> Decline
                        </button>
                      </div>
                    </>
                  ) : (
                    // User sent this challenge
                    <>
                      <div className="flex items-center mb-3">
                        <FaChess className="text-yellow-500 mr-2" />
                        <div>
                          <div className="font-medium">Your challenge to {battle.opponent_name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {formatDistance(new Date(battle.created_at), new Date(), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>Waiting for response...</p>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* New Battle Modal */}
        <AnimatePresence>
          {showNewBattleModal && (
            <motion.div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewBattleModal(false)}
            >
              <motion.div 
                className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <GiCrossedSwords className="mr-2 text-amber-500" />
                  Challenge a Friend
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select an opponent
                  </label>
                  
                  {isLoading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : friends.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto rounded-md border border-gray-300 dark:border-gray-700">
                      {friends.map(friend => (
                        <div 
                          key={friend.id}
                          className={`
                            p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center
                            ${selectedFriend?.id === friend.id ? 'bg-amber-50 dark:bg-amber-900/20' : ''}
                          `}
                          onClick={() => setSelectedFriend(friend)}
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mr-2 overflow-hidden">
                            {friend.avatar ? (
                              <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold">{friend.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{friend.name}</div>
                            {friend.currentStreak !== undefined && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <FaFire className="text-amber-500 mr-1" /> {friend.currentStreak} day streak
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No friends available. Add friends to start streak battles!
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Battle duration (days)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={battleDuration}
                    onChange={e => setBattleDuration(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span>1 day</span>
                    <span>{battleDuration} days</span>
                    <span>30 days</span>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowNewBattleModal(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateBattle}
                    disabled={!selectedFriend || isSubmitting}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>Challenge</>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};

export default StreakBattles; 