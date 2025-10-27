import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import socketService from '../../config/socket';
import reportsService from '../../services/reportsService';
import authService from '../../services/authService';
import './CommunitySafety.css';

const CommunitySafety = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [activeTab, setActiveTab] = useState('feed');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    type: 'crime',
    title: '',
    description: '',
    severity: 'medium',
    location: {
      address: '',
      coordinates: null
    },
    images: []
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReports();
    setupSocketListeners();

    return () => {
      socketService.off('new-report');
      socketService.off('report-verified');
    };
  }, [filter]);

  const setupSocketListeners = () => {
    socketService.on('new-report', (report) => {
      setReports(prev => [report, ...prev]);
      showNotification('New Report', report.title, 'info');
    });

    socketService.on('report-verified', (data) => {
      setReports(prev =>
        prev.map(report =>
          report._id === data.reportId
            ? { ...report, verified: true }
            : report
        )
      );
    });
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      
      const params = filter !== 'all' ? { type: filter } : {};
      const response = await reportsService.getNearbyReports({
        ...params,
        limit: 20
      });
      
      setReports(response.reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      showNotification('Error', 'Failed to load community reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value
      }
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + formData.images.length > 5) {
      showNotification('Error', 'Maximum 5 images allowed', 'error');
      return;
    }

    try {
      // Use reportsService to upload images
      const response = await reportsService.uploadImages(files);
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...response.imageUrls]
      }));

      showNotification('Success', 'Images uploaded successfully', 'success');
    } catch (error) {
      console.error('Failed to upload images:', error);
      showNotification('Error', 'Failed to upload images', 'error');
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      showNotification('Error', 'Please fill all required fields', 'error');
      return;
    }

    setSubmitting(true);

    try {
      // Use reportsService to create report
      const response = await reportsService.createReport({
        ...formData,
        reportedBy: user._id
      });

      showNotification(
        'Success',
        'Report submitted successfully! Thank you for helping the community.',
        'success'
      );

      // Reset form
      setFormData({
        type: 'crime',
        title: '',
        description: '',
        severity: 'medium',
        location: {
          address: '',
          coordinates: null
        },
        images: []
      });

      setActiveTab('feed');
      loadReports();

    } catch (error) {
      console.error('Failed to submit report:', error);
      showNotification(
        'Error',
        error.message || 'Failed to submit report',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (reportId) => {
    try {
      // Use reportsService to upvote
      await reportsService.upvoteReport(reportId);
      
      setReports(prev =>
        prev.map(report =>
          report._id === reportId
            ? { ...report, upvotes: (report.upvotes || 0) + 1 }
            : report
        )
      );
    } catch (error) {
      console.error('Failed to upvote:', error);
      showNotification('Error', 'Failed to upvote report', 'error');
    }
  };

  const handleReport = async (reportId) => {
    try {
      // Use reportsService to flag report
      await reportsService.flagReport(reportId, 'inappropriate');
      showNotification('Success', 'Report flagged for review', 'success');
    } catch (error) {
      console.error('Failed to flag report:', error);
      showNotification('Error', 'Failed to flag report', 'error');
    }
  };

  const getReportIcon = (type) => {
    const icons = {
      crime: '🚨',
      health: '🏥',
      'natural-disaster': '🌪️',
      accident: '🚗',
      theft: '💰',
      scam: '⚠️',
      other: '📌'
    };
    return icons[type] || '📌';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#991b1b'
    };
    return colors[severity] || '#6b7280';
  };

  const renderFeed = () => (
    <div className="feed-container">
      <div className="feed-header">
        <h3>📍 Community Safety Reports</h3>
        <div className="filter-buttons">
          {['all', 'crime', 'health', 'natural-disaster', 'accident', 'theft', 'scam'].map(type => (
            <button
              key={type}
              className={`filter-btn ${filter === type ? 'active' : ''}`}
              onClick={() => setFilter(type)}
            >
              {type.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <p>No reports found in your area</p>
          <button
            className="submit-report-btn"
            onClick={() => setActiveTab('submit')}
          >
            📝 Submit First Report
          </button>
        </div>
      ) : (
        <div className="reports-list">
          {reports.map(report => (
            <div key={report._id} className="report-card">
              <div className="report-header">
                <div className="report-type">
                  <span className="type-icon">{getReportIcon(report.type)}</span>
                  <span className="type-text">{report.type}</span>
                </div>
                <div
                  className="severity-badge"
                  style={{ background: getSeverityColor(report.severity) }}
                >
                  {report.severity}
                </div>
              </div>

              <h4 className="report-title">{report.title}</h4>
              <p className="report-description">{report.description}</p>

              {report.images && report.images.length > 0 && (
                <div className="report-images">
                  {report.images.slice(0, 3).map((img, idx) => (
                    <img key={idx} src={img} alt="Report" />
                  ))}
                  {report.images.length > 3 && (
                    <div className="more-images">+{report.images.length - 3}</div>
                  )}
                </div>
              )}

              <div className="report-footer">
                <div className="report-meta">
                  <span className="report-author">
                    👤 {report.reportedBy?.name || 'Anonymous'}
                  </span>
                  {report.verified && (
                    <span className="verified-badge">✓ Verified</span>
                  )}
                  <span className="report-time">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="report-actions">
                  <button
                    className="action-btn upvote"
                    onClick={() => handleUpvote(report._id)}
                  >
                    👍 {report.upvotes || 0}
                  </button>
                  <button
                    className="action-btn report"
                    onClick={() => handleReport(report._id)}
                  >
                    🚩 Flag
                  </button>
                </div>
              </div>

              {report.location?.address && (
                <div className="report-location">
                  📍 {report.location.address}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSubmitForm = () => (
    <div className="submit-form-container">
      <h3>📝 Submit Safety Report</h3>
      <p className="form-subtitle">Help your community stay safe by sharing incidents</p>

      <form onSubmit={handleSubmitReport} className="report-form">
        <div className="form-group">
          <label>Report Type *</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleFormChange}
            required
          >
            <option value="crime">🚨 Crime</option>
            <option value="health">🏥 Health Concern</option>
            <option value="natural-disaster">🌪️ Natural Disaster</option>
            <option value="accident">🚗 Accident</option>
            <option value="theft">💰 Theft</option>
            <option value="scam">⚠️ Scam</option>
            <option value="other">📌 Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleFormChange}
            placeholder="Brief description of the incident"
            required
          />
        </div>

        <div className="form-group">
          <label>Severity *</label>
          <select
            name="severity"
            value={formData.severity}
            onChange={handleFormChange}
            required
          >
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🟠 High</option>
            <option value="critical">🔴 Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            placeholder="Provide detailed information about the incident..."
            rows={5}
            required
          />
        </div>

        <div className="form-group">
          <label>Location</label>
          <input
            type="text"
            name="address"
            value={formData.location.address}
            onChange={handleLocationChange}
            placeholder="Enter location or use current location"
          />
          <button
            type="button"
            className="location-btn"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setFormData(prev => ({
                      ...prev,
                      location: {
                        ...prev.location,
                        coordinates: [position.coords.longitude, position.coords.latitude]
                      }
                    }));
                    showNotification('Success', 'Location captured', 'success');
                  },
                  (error) => {
                    showNotification('Error', 'Failed to get location', 'error');
                  }
                );
              }
            }}
          >
            📍 Use Current Location
          </button>
        </div>

        <div className="form-group">
          <label>Images (Optional, max 5)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            disabled={formData.images.length >= 5}
          />
          {formData.images.length > 0 && (
            <div className="uploaded-images">
              {formData.images.map((img, idx) => (
                <div key={idx} className="uploaded-image">
                  <img src={img} alt={`Upload ${idx + 1}`} />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        images: prev.images.filter((_, i) => i !== idx)
                      }));
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : '📤 Submit Report'}
        </button>
      </form>
    </div>
  );

  return (
    <div className="community-safety">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          📱 Community Feed
        </button>
        <button
          className={`tab ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          📝 Submit Report
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'feed' ? renderFeed() : renderSubmitForm()}
      </div>
    </div>
  );
};

export default CommunitySafety;