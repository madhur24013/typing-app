import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { FaFire, FaTrophy, FaChartLine, FaMedal, FaGift, FaUsers } from 'react-icons/fa';
import { GiCrossedSwords, GiPodiumWinner, GiFist } from 'react-icons/gi';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import analyticsService from '../../services/analyticsService';
import ErrorBoundary from '../common/ErrorBoundary';
import useApiError from '../../hooks/useApiError';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StreakAnalytics = ({ className = '' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    heatmap: [],
    consistency: [],
    performance: [],
    personalBests: {},
    dailyImprovement: {},
    milestones: [],
    staminaRating: {},
    upcomingRewards: [],
    rankings: {},
    friendComparisons: []
  });

  const {
    error: apiError,
    isLoading,
    handleError,
    retryOperation,
    clearError
  } = useApiError();

  // Fetch all analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        heatmap,
        consistency,
        performance,
        personalBests,
        dailyImprovement,
        milestones,
        staminaRating,
        upcomingRewards,
        rankings,
        friendComparisons
      ] = await Promise.all([
        analyticsService.getStreakHeatmap(),
        analyticsService.getStreakConsistency(),
        analyticsService.getPerformanceTrends(),
        analyticsService.getPersonalBests(),
        analyticsService.getDailyImprovement(),
        analyticsService.getMilestoneProgress(),
        analyticsService.getStaminaRating(),
        analyticsService.getUpcomingRewards(),
        analyticsService.getCompetitiveRankings(),
        analyticsService.getFriendComparisons()
      ]);

      setData({
        heatmap,
        consistency,
        performance,
        personalBests,
        dailyImprovement,
        milestones,
        staminaRating,
        upcomingRewards,
        rankings,
        friendComparisons
      });
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Performance trends chart configuration
  const performanceChartConfig = {
    labels: data.performance.map(d => d.date),
    datasets: [
      {
        label: 'WPM',
        data: data.performance.map(d => d.wpm),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.4
      },
      {
        label: 'Accuracy',
        data: data.performance.map(d => d.accuracy),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.4
      }
    ]
  };

  // Streak consistency chart configuration
  const consistencyChartConfig = {
    labels: data.consistency.map(d => d.date),
    datasets: [
      {
        label: 'Streak Length',
        data: data.consistency.map(d => d.length),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        tension: 0.4
      }
    ]
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <div className="flex items-center">
          <FiAlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
        <button
          onClick={fetchAnalyticsData}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center"
        >
          <FiRefreshCw className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary onRetry={fetchAnalyticsData} errorMessage="Failed to load analytics">
      <div className={`space-y-6 ${className}`}>
        {/* Personal Bests & Stamina Rating */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <h3 className="text-lg font-bold flex items-center mb-4">
              <FaTrophy className="mr-2 text-yellow-500" />
              Personal Bests
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Longest Streak</span>
                <span className="text-xl font-bold text-amber-500">
                  {data.personalBests.longestStreak} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Best WPM</span>
                <span className="text-xl font-bold text-green-500">
                  {data.personalBests.bestWpm} WPM
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Best Accuracy</span>
                <span className="text-xl font-bold text-blue-500">
                  {data.personalBests.bestAccuracy}%
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <h3 className="text-lg font-bold flex items-center mb-4">
              <FaMedal className="mr-2 text-blue-500" />
              Streak Stamina Rating
            </h3>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-500 mb-2">
                  {data.staminaRating.rating}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {data.staminaRating.description}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Performance Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-bold flex items-center mb-4">
            <FaChartLine className="mr-2 text-green-500" />
            Performance Trends
          </h3>
          <div className="h-64">
            <Line
              data={performanceChartConfig}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: 'WPM & Accuracy Over Time'
                  }
                }
              }}
            />
          </div>
        </motion.div>

        {/* Streak Consistency */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-bold flex items-center mb-4">
            <FaFire className="mr-2 text-orange-500" />
            Streak Consistency
          </h3>
          <div className="h-64">
            <Line
              data={consistencyChartConfig}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: 'Streak Length Over Time'
                  }
                }
              }}
            />
          </div>
        </motion.div>

        {/* Upcoming Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-bold flex items-center mb-4">
            <FaGift className="mr-2 text-purple-500" />
            Upcoming Rewards
          </h3>
          <div className="space-y-3">
            {data.upcomingRewards.map((reward, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
              >
                <div>
                  <div className="font-medium">{reward.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {reward.description}
                  </div>
                </div>
                <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {reward.daysUntil} days left
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Competitive Rankings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-bold flex items-center mb-4">
            <FaUsers className="mr-2 text-indigo-500" />
            Competitive Rankings
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Your Rank</span>
              <span className="text-xl font-bold text-indigo-500">
                #{data.rankings.userRank}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Percentile</span>
              <span className="text-xl font-bold text-indigo-500">
                Top {data.rankings.percentile}%
              </span>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Friend Comparisons
              </h4>
              <div className="space-y-2">
                {data.friendComparisons.map((friend, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded"
                  >
                    <span className="text-sm">{friend.name}</span>
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {friend.difference} days {friend.ahead ? 'ahead' : 'behind'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </ErrorBoundary>
  );
};

export default StreakAnalytics; 