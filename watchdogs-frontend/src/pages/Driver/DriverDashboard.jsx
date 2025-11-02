import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DriverDashboard.css';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDriverData();
  }, []);

  const loadDriverData = async () => {
    try {
      const token = localStorage.getItem('driverToken');
      
      if (!token) {
        navigate('/driver/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/driver/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setDriver(data.driver);
      } else {
        navigate('/driver/login');
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
      navigate('/driver/login');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      const token = localStorage.getItem('driverToken');
      
      const response = await fetch('http://localhost:5000/api/driver/auth/toggle-online', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setDriver({
          ...driver,
          isOnline: data.driver.isOnline,
          isAvailable: data.driver.isAvailable
        });
        alert(data.message);
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('❌ Failed to update status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('driverToken');
    localStorage.removeItem('driverData');
    navigate('/driver/login');
  };

  if (loading) {
    return (
      <div className="driver-dashboard loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  const getStatusColor = () => {
    if (driver.isOnline) return '#10b981';
    return '#6b7280';
  };

  const getVerificationBadge = () => {
    const statusColors = {
      pending: '#f59e0b',
      under_review: '#3b82f6',
      approved: '#10b981',
      rejected: '#ef4444'
    };
    return statusColors[driver.verificationStatus] || '#6b7280';
  };

  return (
    <div className="driver-dashboard">
      <div className="dashboard-header">
        <h1>🚕 Driver Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Status Card */}
      <div className="status-card">
        <div className="status-info">
          <h2>Welcome, {driver.firstName}!</h2>
          <div 
            className="status-badge"
            style={{ background: getStatusColor() }}
          >
            {driver.isOnline ? '🟢 Online' : '⚫ Offline'}
          </div>
        </div>
        
        <button 
          className="toggle-btn"
          onClick={handleToggleOnline}
          disabled={driver.verificationStatus !== 'approved'}
        >
          {driver.isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* Verification Status */}
      <div className="verification-card">
        <h3>📋 Account Status</h3>
        <div className="verification-details">
          <div className="detail-row">
            <span>Account Status:</span>
            <span className="status-value">{driver.accountStatus}</span>
          </div>
          <div className="detail-row">
            <span>Verification:</span>
            <span 
              className="status-badge small"
              style={{ background: getVerificationBadge() }}
            >
              {driver.verificationStatus}
            </span>
          </div>
          {driver.rejectionReason && (
            <div className="rejection-reason">
              <strong>Rejection Reason:</strong>
              <p>{driver.rejectionReason}</p>
            </div>
          )}
        </div>

        {driver.verificationStatus === 'pending' && (
          <div className="info-message">
            ℹ️ Your documents are pending review. You'll be notified once approved.
          </div>
        )}
        
        {driver.verificationStatus === 'under_review' && (
          <div className="info-message">
            ⏳ Your documents are under review. This usually takes 24-48 hours.
          </div>
        )}

        {driver.verificationStatus === 'rejected' && (
          <div className="error-message">
            ❌ Your application was rejected. Please contact support.
          </div>
        )}
      </div>

      {/* Stats Card */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{driver.rating.average.toFixed(1)}</div>
          <div className="stat-label">Rating</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚗</div>
          <div className="stat-value">{driver.stats.completedRides}</div>
          <div className="stat-label">Rides</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">₹{driver.earnings.total.toFixed(0)}</div>
          <div className="stat-label">Earnings</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{driver.stats.acceptanceRate}%</div>
          <div className="stat-label">Acceptance</div>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="vehicle-card">
        <h3>🚗 Vehicle Details</h3>
        <div className="vehicle-details">
          <p><strong>Type:</strong> {driver.vehicle.type}</p>
          <p><strong>Make:</strong> {driver.vehicle.make}</p>
          <p><strong>Model:</strong> {driver.vehicle.model}</p>
          <p><strong>Year:</strong> {driver.vehicle.year}</p>
          <p><strong>Color:</strong> {driver.vehicle.color}</p>
          <p><strong>Registration:</strong> {driver.vehicle.registrationNumber}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="actions-card">
        <h3>⚡ Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn">
            📊 View Earnings
          </button>
          <button className="action-btn">
            📜 Ride History
          </button>
          <button className="action-btn">
            ⚙️ Settings
          </button>
          <button className="action-btn">
            📞 Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;