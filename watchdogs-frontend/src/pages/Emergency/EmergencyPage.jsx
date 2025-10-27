import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTouristSafety } from '../../context/TouristSafetyContext';
import Button from '../../components/common/Button/Button';
import '../PlaceholderPage.css';

const EmergencyPage = () => {
  const navigate = useNavigate();
  const { state } = useTouristSafety();
  const [emergencyType, setEmergencyType] = useState(null);

  const emergencyTypes = [
    { id: 'police', name: 'Police', icon: '👮', number: '100', color: '#3b82f6' },
    { id: 'medical', name: 'Medical Emergency', icon: '🚑', number: '102', color: '#ef4444' },
    { id: 'fire', name: 'Fire Emergency', icon: '🚒', number: '101', color: '#f59e0b' },
    { id: 'general', name: 'General Emergency', icon: '🆘', number: '112', color: '#dc2626' },
  ];

  return (
    <div className="placeholder-page emergency-page">
      <div className="placeholder-container emergency-layout">
        <div className="emergency-warning">
          <div className="warning-icon pulse">🚨</div>
          <h1>Emergency Response Center</h1>
          <p className="emergency-subtitle">
            Immediate assistance available 24/7. Your location is being tracked for emergency services.
          </p>
        </div>

        <div className="emergency-location-card">
          <div className="location-icon">📍</div>
          <div className="location-info">
            <h3>Current Location</h3>
            <p>{state.location.area || 'Determining your exact location...'}</p>
            <small>Coordinates: {state.location.lat?.toFixed(6)}, {state.location.lng?.toFixed(6)}</small>
            <small>Accuracy: ±{Math.round(state.location.accuracy || 0)}m</small>
          </div>
        </div>

        <div className="emergency-grid">
          {emergencyTypes.map(type => (
            <button
              key={type.id}
              className={`emergency-button ${emergencyType === type.id ? 'active' : ''}`}
              style={{ borderColor: type.color }}
              onClick={() => setEmergencyType(type.id)}
            >
              <div className="emergency-button-icon" style={{ background: type.color }}>
                {type.icon}
              </div>
              <div className="emergency-button-content">
                <h3>{type.name}</h3>
                <p className="emergency-number">{type.number}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="placeholder-features emergency-features">
          <div className="feature-item">📞 One-Touch Emergency Calling</div>
          <div className="feature-item">📍 Automatic Location Sharing</div>
          <div className="feature-item">🆔 Digital ID Broadcasting</div>
          <div className="feature-item">👥 Emergency Contact Alerts</div>
          <div className="feature-item">🎙️ Voice-Activated SOS</div>
          <div className="feature-item">📹 Live Location Tracking</div>
        </div>

        <div className="emergency-actions">
          <Button 
            onClick={() => navigate('/dashboard')} 
            variant="secondary"
            size="lg"
          >
            ← Back to Safety
          </Button>
          <Button 
            variant="danger" 
            size="lg"
            className="pulse-button"
          >
            🚨 ACTIVATE EMERGENCY MODE
          </Button>
        </div>

        <div className="emergency-disclaimer">
          <small>
            ⚠️ Emergency Mode will immediately notify local authorities and your emergency contacts.
            Only use in genuine emergency situations.
          </small>
        </div>
      </div>
    </div>
  );
};

export default EmergencyPage;