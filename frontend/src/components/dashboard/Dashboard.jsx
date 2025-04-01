import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { typingAPI } from '../../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user statistics
        const statsResponse = await typingAPI.getUserStats();
        setStats(statsResponse.data.stats);
        
        // Fetch recent sessions
        const sessionsResponse = await typingAPI.getSessionHistory();
        setRecentSessions(sessionsResponse.data.sessions.slice(0, 5)); // Get only the latest 5 sessions
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-border text-blue-500" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link 
            to="/practice" 
            className="bg-blue-600 text-white rounded-lg p-4 text-center hover:bg-blue-700 transition-colors"
          >
            Start Practice Session
          </Link>
          <Link 
            to="/documents/upload" 
            className="bg-green-600 text-white rounded-lg p-4 text-center hover:bg-green-700 transition-colors"
          >
            Upload New Document
          </Link>
          <Link 
            to="/statistics" 
            className="bg-purple-600 text-white rounded-lg p-4 text-center hover:bg-purple-700 transition-colors"
          >
            View Statistics
          </Link>
          <Link 
            to="/progress" 
            className="bg-yellow-600 text-white rounded-lg p-4 text-center hover:bg-yellow-700 transition-colors"
          >
            View Progress & Leaderboards
          </Link>
        </div>
      </div>
      
      {/* Statistics Summary */}
      {stats && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">My Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 mb-1">Average WPM</p>
              <p className="text-3xl font-bold text-blue-900">{stats.averageWpm.toFixed(1)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800 mb-1">Average Accuracy</p>
              <p className="text-3xl font-bold text-green-900">{(stats.averageAccuracy * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-800 mb-1">Total Sessions</p>
              <p className="text-3xl font-bold text-purple-900">{stats.totalSessions}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 mb-1">Total Practice Time</p>
              <p className="text-3xl font-bold text-yellow-900">
                {Math.floor(stats.totalTime / 60)}m {stats.totalTime % 60}s
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Sessions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Sessions</h2>
          <Link to="/statistics" className="text-blue-600 hover:text-blue-800">
            View All
          </Link>
        </div>
        
        {recentSessions.length === 0 ? (
          <p className="text-gray-600">No recent sessions found. Start practicing to see your progress!</p>
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
                {recentSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                      {session.wpm.toFixed(1)} WPM
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {(session.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
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

export default Dashboard; 