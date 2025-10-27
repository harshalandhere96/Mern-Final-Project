import React, { useState, useEffect } from 'react';
import socketService from '../../config/socket';
import './AlertsPage.css';

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user location
    navigator.geolocation.getCurrentPosition((position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    });

    // Connect socket for real-time alerts
    const socket = socketService.connect();
    socket.on('alert:new', (newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification(`${newAlert.severity.toUpperCase()} Alert`, {
          body: newAlert.title,
          icon: '/alert-icon.png'
        });
      }
    });

    return () => socket.off('alert:new');
  }, []);

  useEffect(() => {
    if (location) fetchAlerts();
  }, [location, filter]);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:5000/api/alerts/active?latitude=${location.latitude}&longitude=${location.longitude}&radius=50`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setAlerts(filter === 'all' ? data.alerts : data.grouped[filter]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Update UI
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ef4444',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#10b981',
      info: '#6b7280'
    };
    return colors[severity] || '#6b7280';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '🔔',
      low: 'ℹ️',
      info: '📢'
    };
    return icons[severity] || '📢';
  };

  if (loading) return <div className="loading">Loading alerts...</div>;

  return (
    <div className="alerts-page">
      <div className="alerts-header">
        <h1>🚨 Safety Alerts</h1>
        <p>Real-time safety notifications for your location</p>
      </div>

      <div className="alerts-filters">
        {['all', 'critical', 'high', 'medium', 'low', 'info'].map(severity => (
          <button
            key={severity}
            className={`filter-btn ${filter === severity ? 'active' : ''}`}
            onClick={() => setFilter(severity)}
          >
            {severity.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <p>✅ No active alerts in your area</p>
            <small>All clear! Enjoy your travels.</small>
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert._id} 
              className="alert-card"
              style={{ borderLeft: `4px solid ${getSeverityColor(alert.severity)}` }}
            >
              <div className="alert-header">
                <span className="alert-icon">{getSeverityIcon(alert.severity)}</span>
                <div className="alert-title">
                  <h3>{alert.title}</h3>
                  <span className={`severity-badge ${alert.severity}`}>
                    {alert.severity}
                  </span>
                </div>
              </div>

              <p className="alert-message">{alert.message}</p>

              {alert.recommendedActions && alert.recommendedActions.length > 0 && (
                <div className="recommended-actions">
                  <strong>Recommended Actions:</strong>
                  <ul>
                    {alert.recommendedActions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="alert-footer">
                <span className="alert-time">
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
                <div className="alert-actions">
                  <button onClick={() => acknowledgeAlert(alert._id)}>
                    ✓ Acknowledge
                  </button>
                  <button>Share</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsPage;