import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/common/ThemeToggle';
import NotificationCenter from '../components/notifications/NotificationCenter';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  UserIcon, 
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  LogoutIcon
} from '@heroicons/react/outline';
import { useSubscription } from '../contexts/SubscriptionContext';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { subscription } = useSubscription();
  const location = useLocation();
  
  const handleLogout = () => {
    logout();
  };
  
  const isAdmin = user && user.role === 'admin';
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };
  
  return (
    <div className="main-layout">
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="app-logo">
            <span className="logo-text">TypeShala</span>
          </Link>
          
          <nav className="main-nav">
            <ul>
              <li className={isActive('/')}>
                <Link to="/">Home</Link>
              </li>
              <li className={isActive('/practice')}>
                <Link to="/practice">Practice</Link>
              </li>
              <li className={isActive('/documents')}>
                <Link to="/documents">Documents</Link>
              </li>
              {isAuthenticated && (
                <li className={isActive('/stats')}>
                  <Link to="/stats">Stats</Link>
                </li>
              )}
              {subscription && subscription.tier !== 'FREE' && (
                <li className={isActive('/premium')}>
                  <Link to="/premium">Premium</Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
        
        <div className="header-right">
          {isAuthenticated && <NotificationCenter />}
          <ThemeToggle />
          
          {isAuthenticated ? (
            <div className="user-menu-wrapper">
              <button className="user-menu-button">
                <span className="user-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    <span className="avatar-placeholder">{user.name.charAt(0)}</span>
                  )}
                </span>
                <span className="user-name">{user.name}</span>
              </button>
              
              <div className="user-dropdown">
                <ul>
                  <li>
                    <Link to="/profile">
                      <UserIcon className="menu-icon" />
                      Profile
                    </Link>
                  </li>
                  <li>
                    <Link to="/settings">
                      <CogIcon className="menu-icon" />
                      Settings
                    </Link>
                  </li>
                  {isAdmin && (
                    <li>
                      <Link to="/admin">
                        <ChartBarIcon className="menu-icon" />
                        Admin Dashboard
                      </Link>
                    </li>
                  )}
                  <li className="menu-divider"></li>
                  <li>
                    <button onClick={handleLogout} className="logout-button">
                      <LogoutIcon className="menu-icon" />
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-login">Log In</Link>
              <Link to="/signup" className="btn btn-signup">Sign Up</Link>
            </div>
          )}
        </div>
      </header>
      
      <main className="app-content">
        {children}
      </main>
      
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>TypeShala</h3>
            <p>Improve your typing skills with our gamified practice platform.</p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/practice">Practice</Link></li>
              <li><Link to="/documents">Documents</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} TypeShala. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout; 