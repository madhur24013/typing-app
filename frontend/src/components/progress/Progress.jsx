import UserProgress from './UserProgress';
import Badges from './Badges';
import Leaderboard from './Leaderboard';

const Progress = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Progress & Leaderboards</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <UserProgress />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Badges />
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default Progress; 