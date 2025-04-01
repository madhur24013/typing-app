import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';
let socket = null;

// Initialize socket connection
export const initSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No auth token found');
    return null;
  }
  
  socket = io(SOCKET_URL, {
    auth: {
      token
    }
  });
  
  socket.on('connect', () => {
    console.log('Socket connected');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });
  
  return socket;
};

// Get socket instance
export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Typing progress functions
export const emitTypingProgress = (data) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('typing_progress', data);
  }
};

export const emitTypingError = (data) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('typing_error', data);
  }
};

export const emitSessionComplete = (data) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('session_complete', data);
  }
};

// Subscribe to events
export const subscribeToTypingStats = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('typing_stats', callback);
  }
};

export const subscribeToErrorRecorded = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('error_recorded', callback);
  }
};

export const subscribeToSessionCompleted = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('session_completed', callback);
  }
};

// Unsubscribe from events
export const unsubscribeFromEvent = (event, callback) => {
  if (socket) {
    socket.off(event, callback);
  }
}; 