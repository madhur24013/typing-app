import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Grid, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Box,
  Divider
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { analyticsAPI } from '../../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const StreakMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [timeframe, setTimeframe] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, [timeframe]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsAPI.getStreakEngagementMetrics(timeframe);
      if (response.success) {
        setMetrics(response.metrics);
      } else {
        setError(response.message || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (event) => {
    setTimeframe(event.target.value);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      </Box>
    );
  }

  // Format event data for charts
  const formatEventDistribution = () => {
    if (!metrics?.eventDistribution) return [];
    
    return metrics.eventDistribution.map(event => ({
      name: event.event_type.replace('streak_', ''),
      value: event.count
    }));
  };

  // Format reward data for table
  const formatRewardEffectiveness = () => {
    if (!metrics?.rewardEffectiveness) return [];
    
    return metrics.rewardEffectiveness.map(reward => ({
      type: reward.reward_type,
      claimed: reward.times_claimed,
      avgStreak: reward.avg_streak_length.toFixed(1)
    }));
  };

  // Format experiment data for chart
  const formatExperimentData = () => {
    if (!metrics?.experiments) return [];
    
    // Group by experiment name first
    const groupedByExperiment = {};
    metrics.experiments.forEach(exp => {
      if (!groupedByExperiment[exp.name]) {
        groupedByExperiment[exp.name] = [];
      }
      groupedByExperiment[exp.name].push({
        variant: exp.variant,
        users: exp.users,
        avgStreak: exp.avg_streak
      });
    });
    
    // Then format for chart
    return Object.keys(groupedByExperiment).map(name => {
      const data = {
        name: name
      };
      
      groupedByExperiment[name].forEach(variant => {
        data[variant.variant] = variant.avgStreak;
      });
      
      return data;
    });
  };

  return (
    <Card>
      <CardHeader 
        title="Streak System Analytics" 
        action={
          <FormControl variant="outlined" size="small" style={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={timeframe}
              onChange={handleTimeframeChange}
              label="Timeframe"
            >
              <MenuItem value="day">Last 24 Hours</MenuItem>
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
            </Select>
          </FormControl>
        }
      />
      <Divider />
      <CardContent>
        <Grid container spacing={3}>
          {/* Active Users Card */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Users with Streaks
                </Typography>
                <Typography variant="h3" color="primary">
                  {metrics?.activeUsers || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Users with at least one day streak in the last 24 hours
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Retention Impact Card */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Retention Impact
                </Typography>
                <Typography variant="h3" color="primary">
                  {metrics?.retentionImpact?.retentionLift?.toFixed(2) || 0}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Increase in activity for users with 7+ day streaks vs. users with no streaks
                </Typography>
                <Box mt={2}>
                  <Typography variant="body2">
                    Avg. sessions with streak: {metrics?.retentionImpact?.avgSessionsWithStreak?.toFixed(2) || 0}
                  </Typography>
                  <Typography variant="body2">
                    Avg. sessions without streak: {metrics?.retentionImpact?.avgSessionsNoStreak?.toFixed(2) || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Event Distribution Chart */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Event Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={formatEventDistribution()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {formatEventDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} events`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Reward Effectiveness Table */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Reward Effectiveness
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Reward Type</TableCell>
                        <TableCell align="right">Claims</TableCell>
                        <TableCell align="right">Avg. Streak</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formatRewardEffectiveness().map((row) => (
                        <TableRow key={row.type}>
                          <TableCell component="th" scope="row">
                            {row.type}
                          </TableCell>
                          <TableCell align="right">{row.claimed}</TableCell>
                          <TableCell align="right">{row.avgStreak}</TableCell>
                        </TableRow>
                      ))}
                      {formatRewardEffectiveness().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            No reward data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Experiment Results Chart */}
          {metrics?.experiments && metrics.experiments.length > 0 && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    A/B Test Results
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={formatExperimentData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: 'Average Streak Length', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="control" fill="#8884d8" />
                      <Bar dataKey="variant_a" fill="#82ca9d" />
                      <Bar dataKey="variant_b" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default StreakMetrics; 