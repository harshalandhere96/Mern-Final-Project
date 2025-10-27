import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [pendingIds, setPendingIds] = useState([]);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      alert('Access denied. Admin only.');
      navigate('/dashboard');
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.dashboard);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) setUsers(data.users);
  };

  const verifyUser = async (userId) => {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isVerified: true })
    });
    fetchUsers();
  };

  const createAlert = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const alertData = {
      alertType: formData.get('alertType'),
      severity: formData.get('severity'),
      title: formData.get('title'),
      message: formData.get('message'),
      location: {
        type: 'Point',
        coordinates: [
          parseFloat(formData.get('longitude')),
          parseFloat(formData.get('latitude'))
        ]
      },
      affectedArea: {
        country: formData.get('country'),
        city: formData.get('city'),
        radius: parseFloat(formData.get('radius'))
      }
    };

    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/admin/alerts/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(alertData)
    });

    if (response.ok) {
      alert('Alert created and broadcasted!');
      e.target.reset();
    }
  };

  if (loading) return <div>Loading admin dashboard...</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>👨‍💼 Admin Dashboard</h1>
        <button onClick={() => navigate('/dashboard')}>Back to Main</button>
      </div>

      <div className="admin-tabs">
        <button 
          className={tab === 'overview' ? 'active' : ''}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button 
          className={tab === 'users' ? 'active' : ''}
          onClick={() => { setTab('users'); fetchUsers(); }}
        >
          Users
        </button>
        <button 
          className={tab === 'alerts' ? 'active' : ''}
          onClick={() => setTab('alerts')}
        >
          Create Alert
        </button>
        <button 
          className={tab === 'reports' ? 'active' : ''}
          onClick={() => setTab('reports')}
        >
          Moderate Reports
        </button>
        <button 
          className={tab === 'digitalids' ? 'active' : ''}
          onClick={() => setTab('digitalids')}
        >
          Verify IDs
        </button>
      </div>

      <div className="admin-content">
        {tab === 'overview' && dashboardData && (
          <div className="overview-grid">
            <div className="stat-card">
              <h3>Total Users</h3>
              <div className="stat-number">{dashboardData.overview.totalUsers}</div>
              <small>+{dashboardData.overview.newUsersLast30Days} this month</small>
            </div>
            <div className="stat-card">
              <h3>Total Reports</h3>
              <div className="stat-number">{dashboardData.overview.totalReports}</div>
              <small>{dashboardData.overview.pendingReports} pending</small>
            </div>
            <div className="stat-card alert">
              <h3>Active Emergencies</h3>
              <div className="stat-number">{dashboardData.overview.activeEmergencies}</div>
              <small>Requires attention</small>
            </div>
            <div className="stat-card">
              <h3>Active Alerts</h3>
              <div className="stat-number">{dashboardData.overview.activeAlerts}</div>
            </div>
            <div className="stat-card">
              <h3>Digital IDs</h3>
              <div className="stat-number">{dashboardData.overview.verifiedDigitalIds}</div>
              <small>{dashboardData.overview.pendingDigitalIds} pending verification</small>
            </div>
            <div className="stat-card">
              <h3>Avg Response Time</h3>
              <div className="stat-number">
                {Math.round(dashboardData.avgEmergencyResponseTime)} min
              </div>
              <small>Emergency resolution</small>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Verified</th>
                  <th>Premium</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.firstName} {user.lastName}</td>
                    <td>{user.email}</td>
                    <td>{user.isVerified ? '✓' : '✗'}</td>
                    <td>{user.premiumStatus ? '⭐' : '-'}</td>
                    <td>
                      {!user.isVerified && (
                        <button onClick={() => verifyUser(user._id)}>
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'alerts' && (
          <div className="create-alert-form">
            <h2>Create New Alert</h2>
            <form onSubmit={createAlert}>
              <div className="form-group">
                <label>Alert Type</label>
                <select name="alertType" required>
                  <option value="weather">Weather</option>
                  <option value="natural_disaster">Natural Disaster</option>
                  <option value="health">Health</option>
                  <option value="security">Security</option>
                  <option value="political">Political</option>
                  <option value="traffic">Traffic</option>
                  <option value="event">Event</option>
                  <option value="travel_advisory">Travel Advisory</option>
                </select>
              </div>

              <div className="form-group">
                <label>Severity</label>
                <select name="severity" required>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div className="form-group">
                <label>Title</label>
                <input type="text" name="title" required />
              </div>

              <div className="form-group">
                <label>Message</label>
                <textarea name="message" required rows="4"></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input type="number" name="latitude" step="0.000001" required />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input type="number" name="longitude" step="0.000001" required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Country</label>
                  <input type="text" name="country" required />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" name="city" required />
                </div>
                <div className="form-group">
                  <label>Radius (km)</label>
                  <input type="number" name="radius" defaultValue="50" required />
                </div>
              </div>

              <button type="submit" className="btn-create">
                Create & Broadcast Alert
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;