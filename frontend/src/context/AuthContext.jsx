import { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

// Create auth context
const AuthContext = createContext();

// Auth context provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.data.user);
          initSocket(); // Initialize socket connection
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  // Register new user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.register(userData);
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      initSocket(); // Initialize socket connection
      
      return { success: true };
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
      return { success: false, error: error.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login(credentials);
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      initSocket(); // Initialize socket connection
      
      return { success: true };
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    disconnectSocket(); // Disconnect socket
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 