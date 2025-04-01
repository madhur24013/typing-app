import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, CheckIcon } from '@heroicons/react/outline';
import { XIcon } from '@heroicons/react/solid';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const { isAuthenticated } = useAuth();

  // Fetch notifications on component mount and when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      
      // Set up polling for new notifications every minute
      const interval = setInterval(fetchNotifications, 60000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const response = await api.get('/notifications/user');
      
      if (response.data.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.notifications.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notifications as read
  const markAsRead = async (notificationIds) => {
    if (!notificationIds || notificationIds.length === 0) return;
    
    try {
      const response = await api.post('/notifications/mark-read', {
        notificationIds
      });
      
      if (response.data.success) {
        // Update local state
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notificationIds.includes(notification.id) 
              ? { ...notification, is_read: true } 
              : notification
          )
        );
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    const unreadIds = notifications
      .filter(notification => !notification.is_read)
      .map(notification => notification.id);
    
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // If not read, mark as read
    if (!notification.is_read) {
      markAsRead([notification.id]);
    }
    
    // If there's an action URL, navigate to it
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    
    setIsOpen(false);
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckIcon className="notification-icon success" />;
      case 'warning':
        return <span className="notification-icon warning">⚠️</span>;
      case 'error':
        return <span className="notification-icon error">❌</span>;
      default:
        return <span className="notification-icon info">ℹ️</span>;
    }
  };

  // Format notification time
  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // diff in seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    
    return format(date, 'MMM d, yyyy');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <BellIcon className="bell-icon" />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>
      
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {isLoading ? (
              <div className="loading-spinner">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="empty-state">
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    {getNotificationIcon(notification.type)}
                    <div className="notification-text">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {formatNotificationTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="notification-footer">
            <button 
              className="close-btn"
              onClick={() => setIsOpen(false)}
            >
              <XIcon className="close-icon" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 