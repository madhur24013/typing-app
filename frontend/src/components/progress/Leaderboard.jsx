import { useState, useEffect } from 'react';
import { progressAPI } from '../../services/api';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaderboardType, setLeaderboardType] = useState('wpm');

  useEffect(() => {
    fetchLeaderboard();
  }, [leaderboardType]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await progressAPI.getLeaderboard(leaderboardType);
      setLeaderboardData(response.data.leaderboard || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    setLeaderboardType(type);
  };

  const getLeaderboardTypeLabel = (type) => {
    switch (type) {
      case 'wpm':
        return 'Typing Speed (WPM)';
      case 'accuracy':
        return 'Accuracy (%)';
      case 'points':
        return 'Total Points';
      case 'streak':
        return 'Longest Streak (Days)';
      default:
        return 'Typing Speed (WPM)';
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Typing Leaderboard</h2>
      
      <div className="flex space-x-2 mb-6">
        <button
          className={`px-4 py-2 rounded-lg ${leaderboardType === 'wpm' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => handleTypeChange('wpm')}
        >
          Speed
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${leaderboardType === 'accuracy' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => handleTypeChange('accuracy')}
        >
          Accuracy
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${leaderboardType === 'points' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => handleTypeChange('points')}
        >
          Points
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${leaderboardType === 'streak' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => handleTypeChange('streak')}
        >
          Streak
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4">
          {error}
        </div>
      ) : leaderboardData.length === 0 ? (
        <div className="text-gray-500 text-center p-4">
          No data available for this leaderboard yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getLeaderboardTypeLabel(leaderboardType)}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboardData.map((entry, index) => (
                <tr key={index} className={index < 3 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index === 0 && (
                        <span className="mr-2 text-yellow-500">🏆</span>
                      )}
                      {index === 1 && (
                        <span className="mr-2 text-gray-400">🥈</span>
                      )}
                      {index === 2 && (
                        <span className="mr-2 text-yellow-700">🥉</span>
                      )}
                      <span className={index < 3 ? 'font-bold' : ''}>
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {entry.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-semibold">
                      {leaderboardType === 'accuracy' 
                        ? `${(entry.value * 100).toFixed(1)}%` 
                        : entry.value}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard; 