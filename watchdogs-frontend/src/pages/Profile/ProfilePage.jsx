import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button/Button';
import '../PlaceholderPage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="placeholder-page">
      <div className="placeholder-container">
        <div className="placeholder-icon">👤</div>
        <h1>User Profile</h1>
        <p className="placeholder-description">
          View and manage your personal information, travel preferences, and account settings.
        </p>
        
        {user && (
          <div className="user-preview">
            <div className="user-info-item">
              <span className="label">Name:</span>
              <span className="value">{user.firstName} {user.lastName}</span>
            </div>
            <div className="user-info-item">
              <span className="label">Email:</span>
              <span className="value">{user.email}</span>
            </div>
            <div className="user-info-item">
              <span className="label">Nationality:</span>
              <span className="value">{user.nationality || 'Not set'}</span>
            </div>
            <div className="user-info-item">
              <span className="label">Role:</span>
              <span className="value">{user.role || 'Tourist'}</span>
            </div>
          </div>
        )}

        <div className="placeholder-features">
          <div className="feature-item">✏️ Edit Profile Information</div>
          <div className="feature-item">📸 Upload Profile Picture</div>
          <div className="feature-item">🌍 Manage Travel Preferences</div>
          <div className="feature-item">🔔 Notification Settings</div>
          <div className="feature-item">🔐 Security & Privacy</div>
        </div>

        <div className="placeholder-actions">
          <Button onClick={() => navigate('/dashboard')} variant="secondary">
            ← Back to Dashboard
          </Button>
          <Button onClick={() => navigate('/settings')}>
            Go to Settings →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;