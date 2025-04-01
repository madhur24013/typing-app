import { useState, useEffect } from 'react';
import { progressAPI } from '../../services/api';

const Badges = () => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await progressAPI.getUserBadges();
      setBadges(response.data.badges || []);
    } catch (err) {
      console.error('Error fetching badges:', err);
      setError('Failed to load badge data');
    } finally {
      setLoading(false);
    }
  };

  // Function to get badge icon based on badge name
  const getBadgeIcon = (badgeName) => {
    switch (badgeName) {
      case 'First Steps':
        return '🚶';
      case 'Speed Demon':
        return '🏎️';
      case 'Accuracy Master':
        return '🎯';
      case 'Marathon Typer':
        return '🏃';
      case 'Wordsmith':
        return '📝';
      case 'Persistence':
        return '⏰';
      default:
        return '🏆';
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Your Achievements</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4">
          {error}
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-xl font-medium mb-2">No Badges Yet</h3>
          <p className="text-gray-600">
            Complete typing sessions to earn badges and show off your skills!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div key={badge.id} className="border border-gray-200 rounded-lg p-4 transition-all hover:shadow-md">
              <div className="flex items-center mb-3">
                <span className="text-3xl mr-3">{getBadgeIcon(badge.name)}</span>
                <h3 className="text-lg font-semibold">{badge.name}</h3>
              </div>
              <p className="text-gray-600 text-sm">{badge.description}</p>
              <div className="mt-2 text-xs text-gray-500">
                Earned on {new Date(badge.earned_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Badges; 