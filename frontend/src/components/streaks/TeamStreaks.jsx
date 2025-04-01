import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers, FaUserPlus, FaChartLine, FaCrown, FaHourglassHalf, FaCalendarCheck } from 'react-icons/fa';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

/**
 * TeamStreaks component
 * Implements collective streak mechanics where groups of users maintain streaks together
 * Uses social pressure and collective responsibility to drive engagement
 */
const TeamStreaks = ({ className = '' }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch team data
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // This is where you'd fetch real team data from your API
        // For this demo, using simulated data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Simulated team data
        const simulatedTeams = [
          {
            id: 1,
            name: 'Speed Typers',
            teamStreak: 27,
            highestStreak: 45,
            memberCount: 4,
            activeUntil: new Date(Date.now() + 86400000), // Tomorrow
            isCreator: true,
            members: [
              { id: 1, username: 'You', lastActive: new Date(), contributionCount: 27 },
              { id: 2, username: 'Alex', lastActive: new Date(), contributionCount: 27 },
              { id: 3, username: 'Taylor', lastActive: new Date(Date.now() - 86400000), contributionCount: 26 },
              { id: 4, username: 'Morgan', lastActive: new Date(Date.now() - 86400000 * 3), contributionCount: 24 }
            ]
          },
          {
            id: 2,
            name: 'Typing Masters',
            teamStreak: 14,
            highestStreak: 14,
            memberCount: 3,
            activeUntil: new Date(Date.now() + 86400000), // Tomorrow
            isCreator: false,
            members: [
              { id: 1, username: 'You', lastActive: new Date(), contributionCount: 14 },
              { id: 5, username: 'Jamie', lastActive: new Date(Date.now() - 3600000), contributionCount: 14 },
              { id: 6, username: 'Riley', lastActive: new Date(), contributionCount: 14 }
            ]
          }
        ];
        
        setTeams(simulatedTeams);
        
        // Simulated friends data
        const simulatedFriends = [
          { id: 7, username: 'Jordan', streak: 15 },
          { id: 8, username: 'Casey', streak: 7 },
          { id: 9, username: 'Quinn', streak: 22 },
          { id: 10, username: 'Avery', streak: 3 }
        ];
        
        setFriends(simulatedFriends);
        
      } catch (error) {
        console.error('Error fetching team data:', error);
        setError('Could not load team streak data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [user]);

  // Create a new team
  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    
    try {
      // This would be a real API call in production
      // Simulating success here
      
      const newTeam = {
        id: teams.length + 1,
        name: teamName,
        teamStreak: 0,
        highestStreak: 0,
        memberCount: 1,
        activeUntil: new Date(Date.now() + 86400000), // Tomorrow
        isCreator: true,
        members: [
          { id: 1, username: 'You', lastActive: new Date(), contributionCount: 0 }
        ]
      };
      
      setTeams(prev => [...prev, newTeam]);
      setShowCreateTeamModal(false);
      setTeamName('');
      
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  // Send team invites
  const handleSendInvites = async () => {
    if (!selectedFriends.length || !selectedTeam) return;
    
    try {
      // This would be a real API call in production
      // Simulating success here
      
      // Update the UI to reflect invited members
      setTeams(prev => prev.map(team => {
        if (team.id === selectedTeam.id) {
          // Add selected friends as "pending" members
          return {
            ...team,
            memberCount: team.memberCount + selectedFriends.length,
            pendingInvites: selectedFriends.map(friend => ({
              id: friend.id,
              username: friend.username,
              status: 'pending'
            }))
          };
        }
        return team;
      }));
      
      setShowInviteModal(false);
      setSelectedFriends([]);
      setSelectedTeam(null);
      
    } catch (error) {
      console.error('Error sending invites:', error);
    }
  };

  // Toggle friend selection
  const toggleFriendSelection = (friend) => {
    if (selectedFriends.some(f => f.id === friend.id)) {
      setSelectedFriends(prev => prev.filter(f => f.id !== friend.id));
    } else {
      setSelectedFriends(prev => [...prev, friend]);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 text-red-500 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center">
          <FaUsers className="mr-2 text-purple-500" />
          Team Streaks
        </h3>
        <button 
          onClick={() => setShowCreateTeamModal(true)}
          className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm px-3 py-1 rounded-md hover:from-purple-600 hover:to-indigo-600 transition-colors flex items-center"
        >
          <FaUsers className="mr-1" />
          Create Team
        </button>
      </div>

      {/* Team List */}
      {teams.length > 0 ? (
        <div className="space-y-4">
          {teams.map(team => (
            <motion.div 
              key={team.id} 
              className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-purple-700 dark:text-purple-400 flex items-center">
                    {team.name}
                    {team.isCreator && <FaCrown className="ml-1 text-yellow-500 text-sm" />}
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-1">
                    <FaUsers className="mr-1" />
                    {team.memberCount} members
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {team.teamStreak}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">day streak</div>
                </div>
              </div>
              
              {/* Team Stats */}
              <div className="flex space-x-4 mb-3 text-xs">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <FaChartLine className="mr-1 text-green-500" />
                  Best: {team.highestStreak} days
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <FaHourglassHalf className="mr-1 text-amber-500" />
                  Active until: {format(new Date(team.activeUntil), 'MMM d')}
                </div>
              </div>
              
              {/* Member Activity */}
              <div className="bg-white dark:bg-gray-700 rounded-md p-2 mt-2">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recent Activity
                </div>
                <div className="space-y-2">
                  {team.members.slice(0, 3).map(member => (
                    <div key={member.id} className="flex justify-between items-center text-xs">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          new Date(member.lastActive).toDateString() === new Date().toDateString()
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}></div>
                        <span className={member.username === 'You' ? 'font-medium' : ''}>
                          {member.username}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FaCalendarCheck className="mr-1 text-purple-500" />
                        {member.contributionCount} days
                      </div>
                    </div>
                  ))}
                  
                  {team.members.length > 3 && (
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                      + {team.members.length - 3} more members
                    </div>
                  )}
                </div>
              </div>
              
              {/* Team Actions */}
              <div className="flex mt-3 space-x-2">
                <button 
                  className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs rounded-md py-1"
                  onClick={() => {
                    setSelectedTeam(team);
                    setShowInviteModal(true);
                  }}
                >
                  <FaUserPlus className="inline mr-1" />
                  Invite Friends
                </button>
                <button className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs rounded-md py-1">
                  View Team
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center bg-gray-50 dark:bg-gray-700 rounded-lg">
          <FaUsers className="mx-auto text-3xl text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You're not part of any team streaks yet. Create a team or join one to maintain streaks together!
          </p>
          <button 
            onClick={() => setShowCreateTeamModal(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Create Your First Team
          </button>
        </div>
      )}

      {/* Create Team Modal */}
      <AnimatePresence>
        {showCreateTeamModal && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateTeamModal(false)}
          >
            <motion.div 
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full m-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <FaUsers className="mr-2 text-purple-500" />
                Create a Team Streak
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="team-name">
                  Team Name
                </label>
                <input
                  type="text"
                  id="team-name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                  placeholder="Enter a name for your team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
              
              <div className="mb-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-md p-3 text-sm">
                  <h4 className="font-medium text-purple-700 dark:text-purple-400 mb-1">How Team Streaks Work</h4>
                  <ul className="text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
                    <li>Every team member must complete a typing session each day to maintain the streak</li>
                    <li>If one member misses a day, the team streak resets for everyone</li>
                    <li>Team streaks unlock special group rewards and achievements</li>
                    <li>You can be a member of up to 3 teams at once</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setShowCreateTeamModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className={`px-4 py-2 rounded-md transition-colors ${
                    teamName.trim()
                      ? 'bg-purple-500 hover:bg-purple-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={handleCreateTeam}
                  disabled={!teamName.trim()}
                >
                  Create Team
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Friends Modal */}
      <AnimatePresence>
        {showInviteModal && selectedTeam && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div 
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full m-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-2 flex items-center">
                <FaUserPlus className="mr-2 text-purple-500" />
                Invite to {selectedTeam.name}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select friends to invite to your team. They'll need to accept to join.
              </p>
              
              <div className="mb-4">
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
                  {friends.length > 0 ? friends.map(friend => (
                    <div 
                      key={friend.id}
                      className={`p-2 rounded-md cursor-pointer flex items-center ${
                        selectedFriends.some(f => f.id === friend.id)
                          ? 'bg-purple-100 dark:bg-purple-900/30' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => toggleFriendSelection(friend)}
                    >
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full mr-2 flex-shrink-0 flex items-center justify-center">
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{friend.username}</div>
                        {friend.streak && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {friend.streak} day streak
                          </div>
                        )}
                      </div>
                      {selectedFriends.some(f => f.id === friend.id) && (
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white">
                          ✓
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                      You haven't added any friends yet
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedFriends([]);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className={`px-4 py-2 rounded-md transition-colors ${
                    selectedFriends.length > 0
                      ? 'bg-purple-500 hover:bg-purple-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={handleSendInvites}
                  disabled={selectedFriends.length === 0}
                >
                  Send {selectedFriends.length} Invites
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamStreaks; 