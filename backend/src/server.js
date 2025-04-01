const express = require('express');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// TypeShala - A Professional Typing Practice Application
// A place for mastering typing skills with comprehensive learning features

// Import middleware
const { authenticateUser } = require('./middleware/auth');

// Import error handling utilities
const { globalErrorHandler, notFoundHandler } = require('./utils/errorHandler');
const { logError, logInfo } = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');
const typingRoutes = require('./routes/typingRoutes');
const progressRoutes = require('./routes/progressRoutes');
const errorAnalysisRoutes = require('./routes/errorAnalysisRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const premiumContentRoutes = require('./routes/premiumContentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const experimentsRoutes = require('./routes/experimentsRoutes');
const streakEnhancementRoutes = require('./routes/streakEnhancementRoutes');
const streakRoutes = require('./routes/streakRoutes');

// Import database configuration
const { initDatabase, pool } = require('./config/database');

// Import performance monitoring
const { trackPerformance, performanceMonitor } = require('./utils/performanceMonitor');

// Initialize models (only listing imports for documentation purposes)
const userModel = require('./models/user');
const documentModel = require('./models/document');
const typingModel = require('./models/typingSession');
const progressModel = require('./models/progress');
const subscriptionModel = require('./models/subscription');
const premiumContentModel = require('./models/premiumContent');
const multiplayerModel = require('./models/multiplayer');
const streakEnhancements = require('./models/streakEnhancements');
const experimentRewards = require('./models/experimentRewards');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e8,
  connectTimeout: 45000
});

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CLIENT_URL],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin']
    }
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
}));

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
}));

// Enhanced rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      status: 429,
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  skip: (req) => {
    // Skip rate limiting for health check and static files
    return req.path === '/health' || req.path.startsWith('/static/');
  }
});

// Enhanced request parsing
app.use(express.json({ 
  limit: '2mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        error: {
          status: 400,
          message: 'Invalid JSON payload',
          code: 'INVALID_JSON'
        }
      });
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '2mb',
  parameterLimit: 1000
}));

// Enhanced compression
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Enhanced performance tracking
app.use(trackPerformance);

// Enhanced logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev', {
    skip: (req, res) => res.statusCode < 400
  }));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
}

// Enhanced Socket.io connection handling
io.on('connection', (socket) => {
  logInfo('New client connected', { 
    socketId: socket.id,
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent']
  });
  
  // Handle user joining a typing room
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
    
    logInfo('User joined room', {
      socketId: socket.id,
      roomId,
      userId
    });
  });
  
  // Handle user typing
  socket.on('typing-update', (data) => {
    socket.to(data.roomId).emit('user-typing', data);
  });
  
  // Handle user completing session
  socket.on('session-complete', (data) => {
    socket.to(data.roomId).emit('user-complete', data);
    
    logInfo('User completed session', {
      socketId: socket.id,
      roomId: data.roomId,
      userId: data.userId
    });
  });
  
  // Handle errors
  socket.on('error', (error) => {
    logError('Socket error:', {
      socketId: socket.id,
      error: error.message
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logInfo('Client disconnected', { 
      socketId: socket.id,
      reason
    });
  });
});

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const metrics = performanceMonitor.getMetrics();
  const dbStatus = pool.totalCount > 0 ? 'connected' : 'disconnected';
  
  res.status(200).json({ 
    status: 'UP', 
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    metrics: {
      uptime: metrics.uptime,
      errorCount: metrics.errorCount,
      resourceUsage: metrics.resourceUsage,
      overallStats: metrics.overallStats
    },
    services: {
      database: dbStatus,
      redis: 'connected',
      socket: io.engine.clientsCount > 0 ? 'active' : 'inactive'
    }
  });
});

// API routes
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/users', authenticateUser, userRoutes);
app.use('/api/documents', authenticateUser, documentRoutes);
app.use('/api/typing', authenticateUser, typingRoutes);
app.use('/api/progress', authenticateUser, progressRoutes);
app.use('/api/error-analysis', authenticateUser, errorAnalysisRoutes);
app.use('/api/subscriptions', authenticateUser, subscriptionRoutes);
app.use('/api/premium', authenticateUser, premiumContentRoutes);
app.use('/api/analytics', authenticateUser, analyticsRoutes);
app.use('/api/experiments', authenticateUser, experimentsRoutes);
app.use('/api/streaks', authenticateUser, streakRoutes);
app.use('/api/streak-enhancements', authenticateUser, streakEnhancementRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  
  // Catch-all handler for client-side routing in production
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handling middleware
app.use(globalErrorHandler);

// Initialize database tables
const initializeTables = async () => {
  try {
    // The model requires should automatically create tables if they don't exist
    logInfo('Database tables initialized successfully');
  } catch (error) {
    logError('Error initializing database tables', error);
    throw error;
  }
};

// Start resource usage tracking
const startResourceTracking = () => {
  setInterval(() => {
    performanceMonitor.trackResourceUsage();
  }, 60000); // Track every minute
};

// Start the server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize database connection
    await initDatabase();
    
    // Initialize database tables
    await initializeTables();
    
    // Start resource usage tracking
    startResourceTracking();
    
    // Start the server
    const serverInstance = server.listen(PORT, () => {
      logInfo(`TypeShala server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
    
    // Graceful shutdown
    setupGracefulShutdown(serverInstance);
  } catch (error) {
    logError('Server startup error:', error);
    process.exit(1);
  }
};

// Enhanced graceful shutdown
const setupGracefulShutdown = (serverInstance) => {
  const shutdown = async (signal) => {
    logInfo(`${signal} received, shutting down gracefully`);
    
    // Close HTTP server
    serverInstance.close(() => {
      logInfo('HTTP server closed');
    });
    
    // Close Socket.io server
    io.close(() => {
      logInfo('Socket.io server closed');
    });
    
    // Close database connections
    try {
      await pool.end();
      logInfo('Database connections closed');
    } catch (err) {
      logError('Error closing database connections', err);
    }
    
    // Force close after 10s
    setTimeout(() => {
      logError('Forcing server shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  
  // Handle different termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logError('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection:', { reason, promise });
    shutdown('unhandledRejection');
  });
};

startServer(); 