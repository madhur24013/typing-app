const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Initialize Socket.IO
function initSocketService(server) {
  const io = socketIo(server, {
    cors: {
      origin: '*', // In production, restrict to specific origins
      methods: ['GET', 'POST']
    }
  });

  // Authenticate socket connections using JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);
    
    // Join user to their own room
    const userRoom = `user_${socket.user.id}`;
    socket.join(userRoom);
    
    // Handle typing progress updates
    socket.on('typing_progress', (data) => {
      const { sessionId, wpm, accuracy, progress, currentTime } = data;
      
      // Broadcast real-time stats to the user's room
      io.to(userRoom).emit('typing_stats', {
        sessionId,
        wpm,
        accuracy,
        progress,
        currentTime
      });
    });
    
    // Handle typing errors
    socket.on('typing_error', (data) => {
      const { sessionId, errorContent, expectedContent, position } = data;
      
      // Could save errors to database here if needed
      // For now, just emit back to user for UI updates
      io.to(userRoom).emit('error_recorded', {
        sessionId,
        errorContent,
        expectedContent,
        position
      });
    });
    
    // Handle session completion
    socket.on('session_complete', (data) => {
      const { sessionId, wpm, accuracy, duration } = data;
      
      // Send completion confirmation
      io.to(userRoom).emit('session_completed', {
        sessionId,
        wpm,
        accuracy,
        duration
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
    });
  });
  
  return io;
}

module.exports = initSocketService; 