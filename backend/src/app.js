/**
 * Main application file for TypeShala backend
 */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { authenticateUser } = require('./middleware/auth');
const db = require('./config/database');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Define routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const streakRoutes = require('./routes/streakRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateUser, userRoutes);
app.use('/api/documents', authenticateUser, documentRoutes);
app.use('/api/admin', adminRoutes); // adminRoutes already has auth middleware
app.use('/api/subscriptions', authenticateUser, subscriptionRoutes);
app.use('/api/streaks', authenticateUser, streakRoutes);
app.use('/api/notifications', notificationRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to TypeShala API',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// Initialize database and tables
(async () => {
  try {
    // Test database connection
    await db.query('SELECT 1');
    console.log('Database connected successfully');
    
    // Initialize tables
    const subscriptionController = require('./controllers/subscriptionController');
    await subscriptionController.initializeSubscriptionTables();
    
    const streakController = require('./controllers/streakController');
    await streakController.initializeStreakTables();
    
    const notificationController = require('./controllers/notificationController');
    await notificationController.initializeNotificationTables();
    
    // Start the analytics check scheduler
    notificationController.scheduleAnalyticsCheck();
    console.log('Notification system initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
})();

// Set port and start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export app for testing
module.exports = app; 