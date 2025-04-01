import { useState, useEffect } from 'react';
import { typingAPI } from '../../services/api';

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [commonErrors, setCommonErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user statistics
        const statsResponse = await typingAPI.getUserStats();
        setStats(statsResponse.data.stats);
        setCommonErrors(statsResponse.data.commonErrors);
        
        // Fetch all sessions
        const sessionsResponse = await typingAPI.getSessionHistory();
        setSessions(sessionsResponse.data.sessions);
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-border text-blue-500" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Statistics</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Typing Statistics</h1>
      
      {/* Overall Stats */}
      {stats && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Overall Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm text-blue-800 mb-1">Average WPM</h3>
              <p className="text-3xl font-bold text-blue-900">{stats.averageWpm?.toFixed(1) || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm text-green-800 mb-1">Average Accuracy</h3>
              <p className="text-3xl font-bold text-green-900">
                {(stats.averageAccuracy * 100)?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-sm text-purple-800 mb-1">Total Sessions</h3>
              <p className="text-3xl font-bold text-purple-900">{stats.totalSessions || 0}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="text-sm text-yellow-800 mb-1">Total Time Spent</h3>
              <p className="text-3xl font-bold text-yellow-900">
                {Math.floor((stats.totalTime || 0) / 60)}m {(stats.totalTime || 0) % 60}s
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Common Errors */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Most Common Errors</h2>
        
        {commonErrors.length === 0 ? (
          <p className="text-gray-600">No errors recorded yet. Keep practicing!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Occurrences
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commonErrors.map((error, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-medium bg-red-100 text-red-800 rounded">
                        {error.error_content || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-medium bg-green-100 text-green-800 rounded">
                        {error.expected_content || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {error.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Session History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Session History</h2>
        
        {sessions.length === 0 ? (
          <p className="text-gray-600">No sessions recorded yet. Start practicing to track your progress!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    WPM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accuracy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-800">
                        {session.wpm.toFixed(1)} WPM
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-800">
                        {(session.accuracy * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.floor(session.duration / 60)}m {session.duration % 60}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics; 