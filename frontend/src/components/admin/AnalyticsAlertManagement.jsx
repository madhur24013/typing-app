import React, { useState, useEffect } from 'react';
import { 
  LightningBoltIcon, 
  ChartBarIcon, 
  RefreshIcon, 
  ExclamationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/outline';
import api from '../../services/api';
import './AdminComponents.css';

const AnalyticsAlertManagement = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionTaken, setActionTaken] = useState({});

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredAlerts(alerts);
    } else {
      setFilteredAlerts(alerts.filter(alert => alert.alert_type === filter));
    }
  }, [filter, alerts]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/admin/analytics/alerts');
      
      if (response.data.success) {
        setAlerts(response.data.alerts);
        setFilteredAlerts(response.data.alerts);
      } else {
        setError(response.data.message || 'Failed to fetch alerts');
      }
    } catch (error) {
      setError(error.message || 'An error occurred while fetching alerts');
      console.error('Error fetching analytics alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAlertAsProcessed = async (alertId, actions = {}) => {
    try {
      const response = await api.post(`/admin/analytics/alerts/${alertId}/process`, {
        actions
      });
      
      if (response.data.success) {
        // Update local state
        setAlerts(prevAlerts => 
          prevAlerts.map(alert => 
            alert.id === alertId ? { ...alert, is_processed: true } : alert
          )
        );
        setActionTaken(prev => ({ ...prev, [alertId]: true }));
        
        if (selectedAlert && selectedAlert.id === alertId) {
          setSelectedAlert(prev => ({ ...prev, is_processed: true }));
        }
        
        return true;
      } else {
        setError(response.data.message || 'Failed to process alert');
        return false;
      }
    } catch (error) {
      setError(error.message || 'An error occurred while processing the alert');
      console.error('Error processing alert:', error);
      return false;
    }
  };

  const handleRunAnalyticsCheck = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/check-analytics');
      
      if (response.data.success) {
        fetchAlerts();
      } else {
        setError(response.data.message || 'Failed to run analytics check');
      }
    } catch (error) {
      setError(error.message || 'An error occurred while running analytics check');
      console.error('Error running analytics check:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertClick = (alert) => {
    setSelectedAlert(alert);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAlert(null);
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'retention_lift':
        return <LightningBoltIcon className="w-5 h-5 text-yellow-500" />;
      case 'experiment_significance':
        return <ChartBarIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertTypeLabel = (type) => {
    switch (type) {
      case 'retention_lift':
        return 'Retention Lift';
      case 'experiment_significance':
        return 'Experiment Significance';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get unique alert types for filter
  const alertTypes = ['all', ...new Set(alerts.map(alert => alert.alert_type))];

  // Handle experiment alerts
  const handleExperimentAlert = async (alert) => {
    // Depending on the experiment result, we might want to make it the default variant
    if (alert.current_value >= 50) { // If improvement is 50% or more
      try {
        await api.post(`/admin/experiments/promote-variant`, {
          metric: alert.metric_name
        });
        
        await markAlertAsProcessed(alert.id, {
          action: 'promote_variant',
          details: `Promoted variant because improvement was ${alert.current_value.toFixed(1)}%`
        });
        
        return true;
      } catch (error) {
        console.error('Error promoting variant:', error);
        return false;
      }
    } else {
      return await markAlertAsProcessed(alert.id, {
        action: 'acknowledged',
        details: 'Experiment monitored but no action taken yet'
      });
    }
  };

  // Handle retention alerts
  const handleRetentionAlert = async (alert) => {
    return await markAlertAsProcessed(alert.id, {
      action: 'acknowledged',
      details: 'Retention improvement noted'
    });
  };

  const handleProcessAlert = async () => {
    if (!selectedAlert) return;
    
    let success = false;
    
    switch (selectedAlert.alert_type) {
      case 'experiment_significance':
        success = await handleExperimentAlert(selectedAlert);
        break;
      case 'retention_lift':
        success = await handleRetentionAlert(selectedAlert);
        break;
      default:
        success = await markAlertAsProcessed(selectedAlert.id, {
          action: 'acknowledged',
          details: 'Alert reviewed'
        });
    }
    
    if (success) {
      setShowModal(false);
    }
  };

  return (
    <div className="analytics-alert-management">
      <div className="header-section">
        <h2 className="section-title">Analytics Alerts</h2>
        <div className="header-actions">
          <select 
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {alertTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Alerts' : getAlertTypeLabel(type)}
              </option>
            ))}
          </select>
          <button 
            className="refresh-button"
            onClick={handleRunAnalyticsCheck}
            disabled={loading}
          >
            <RefreshIcon className="w-5 h-5 mr-1" />
            Run Analytics Check
          </button>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          <ExclamationCircleIcon className="w-5 h-5 mr-1" />
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading alerts...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="empty-state">
          <p>No analytics alerts found.</p>
        </div>
      ) : (
        <div className="alerts-table">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Metric</th>
                <th>Value</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map(alert => (
                <tr 
                  key={alert.id}
                  className={alert.is_processed ? 'processed' : ''}
                >
                  <td className="alert-type">
                    {getAlertTypeIcon(alert.alert_type)}
                    <span>{getAlertTypeLabel(alert.alert_type)}</span>
                  </td>
                  <td>{alert.metric_name.replace(/_/g, ' ')}</td>
                  <td className="alert-value">
                    {alert.current_value.toFixed(1)}%
                    {alert.current_value >= 30 && <span className="significant-tag">Significant</span>}
                  </td>
                  <td>{formatDate(alert.created_at)}</td>
                  <td>
                    {alert.is_processed ? (
                      <span className="status-processed">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        Processed
                      </span>
                    ) : (
                      <span className="status-pending">Pending</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className="view-details-btn"
                      onClick={() => handleAlertClick(alert)}
                      disabled={actionTaken[alert.id]}
                    >
                      {actionTaken[alert.id] ? 'Processed' : 'View Details'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showModal && selectedAlert && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{getAlertTypeLabel(selectedAlert.alert_type)} Alert</h3>
              <button className="close-modal-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="alert-detail">
                <label>Metric:</label>
                <span>{selectedAlert.metric_name.replace(/_/g, ' ')}</span>
              </div>
              
              <div className="alert-detail">
                <label>Threshold:</label>
                <span>{selectedAlert.threshold_value}%</span>
              </div>
              
              <div className="alert-detail">
                <label>Current Value:</label>
                <span className="current-value">{selectedAlert.current_value.toFixed(1)}%</span>
              </div>
              
              <div className="alert-detail">
                <label>Description:</label>
                <span>{selectedAlert.description}</span>
              </div>
              
              <div className="alert-detail">
                <label>Date:</label>
                <span>{formatDate(selectedAlert.created_at)}</span>
              </div>
              
              <div className="alert-detail">
                <label>Status:</label>
                <span className={selectedAlert.is_processed ? 'status-processed' : 'status-pending'}>
                  {selectedAlert.is_processed ? 'Processed' : 'Pending'}
                </span>
              </div>
              
              <div className="recommendation">
                <h4>Recommended Action:</h4>
                {selectedAlert.alert_type === 'experiment_significance' && (
                  <p>
                    This experiment variant is showing significant improvement. 
                    Consider {selectedAlert.current_value >= 50 ? 'making this the default variant' : 'continuing to monitor results'}.
                  </p>
                )}
                
                {selectedAlert.alert_type === 'retention_lift' && (
                  <p>
                    The streak feature is showing positive impact on user retention.
                    Consider highlighting this feature more prominently to increase adoption.
                  </p>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              
              {!selectedAlert.is_processed && (
                <button 
                  className="process-btn"
                  onClick={handleProcessAlert}
                >
                  {selectedAlert.alert_type === 'experiment_significance' && selectedAlert.current_value >= 50
                    ? 'Promote Variant'
                    : 'Mark as Processed'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsAlertManagement; 