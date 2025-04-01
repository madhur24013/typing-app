import { useState, useEffect } from 'react';
import { progressAPI } from '../../services/api';

const UserProgress = () => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserProgress();
  }, []);

  const fetchUserProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await progressAPI.getUserProgress();
      setProgress(response.data.progress || null);
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate points needed for next level (example formula)
  const getNextLevelPoints = (currentLevel) => {
    return currentLevel * 1000;
  };

  // Calculate progress percentage to next level
  const getProgressPercentage = (points, level) => {
    const nextLevelPoints = getNextLevelPoints(level);
    const previousLevelPoints = getNextLevelPoints(level - 1);
    const totalPointsNeeded = nextLevelPoints - previousLevelPoints;
    const pointsTowardsNextLevel = points - previousLevelPoints;
    
    return Math.min(Math.floor((pointsTowardsNextLevel / totalPointsNeeded) * 100), 100);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-6">Your Progress</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4">
          {error}
        </div>
      ) : progress ? (
        <div>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">{progress.level}</div>
                <div className="text-sm text-gray-500 mt-1">Current Level</div>
              </div>
            </div>
            
            <div className="flex-1 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="text-center">
                <div className="text-4xl font-bold text-indigo-600">{progress.points.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">Total Points</div>
              </div>
            </div>
            
            <div className="flex-1 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-600">{progress.streak_days}</div>
                <div className="text-sm text-gray-500 mt-1">Day Streak</div>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Level Progress
              </span>
              <span className="text-sm font-medium text-gray-700">
                {getProgressPercentage(progress.points, progress.level)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full"
                style={{ width: `${getProgressPercentage(progress.points, progress.level)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Level {progress.level}</span>
              <span>Level {progress.level + 1}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="text-sm text-gray-600">Words Typed</div>
              <div className="font-bold mt-1">{progress.total_words_typed.toLocaleString()}</div>
            </div>
            
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="text-sm text-gray-600">Characters Typed</div>
              <div className="font-bold mt-1">{progress.total_characters_typed.toLocaleString()}</div>
            </div>
            
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="text-sm text-gray-600">Practice Time</div>
              <div className="font-bold mt-1">
                {Math.floor(progress.total_time_practiced / 60)} mins
              </div>
            </div>
            
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="text-sm text-gray-600">Last Practice</div>
              <div className="font-bold mt-1">
                {progress.last_practice_date 
                  ? new Date(progress.last_practice_date).toLocaleDateString() 
                  : 'Never'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-medium mb-2">No Progress Data</h3>
          <p className="text-gray-600">
            Complete typing sessions to track your progress and level up!
          </p>
        </div>
      )}
    </div>
  );
};

export default UserProgress; 