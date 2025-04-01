import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Tabs, 
  Tab, 
  Typography, 
  Divider 
} from '@mui/material';
import UserManagement from './UserManagement';
import DocumentManagement from './DocumentManagement';
import StreakMetrics from '../analytics/StreakMetrics';
import SubscriptionOverview from './SubscriptionOverview';
import ExperimentManagement from './ExperimentManagement';
import AnalyticsAlertManagement from './AnalyticsAlertManagement';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box my={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h4" component="h1" gutterBottom>
              Admin Dashboard
            </Typography>
            <Divider />
          </Grid>
          
          <Grid item xs={12}>
            <Paper>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
              >
                <Tab label="Users" {...a11yProps(0)} />
                <Tab label="Documents" {...a11yProps(1)} />
                <Tab label="Analytics" {...a11yProps(2)} />
                <Tab label="Subscriptions" {...a11yProps(3)} />
                <Tab label="Analytics Alerts" {...a11yProps(4)} />
                <Tab label="Experiments" {...a11yProps(5)} />
              </Tabs>
              
              <TabPanel value={tabValue} index={0}>
                <UserManagement />
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <DocumentManagement />
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                <Grid container spacing={4}>
                  <Grid item xs={12}>
                    <StreakMetrics />
                  </Grid>
                  {/* Add more analytics components here as needed */}
                </Grid>
              </TabPanel>
              
              <TabPanel value={tabValue} index={3}>
                <SubscriptionOverview />
              </TabPanel>
              
              <TabPanel value={tabValue} index={4}>
                <AnalyticsAlertManagement />
              </TabPanel>
              
              <TabPanel value={tabValue} index={5}>
                <ExperimentManagement />
              </TabPanel>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default AdminDashboard; 