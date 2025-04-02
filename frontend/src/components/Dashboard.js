import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress,
  Tabs,
  Tab,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Chip
} from '@mui/material';
import { 
  LocalFireDepartment, 
  Speed, 
  EmojiEvents, 
  Timeline,
  TrendingUp,
  Group,
  Star,
  Lock
} from '@mui/icons-material';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import '../styles/Dashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StatCard = ({ icon, title, value, color, subtitle }) => (
  <Paper elevation={3} sx={{ p: 2, height: '100%' }} className="stats-card">
    <Box display="flex" alignItems="center" gap={2}>
      {icon}
      <Box>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" component="div" fontWeight="bold" color={color} className="streak-counter">
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  </Paper>
);

const LeaderboardEntry = ({ rank, user, streak, isCurrentUser }) => (
  <ListItem 
    sx={{ bgcolor: isCurrentUser ? 'action.selected' : 'transparent' }}
    className="leaderboard-entry"
  >
    <ListItemAvatar>
      <Avatar src={user.avatar}>{user.name[0]}</Avatar>
    </ListItemAvatar>
    <ListItemText 
      primary={user.name}
      secondary={`${streak} day streak`}
    />
    <ListItemSecondaryAction>
      <Chip 
        label={`#${rank}`} 
        color={rank <= 3 ? "primary" : "default"}
        size="small"
      />
    </ListItemSecondaryAction>
  </ListItem>
);

const Dashboard = ({ stats = { streak: 5, topSpeed: 75, accuracy: 98, totalPractice: 120 } }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState({
    currentStreak: stats.streak,
    bestStreak: 15,
    streakHistory: Array.from({ length: 365 }, (_, i) => ({
      date: new Date(Date.now() - (364 - i) * 24 * 60 * 60 * 1000),
      count: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0
    })),
    performanceHistory: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      wpm: 60 + Math.floor(Math.random() * 40),
      accuracy: 90 + Math.floor(Math.random() * 10)
    })),
    leaderboard: Array.from({ length: 10 }, (_, i) => ({
      rank: i + 1,
      user: {
        name: i === 2 ? "You" : `User ${i + 1}`,
        avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
      },
      streak: 30 - i * 2
    })),
    achievements: [
      { id: 1, title: "7 Day Streak", description: "Maintained a streak for 7 days", unlocked: true },
      { id: 2, title: "Speed Demon", description: "Achieved 100 WPM", unlocked: true },
      { id: 3, title: "Perfect Accuracy", description: "100% accuracy in a session", unlocked: false }
    ]
  });

  useEffect(() => {
    // Simulate API call
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const performanceData = {
    labels: streakData.performanceHistory.map(d => d.date.toLocaleDateString()),
    datasets: [
      {
        label: 'WPM',
        data: streakData.performanceHistory.map(d => d.wpm),
        borderColor: '#2196f3',
        tension: 0.4
      },
      {
        label: 'Accuracy',
        data: streakData.performanceHistory.map(d => d.accuracy),
        borderColor: '#4caf50',
        tension: 0.4
      }
    ]
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Stats Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<LocalFireDepartment sx={{ fontSize: 40, color: '#ff9800' }} />}
            title="Current Streak"
            value={`${streakData.currentStreak} days`}
            subtitle={`Best: ${streakData.bestStreak} days`}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Speed sx={{ fontSize: 40, color: '#2196f3' }} />}
            title="Top Speed"
            value={`${stats.topSpeed} WPM`}
            subtitle="Last 30 days"
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<EmojiEvents sx={{ fontSize: 40, color: '#4caf50' }} />}
            title="Best Accuracy"
            value={`${stats.accuracy}%`}
            subtitle="All-time best"
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Timeline sx={{ fontSize: 40, color: '#9c27b0' }} />}
            title="Total Practice"
            value={`${stats.totalPractice} mins`}
            subtitle="Keep it up!"
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab icon={<TrendingUp />} label="Progress" />
          <Tab icon={<Group />} label="Leaderboard" />
          <Tab icon={<Star />} label="Achievements" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box mb={4}>
        {activeTab === 0 && (
          <Grid container spacing={3} className={`tab-panel ${activeTab === 0 ? 'active' : ''}`}>
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Streak Calendar</Typography>
                <CalendarHeatmap
                  startDate={new Date(Date.now() - 364 * 24 * 60 * 60 * 1000)}
                  endDate={new Date()}
                  values={streakData.streakHistory}
                  classForValue={(value) => {
                    if (!value || value.count === 0) return 'color-empty';
                    return `color-scale-${value.count}`;
                  }}
                />
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Performance Trends</Typography>
                <div className="performance-chart">
                  <Line data={performanceData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: false }
                    }
                  }} />
                </div>
              </Paper>
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Paper elevation={3} sx={{ p: 3 }} className={`tab-panel ${activeTab === 1 ? 'active' : ''}`}>
            <Typography variant="h6" gutterBottom>Top Streaks</Typography>
            <List>
              {streakData.leaderboard.map((entry) => (
                <LeaderboardEntry
                  key={entry.rank}
                  rank={entry.rank}
                  user={entry.user}
                  streak={entry.streak}
                  isCurrentUser={entry.user.name === "You"}
                />
              ))}
            </List>
          </Paper>
        )}

        {activeTab === 2 && (
          <Paper elevation={3} sx={{ p: 3 }} className={`tab-panel ${activeTab === 2 ? 'active' : ''}`}>
            <Typography variant="h6" gutterBottom>Achievements</Typography>
            <Grid container spacing={2}>
              {streakData.achievements.map((achievement) => (
                <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      opacity: achievement.unlocked ? 1 : 0.7,
                      position: 'relative'
                    }}
                    className="achievement-card"
                  >
                    {!achievement.unlocked && (
                      <Lock sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8, 
                        color: 'text.disabled' 
                      }} />
                    )}
                    <Typography variant="subtitle1" fontWeight="bold">
                      {achievement.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {achievement.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard; 