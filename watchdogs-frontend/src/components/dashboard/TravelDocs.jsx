import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import digitalIdService from '../../services/digitalIdService';
import './TravelDocs.css';

const TravelDocs = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [digitalIds, setDigitalIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);

  useEffect(() => {
    loadDigitalIds();
  }, []);

  const loadDigitalIds = async () => {
    try {
      setLoading(true);
      const response = await digitalIdService.getUserDigitalIds();
      setDigitalIds(response.digitalIds || []);
    } catch (error) {
      console.error('Failed to load Digital IDs:', error);
      showNotification('Error', 'Failed to load your documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id) => {
    setSelectedId(id);
  };

  const handleGenerateQR = async (id) => {
    try {
      const response = await digitalIdService.generateQRCode(id);
      setQrCodeData(response.qrCode);
      setShowQRCode(true);
      showNotification('Success', 'QR Code generated successfully', 'success');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      showNotification('Error', 'Failed to generate QR code', 'error');
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      await digitalIdService.downloadAsPDF(id);
      showNotification('Success', 'Digital ID downloaded successfully', 'success');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      showNotification('Error', 'Failed to download PDF', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Digital ID?')) {
      return;
    }

    try {
      await digitalIdService.deleteDigitalId(id);
      setDigitalIds(prev => prev.filter(item => item._id !== id));
      showNotification('Success', 'Digital ID deleted successfully', 'success');
      
      if (selectedId?._id === id) {
        setSelectedId(null);
      }
    } catch (error) {
      console.error('Failed to delete Digital ID:', error);
      showNotification('Error', 'Failed to delete Digital ID', 'error');
    }
  };

  const handleShare = async (id) => {
    const email = prompt('Enter email address to share with:');
    if (!email) return;

    try {
      await digitalIdService.shareDigitalId(id, email);
      showNotification('Success', 'Digital ID shared successfully', 'success');
    } catch (error) {
      console.error('Failed to share Digital ID:', error);
      showNotification('Error', 'Failed to share Digital ID', 'error');
    }
  };

  const renderIdCard = (id) => (
    <div key={id._id} className="id-card" onClick={() => handleViewDetails(id)}>
      <div className="id-card-header">
        <div className="id-type">
          <span className="id-icon">🆔</span>
          <span>Digital ID</span>
        </div>
        {id.verified && (
          <span className="verified-badge">✓ Verified</span>
        )}
      </div>

      <div className="id-card-photo">
        {id.photo ? (
          <img src={id.photo} alt={id.fullName} />
        ) : (
          <div className="photo-placeholder">👤</div>
        )}
      </div>

      <div className="id-card-info">
        <h3>{id.fullName}</h3>
        <p className="id-number">{id.idNumber || 'N/A'}</p>
        <p className="nationality">🌍 {id.nationality}</p>
      </div>

      <div className="id-card-actions">
        <button
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleGenerateQR(id._id);
          }}
        >
          📱 QR Code
        </button>
        <button
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadPDF(id._id);
          }}
        >
          📄 Download
        </button>
        <button
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleShare(id._id);
          }}
        >
          📤 Share
        </button>
        <button
          className="action-btn delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(id._id);
          }}
        >
          🗑️ Delete
        </button>
      </div>

      <div className="id-card-footer">
        <small>Created: {new Date(id.createdAt).toLocaleDateString()}</small>
      </div>
    </div>
  );

  const renderDetails = () => {
    if (!selectedId) return null;

    return (
      <div className="id-details-modal" onClick={() => setSelectedId(null)}>
        <div className="id-details-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={() => setSelectedId(null)}>×</button>
          
          <h2>Digital ID Details</h2>

          <div className="details-photo">
            {selectedId.photo ? (
              <img src={selectedId.photo} alt={selectedId.fullName} />
            ) : (
              <div className="photo-placeholder-large">👤</div>
            )}
          </div>

          <div className="details-info">
            <div className="info-row">
              <label>Full Name:</label>
              <span>{selectedId.fullName}</span>
            </div>
            <div className="info-row">
              <label>ID Number:</label>
              <span>{selectedId.idNumber || 'N/A'}</span>
            </div>
            <div className="info-row">
              <label>Date of Birth:</label>
              <span>{new Date(selectedId.dateOfBirth).toLocaleDateString()}</span>
            </div>
            <div className="info-row">
              <label>Nationality:</label>
              <span>{selectedId.nationality}</span>
            </div>
            {selectedId.passportNumber && (
              <div className="info-row">
                <label>Passport Number:</label>
                <span>{selectedId.passportNumber}</span>
              </div>
            )}
            <div className="info-row">
              <label>Email:</label>
              <span>{selectedId.email}</span>
            </div>
            <div className="info-row">
              <label>Phone:</label>
              <span>{selectedId.phone}</span>
            </div>
            {selectedId.address && (
              <div className="info-row">
                <label>Address:</label>
                <span>{selectedId.address}</span>
              </div>
            )}
            <div className="info-row">
              <label>Status:</label>
              <span className={selectedId.verified ? 'verified' : 'pending'}>
                {selectedId.verified ? '✓ Verified' : '⏳ Pending'}
              </span>
            </div>
          </div>

          <div className="details-actions">
            <button onClick={() => handleGenerateQR(selectedId._id)}>
              📱 Generate QR Code
            </button>
            <button onClick={() => handleDownloadPDF(selectedId._id)}>
              📄 Download PDF
            </button>
            <button onClick={() => handleShare(selectedId._id)}>
              📤 Share
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderQRModal = () => {
    if (!showQRCode || !qrCodeData) return null;

    return (
      <div className="qr-modal" onClick={() => setShowQRCode(false)}>
        <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={() => setShowQRCode(false)}>×</button>
          
          <h2>Digital ID QR Code</h2>
          <p>Scan this QR code to verify your Digital ID</p>

          <div className="qr-code-display">
            <img src={qrCodeData} alt="QR Code" />
          </div>

          <div className="qr-actions">
            <button onClick={() => {
              const link = document.createElement('a');
              link.href = qrCodeData;
              link.download = 'digital-id-qr.png';
              link.click();
            }}>
              💾 Download QR Code
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="travel-docs-loading">
        <div className="spinner"></div>
        <p>Loading your documents...</p>
      </div>
    );
  }

  return (
    <div className="travel-docs">
      <div className="docs-header">
        <h2>📄 Travel Documents</h2>
        <p>Manage your Digital IDs and travel documents</p>
        <button
          className="create-btn"
          onClick={() => window.location.href = '/digital-id'}
        >
          ➕ Create New Digital ID
        </button>
      </div>

      {digitalIds.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No Digital IDs Yet</h3>
          <p>Create your first Digital ID to get started</p>
          <button
            className="create-btn-large"
            onClick={() => window.location.href = '/digital-id'}
          >
            ➕ Create Digital ID
          </button>
        </div>
      ) : (
        <div className="ids-grid">
          {digitalIds.map(id => renderIdCard(id))}
        </div>
      )}

      {renderDetails()}
      {renderQRModal()}
    </div>
  );
};

export default TravelDocs;