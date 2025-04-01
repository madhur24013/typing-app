import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaChessQueen, FaUsers, FaCrown } from 'react-icons/fa';
import EnhancedStreakDisplay from './EnhancedStreakDisplay';
import StreakBattles from './StreakBattles';
import TeamStreaks from './TeamStreaks';
import { useAuth } from '../../contexts/AuthContext';

/**
 * StreakDashboard component
 * Central hub for all streak-related features and visualizations
 * Provides a comprehensive view of user's streak status and engagement opportunities
 */
const StreakDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // This would be a real API call in production
        // Simulating data for demonstration purposes
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setUserStats({
          currentStreak: 28,
          highestStreak: 45,
          streakRank: 'Gold Streak',
          position: 34,
          totalUsers: 1250,
          percentile: 97,
          activeBattles: 3,
          activeTeams: 2,
          achievements: [
            { id: 1, name: 'Week Warrior', description: '7 day streak', date: '2023-11-12' },
            { id: 2, name: 'Fortnight Focus', description: '14 day streak', date: '2023-11-19' },
            { id: 3, name: 'Monthly Master', description: '30 day streak', date: '2023-12-05' }
          ]
        });
        
      } catch (error) {
        console.error('Error fetching user stats:', error);
        setError('Failed to load streak statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [user]);

  const tabs = [
    { id: 'personal', label: 'Personal Streak', icon: <FaChartLine /> },
    { id: 'battles', label: 'Streak Battles', icon: <FaChessQueen /> },
    { id: 'teams', label: 'Team Streaks', icon: <FaUsers /> }
  ];

  // Renders the user's streak stats summary
  const renderStatsSummary = () => {
    if (!userStats) return null;
    
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-5 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Your Streak Journey</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Keep consistent to climb the ranks!</p>
          </div>
          <div className="flex items-center">
            <div className="mr-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-2">
              <FaCrown className="text-yellow-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {userStats.streakRank}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Top {userStats.percentile}% of users
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400">Current Streak</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userStats.currentStreak}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">days</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400">All-time Best</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{userStats.highestStreak}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">days</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400">Battles</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{userStats.activeBattles}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">active now</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 dark:text-gray-400">Teams</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{userStats.activeTeams}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">active now</div>
          </div>
        </div>
        
        {userStats.achievements.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Achievements</h3>
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {userStats.achievements.map(achievement => (
                <motion.div 
                  key={achievement.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm min-w-[150px] flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    {achievement.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {achievement.description}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {achievement.date}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Renders the loading state
  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }
  
  // Renders the error state
  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {renderStatsSummary()}
      
      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500'
                : 'text-gray-600 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-300'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab content */}
      <div className="mb-8">
        {activeTab === 'personal' && <EnhancedStreakDisplay />}
        {activeTab === 'battles' && <StreakBattles />}
        {activeTab === 'teams' && <TeamStreaks />}
      </div>
    </div>
  );
};

export default StreakDashboard; 