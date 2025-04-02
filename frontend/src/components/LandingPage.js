import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Fade
} from '@mui/material';
import { 
  LocalFireDepartment,
  TrendingUp,
  EmojiEvents,
  Speed,
  Group,
  Timeline,
  CheckCircle,
  Keyboard,
  Leaderboard,
  Share,
  DarkMode,
  LightMode,
  Star,
  EmojiEvents as Trophy,
  Timer,
  KeyboardArrowRight
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/LandingPage.css';

const FeatureCard = ({ icon, title, description }) => (
  <motion.div
    whileHover={{ y: -5 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <Paper 
      elevation={2} 
      className="feature-card"
      sx={{ 
        p: 3, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        textAlign: 'center'
      }}
    >
      <Box className="feature-icon">
        {icon}
      </Box>
      <Typography variant="h6" sx={{ my: 2 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  </motion.div>
);

const Testimonial = ({ name, avatar, content, streak }) => (
  <Card className="testimonial-card" sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={2}>
        <Avatar src={avatar} sx={{ mr: 2 }}>{name[0]}</Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {streak} day streak
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary">
        "{content}"
      </Typography>
    </CardContent>
  </Card>
);

const TopStreakHolder = ({ rank, name, streak, avatar }) => (
  <ListItem className={`streak-holder streak-rank-${rank}`}>
    <ListItemAvatar>
      <Avatar src={avatar} sx={{ bgcolor: rank <= 3 ? 'primary.main' : 'grey.400' }}>
        {rank}
      </Avatar>
    </ListItemAvatar>
    <ListItemText
      primary={name}
      secondary={`${streak} day streak`}
    />
  </ListItem>
);

const LiveStat = ({ icon, value, label, color }) => (
  <Paper className="live-stat-card" sx={{ p: 2, textAlign: 'center' }}>
    <Box className="live-stat-icon" sx={{ color }}>
      {icon}
    </Box>
    <Typography variant="h4" className="live-stat-value">
      {value}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
  </Paper>
);

const AchievementBadge = ({ icon, title, description, progress }) => (
  <Paper className="achievement-badge" sx={{ p: 2, textAlign: 'center' }}>
    <Box className="achievement-icon">
      {icon}
    </Box>
    <Typography variant="subtitle1" fontWeight="bold">
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      {description}
    </Typography>
    <LinearProgress 
      variant="determinate" 
      value={progress} 
      sx={{ 
        height: 6, 
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.1)'
      }}
    />
  </Paper>
);

const LandingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeUsers, setActiveUsers] = useState(1234);
  const [fastestTypist, setFastestTypist] = useState({ name: "John D.", wpm: 145 });
  const [totalWords, setTotalWords] = useState(1234567);
  const [showKeyboard, setShowKeyboard] = useState(false);

  useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      setActiveUsers(prev => prev + Math.floor(Math.random() * 5));
      setTotalWords(prev => prev + Math.floor(Math.random() * 1000));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <LocalFireDepartment sx={{ fontSize: 40, color: theme.palette.warning.main }} />,
      title: "Daily Streaks",
      description: "Build and maintain your typing streaks. The longer you maintain, the more rewards you unlock!"
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: theme.palette.info.main }} />,
      title: "Performance Tracking",
      description: "Monitor your WPM, accuracy, and progress with detailed analytics and insights."
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 40, color: theme.palette.success.main }} />,
      title: "Achievements",
      description: "Earn badges and rewards as you hit milestones and improve your skills."
    },
    {
      icon: <Group sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: "Community",
      description: "Compete with friends, join challenges, and climb the global leaderboards."
    }
  ];

  const testimonials = [
    {
      name: "Sarah K.",
      avatar: "https://i.pravatar.cc/150?img=1",
      content: "This platform helped me improve my typing speed from 40 to 90 WPM in just two months!",
      streak: 45
    },
    {
      name: "Michael R.",
      avatar: "https://i.pravatar.cc/150?img=2",
      content: "The streak system keeps me motivated. I haven't missed a day in 3 months!",
      streak: 90
    },
    {
      name: "Emily L.",
      avatar: "https://i.pravatar.cc/150?img=3",
      content: "Love the competitive aspects and daily challenges. It makes practice fun!",
      streak: 30
    }
  ];

  const topStreaks = [
    { rank: 1, name: "Alex M.", streak: 120, avatar: "https://i.pravatar.cc/150?img=4" },
    { rank: 2, name: "Jessica T.", streak: 115, avatar: "https://i.pravatar.cc/150?img=5" },
    { rank: 3, name: "David W.", streak: 110, avatar: "https://i.pravatar.cc/150?img=6" },
    { rank: 4, name: "Rachel S.", streak: 105, avatar: "https://i.pravatar.cc/150?img=7" },
    { rank: 5, name: "Chris P.", streak: 100, avatar: "https://i.pravatar.cc/150?img=8" }
  ];

  const achievements = [
    {
      icon: <Speed sx={{ fontSize: 30 }} />,
      title: "Speed Demon",
      description: "Reach 100 WPM",
      progress: 75
    },
    {
      icon: <CheckCircle sx={{ fontSize: 30 }} />,
      title: "Perfect Accuracy",
      description: "Achieve 100% accuracy",
      progress: 60
    },
    {
      icon: <LocalFireDepartment sx={{ fontSize: 30 }} />,
      title: "Streak Master",
      description: "Maintain a 30-day streak",
      progress: 45
    }
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box 
        className="hero-gradient"
        sx={{ 
          color: 'white',
          py: 8,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="hero-text"
              >
                <Typography variant="h2" gutterBottom fontWeight="bold">
                  Master Typing.
                  <br />
                  Break Records.
                </Typography>
                <Typography variant="h6" paragraph sx={{ opacity: 0.9 }}>
                  Join thousands of users who are improving their typing skills through our gamified, streak-based learning platform.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button 
                    variant="contained" 
                    size="large"
                    color="secondary"
                    className="cta-button"
                    endIcon={<KeyboardArrowRight />}
                  >
                    Start Typing
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="large"
                    className="cta-button"
                    startIcon={<Leaderboard />}
                  >
                    View Leaderboard
                  </Button>
                </Box>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="hero-image-container"
              >
                <Box 
                  component="img"
                  src="/typing-illustration.png"
                  alt="Typing Illustration"
                  className="hero-image"
                />
                <motion.div
                  className="floating-elements"
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Star sx={{ fontSize: 40, color: '#FFD700' }} />
                </motion.div>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Live Stats Section */}
      <Container maxWidth="lg" sx={{ py: 4, mt: -4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <LiveStat
              icon={<Group />}
              value={activeUsers.toLocaleString()}
              label="Active Users"
              color="primary.main"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <LiveStat
              icon={<Speed />}
              value={`${fastestTypist.wpm} WPM`}
              label={`Fastest: ${fastestTypist.name}`}
              color="success.main"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <LiveStat
              icon={<Timeline />}
              value={totalWords.toLocaleString()}
              label="Words Typed Today"
              color="warning.main"
            />
          </Grid>
        </Grid>
      </Container>

      {/* Features Section with Enhanced Design */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" align="center" gutterBottom className="section-title">
          Why Choose Our Platform?
        </Typography>
        <Grid container spacing={4} className="feature-grid" sx={{ mt: 4 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <FeatureCard {...feature} />
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Achievements Preview */}
      <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" align="center" gutterBottom className="section-title">
            Unlock Achievements
          </Typography>
          <Grid container spacing={3} sx={{ mt: 4 }}>
            {achievements.map((achievement, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <AchievementBadge {...achievement} />
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Live Streak Counter with Enhanced Design */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom className="section-title">
              Top Streak Holders
            </Typography>
            <Paper elevation={3} className="streak-leaderboard">
              <List>
                {topStreaks.map((holder) => (
                  <TopStreakHolder key={holder.rank} {...holder} />
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom className="section-title">
              Platform Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper className="stats-card" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" className="stat-counter" color="primary">1.2M+</Typography>
                  <Typography variant="body2" color="text.secondary">Active Users</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper className="stats-card" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" className="stat-counter" color="secondary">500K+</Typography>
                  <Typography variant="body2" color="text.secondary">Active Streaks</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper className="stats-card" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" className="stat-counter" color="success.main">85%</Typography>
                  <Typography variant="body2" color="text.secondary">Improved WPM</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper className="stats-card" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" className="stat-counter" color="warning.main">10M+</Typography>
                  <Typography variant="body2" color="text.secondary">Practice Sessions</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>

      {/* Testimonials with Enhanced Design */}
      <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" align="center" gutterBottom className="section-title">
            What Our Users Say
          </Typography>
          <Grid container spacing={4} className="testimonial-grid" sx={{ mt: 4 }}>
            {testimonials.map((testimonial, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                >
                  <Testimonial {...testimonial} />
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section with Enhanced Design */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8, position: 'relative', overflow: 'hidden' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" gutterBottom className="cta-title">
            Ready to Start Your Typing Journey?
          </Typography>
          <Typography variant="h6" paragraph sx={{ opacity: 0.9 }}>
            Join our community and transform your typing skills today!
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              color="secondary" 
              size="large"
              className="cta-button"
              endIcon={<KeyboardArrowRight />}
              sx={{ 
                px: 4, 
                py: 1.5,
                fontSize: '1.2rem'
              }}
            >
              Start Your Streak Today!
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              className="cta-button"
              startIcon={<Share />}
            >
              Share with Friends
            </Button>
          </Box>
        </Container>
        <Box 
          className="cta-background"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)',
            backgroundSize: '30px 30px',
            opacity: 0.1,
            animation: 'moveBackground 20s linear infinite'
          }}
        />
      </Box>
    </Box>
  );
};

export default LandingPage; 