import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Box,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { experimentAPI } from '../../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`experiment-tabpanel-${index}`}
      aria-labelledby={`experiment-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

const ExperimentManagement = () => {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [experimentResults, setExperimentResults] = useState(null);
  const [selectedExperimentId, setSelectedExperimentId] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [viewType, setViewType] = useState('list');
  
  // Form state
  const [formValues, setFormValues] = useState({
    name: '',
    feature: 'streaks',
    variants: ['control', 'variant_a'],
    description: ''
  });
  
  // Fetch experiments on load
  useEffect(() => {
    fetchExperiments();
  }, []);
  
  const fetchExperiments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await experimentAPI.getAllExperiments();
      if (response.success) {
        setExperiments(response.experiments);
      } else {
        setError(response.message || 'Failed to fetch experiments');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateExperiment = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await experimentAPI.createExperiment(formValues);
      if (response.success) {
        setOpenCreateDialog(false);
        fetchExperiments();
        setFormValues({
          name: '',
          feature: 'streaks',
          variants: ['control', 'variant_a'],
          description: ''
        });
      } else {
        setError(response.message || 'Failed to create experiment');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleExperimentStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'completed' : 'active';
    try {
      setLoading(true);
      const response = await experimentAPI.toggleExperimentStatus(id, newStatus);
      if (response.success) {
        fetchExperiments();
      } else {
        setError(response.message || 'Failed to update experiment status');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewResults = async (id) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedExperimentId(id);
      const response = await experimentAPI.getExperimentResults(id);
      if (response.success) {
        setExperimentResults(response);
        setViewType('results');
      } else {
        setError(response.message || 'Failed to fetch experiment results');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddVariant = () => {
    const variantNum = formValues.variants.length;
    setFormValues({
      ...formValues,
      variants: [...formValues.variants, `variant_${String.fromCharCode(97 + variantNum)}`]
    });
  };
  
  const handleRemoveVariant = (index) => {
    const newVariants = [...formValues.variants];
    newVariants.splice(index, 1);
    setFormValues({
      ...formValues,
      variants: newVariants
    });
  };
  
  const handleVariantChange = (index, value) => {
    const newVariants = [...formValues.variants];
    newVariants[index] = value;
    setFormValues({
      ...formValues,
      variants: newVariants
    });
  };
  
  const renderExperimentList = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Feature</TableCell>
            <TableCell>Variants</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {experiments.map((experiment) => (
            <TableRow key={experiment.name + experiment.feature}>
              <TableCell>{experiment.name}</TableCell>
              <TableCell>{experiment.feature}</TableCell>
              <TableCell>
                {experiment.variants.map((variant) => (
                  <Chip key={variant} label={variant} size="small" style={{ margin: '0 3px' }} />
                ))}
              </TableCell>
              <TableCell>
                <Chip
                  label={experiment.status}
                  color={
                    experiment.status === 'active'
                      ? 'success'
                      : experiment.status === 'draft'
                      ? 'default'
                      : experiment.status === 'completed'
                      ? 'primary'
                      : 'error'
                  }
                />
              </TableCell>
              <TableCell>
                {experiment.start_date
                  ? new Date(experiment.start_date).toLocaleDateString()
                  : 'Not started'}
              </TableCell>
              <TableCell>
                <IconButton 
                  onClick={() => handleToggleExperimentStatus(experiment.id, experiment.status)}
                  disabled={experiment.status === 'completed' || experiment.status === 'cancelled'}
                  title={experiment.status === 'active' ? 'Stop Experiment' : 'Start Experiment'}
                >
                  {experiment.status === 'active' ? <StopIcon /> : <PlayArrowIcon />}
                </IconButton>
                <IconButton 
                  onClick={() => handleViewResults(experiment.id)}
                  title="View Results"
                >
                  <BarChartIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  const renderExperimentResults = () => {
    if (!experimentResults) return null;
    
    const { experiment, results } = experimentResults;
    
    // Format data for charts
    const chartData = results.map(result => ({
      variant: result.variant,
      users: result.userCount,
      avgStreak: result.metrics.avg_streak_length || 0,
      avgLongestStreak: result.metrics.avg_longest_streak || 0,
      retentionRate: (result.metrics.weekly_retention_rate || 0) * 100,
      sessionsPerWeek: result.metrics.avg_sessions_per_week || 0
    }));
    
    return (
      <div>
        <Box display="flex" alignItems="center" mb={2}>
          <Button 
            variant="outlined" 
            onClick={() => setViewType('list')}
            startIcon={<RefreshIcon />}
            sx={{ mr: 2 }}
          >
            Back to List
          </Button>
          <Typography variant="h6">
            Results for: {experiment.name} ({experiment.feature})
          </Typography>
        </Box>
        
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="experiment result tabs"
        >
          <Tab label="Overview" />
          <Tab label="Retention" />
          <Tab label="Engagement" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader title="User Distribution" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="variant" />
                      <YAxis label={{ value: 'Users', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="users" fill="#8884d8" name="Number of Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Average Streak Length" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="variant" />
                      <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgStreak" fill="#82ca9d" name="Average Streak" />
                      <Bar dataKey="avgLongestStreak" fill="#ffc658" name="Average Longest Streak" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Weekly Retention & Engagement" />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="variant" />
                      <YAxis yAxisId="left" orientation="left" label={{ value: '%', position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'Sessions', position: 'insideRight' }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="retentionRate" fill="#8884d8" name="Retention Rate (%)" />
                      <Bar yAxisId="right" dataKey="sessionsPerWeek" fill="#82ca9d" name="Sessions per Week" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Retention Details
          </Typography>
          <Typography variant="body1">
            This section would include more detailed retention metrics and cohort analysis.
          </Typography>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Engagement Details
          </Typography>
          <Typography variant="body1">
            This section would include more detailed engagement metrics such as session length, frequency, etc.
          </Typography>
        </TabPanel>
      </div>
    );
  };
  
  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">A/B Test Experiments</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
        >
          New Experiment
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading && !experiments.length ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        viewType === 'list' ? renderExperimentList() : renderExperimentResults()
      )}
      
      {/* Create Experiment Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Experiment</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Experiment Name"
                  fullWidth
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Feature</InputLabel>
                  <Select
                    value={formValues.feature}
                    onChange={(e) => setFormValues({ ...formValues, feature: e.target.value })}
                    label="Feature"
                  >
                    <MenuItem value="streaks">Streaks</MenuItem>
                    <MenuItem value="rewards">Rewards</MenuItem>
                    <MenuItem value="ui">User Interface</MenuItem>
                    <MenuItem value="notifications">Notifications</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={formValues.description}
                  onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Variants
                </Typography>
                <Box mb={2}>
                  {formValues.variants.map((variant, index) => (
                    <Box key={index} display="flex" alignItems="center" mb={1}>
                      <TextField
                        label={`Variant ${index + 1}`}
                        value={variant}
                        onChange={(e) => handleVariantChange(index, e.target.value)}
                        fullWidth
                        margin="dense"
                      />
                      {index > 1 && (
                        <IconButton onClick={() => handleRemoveVariant(index)} size="small" sx={{ ml: 1 }}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />} 
                  onClick={handleAddVariant}
                  disabled={formValues.variants.length >= 5}
                >
                  Add Variant
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleCreateExperiment} 
            color="primary" 
            variant="contained"
            disabled={!formValues.name || formValues.variants.length < 2}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ExperimentManagement; 