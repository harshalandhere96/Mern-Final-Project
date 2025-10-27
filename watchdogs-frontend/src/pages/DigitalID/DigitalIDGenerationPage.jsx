import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './DigitalIDGenerationPage.css';

const DigitalIDGenerationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [hasDigitalId, setHasDigitalId] = useState(false);
  const [digitalId, setDigitalId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    personalInfo: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      dateOfBirth: '',
      gender: '',
      nationality: user?.nationality || '',
      photo: null
    },
    kycDocuments: [{
      documentType: 'passport',
      documentNumber: '',
      issuingCountry: '',
      issueDate: '',
      expiryDate: '',
      documentImage: null
    }],
    travelInfo: {
      entryPoint: '',
      entryType: 'airport',
      entryDate: new Date().toISOString().split('T')[0],
      exitDate: '',
      destinations: [''],
      purposeOfVisit: 'tourism',
      accommodation: ''
    },
    accessPin: ''
  });

  useEffect(() => {
    checkDigitalId();
  }, []);

  const checkDigitalId = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/digital-id/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.hasDigitalId) {
        // Fetch full digital ID
        const idResponse = await fetch('http://localhost:5000/api/digital-id/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const idData = await idResponse.json();
        setDigitalId(idData.digitalId);
        setHasDigitalId(true);
      }
    } catch (error) {
      console.error('Error checking digital ID:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleDocumentChange = (index, field, value) => {
    const newDocs = [...formData.kycDocuments];
    newDocs[index] = { ...newDocs[index], [field]: value };
    setFormData(prev => ({...prev, kycDocuments: newDocs }));
  };

  const handleFileUpload = async (file, section, field) => {
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      if (section === 'personalInfo') {
        setFormData(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, [field]: reader.result }
        }));
      } else {
        const newDocs = [...formData.kycDocuments];
        newDocs[0] = { ...newDocs[0], [field]: reader.result };
        setFormData(prev => ({ ...prev, kycDocuments: newDocs }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/digital-id/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setDigitalId(data.digitalId);
        setHasDigitalId(true);
        alert('Digital ID generated successfully!');
      } else {
        alert(data.message || 'Error generating Digital ID');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate Digital ID');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!digitalId?.qrCode) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${digitalId.qrCode}`;
    link.download = `watchdogs-digital-id-${digitalId.idNumber}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="digital-id-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (hasDigitalId && digitalId) {
    return (
      <div className="digital-id-page">
        <div className="digital-id-card">
          <div className="id-header">
            <h1>🛂 WatchDogs Digital ID</h1>
            <span className={`status-badge ${digitalId.verificationStatus}`}>
              {digitalId.verificationStatus}
            </span>
          </div>

          <div className="id-content">
            <div className="id-main">
              <div className="profile-section">
                {digitalId.personalInfo.photo && (
                  <img 
                    src={digitalId.personalInfo.photo} 
                    alt="Profile" 
                    className="profile-photo"
                  />
                )}
                <div className="profile-info">
                  <h2>{digitalId.personalInfo.firstName} {digitalId.personalInfo.lastName}</h2>
                  <p className="id-number">ID: {digitalId.idNumber}</p>
                  <p>Nationality: {digitalId.personalInfo.nationality}</p>
                  <p>DOB: {new Date(digitalId.personalInfo.dateOfBirth).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="verification-progress">
                <h3>Verification Progress</h3>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${digitalId.verificationPercentage || 0}%` }}
                  ></div>
                </div>
                <p>{digitalId.verificationPercentage || 0}% Complete</p>
              </div>

              <div className="kyc-documents">
                <h3>📄 KYC Documents</h3>
                {digitalId.kycDocuments.map((doc, index) => (
                  <div key={index} className="document-item">
                    <span className="doc-type">{doc.documentType.toUpperCase()}</span>
                    <span className="doc-number">{doc.documentNumber}</span>
                    {doc.isVerified && <span className="verified-badge">✓ Verified</span>}
                  </div>
                ))}
              </div>

              <div className="travel-info">
                <h3>✈️ Travel Information</h3>
                {digitalId.travelInfo.entryPoint && (
                  <>
                    <p><strong>Entry Point:</strong> {digitalId.travelInfo.entryPoint}</p>
                    <p><strong>Entry Type:</strong> {digitalId.travelInfo.entryType}</p>
                    <p><strong>Purpose:</strong> {digitalId.travelInfo.purposeOfVisit}</p>
                    {digitalId.travelInfo.entryDate && (
                      <p><strong>Entry Date:</strong> {new Date(digitalId.travelInfo.entryDate).toLocaleDateString()}</p>
                    )}
                  </>
                )}
              </div>

              <div className="usage-stats">
                <h3>📊 Usage Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{digitalId.usageCount || 0}</span>
                    <span className="stat-label">Times Used</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{digitalId.checkpoints?.length || 0}</span>
                    <span className="stat-label">Checkpoints</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {digitalId.expiresAt ? new Date(digitalId.expiresAt).toLocaleDateString() : 'N/A'}
                    </span>
                    <span className="stat-label">Expires On</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="id-sidebar">
              <div className="qr-section">
                <h3>Your QR Code</h3>
                {digitalId.qrCode && (
                  <div className="qr-code">
                    <img 
                      src={`data:image/png;base64,${digitalId.qrCode}`} 
                      alt="QR Code"
                    />
                  </div>
                )}
                <button onClick={downloadQR} className="btn-secondary">
                  Download QR
                </button>
              </div>

              <div className="recent-checkpoints">
                <h3>Recent Checkpoints</h3>
                {digitalId.checkpoints && digitalId.checkpoints.length > 0 ? (
                  <div className="checkpoint-list">
                    {digitalId.checkpoints.slice(-5).reverse().map((cp, idx) => (
                      <div key={idx} className="checkpoint-item">
                        <span className="checkpoint-location">{cp.location}</span>
                        <span className="checkpoint-type">{cp.checkpointType}</span>
                        <span className="checkpoint-time">
                          {new Date(cp.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-checkpoints">No checkpoints yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="id-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Back to Dashboard
            </button>
            <button onClick={() => {/* Implement update */}} className="btn-primary">
              Update Information
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="digital-id-page">
      <div className="generation-wizard">
        <div className="wizard-header">
          <h1>🛂 Generate Your Digital Travel ID</h1>
          <p>Create your DigiYatra-style digital identity for seamless travel</p>
          <div className="progress-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Personal Info</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Documents</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Travel Info</div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Security</div>
          </div>
        </div>

        <div className="wizard-content">
          {step === 1 && (
            <div className="form-step">
              <h2>Personal Information</h2>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={formData.personalInfo.firstName}
                    onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={formData.personalInfo.lastName}
                    onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.personalInfo.dateOfBirth}
                    onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Gender *</label>
                  <select
                    value={formData.personalInfo.gender}
                    onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Nationality *</label>
                  <input
                    type="text"
                    value={formData.personalInfo.nationality}
                    onChange={(e) => handleInputChange('personalInfo', 'nationality', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Upload Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files[0], 'personalInfo', 'photo')}
                  />
                  <small>Passport-size photo (recommended)</small>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>KYC Document</h2>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Document Type *</label>
                  <select
                    value={formData.kycDocuments[0].documentType}
                    onChange={(e) => handleDocumentChange(0, 'documentType', e.target.value)}
                  >
                    <option value="passport">Passport</option>
                    <option value="visa">Visa</option>
                    <option value="national_id">National ID</option>
                    <option value="driving_license">Driving License</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Document Number *</label>
                  <input
                    type="text"
                    value={formData.kycDocuments[0].documentNumber}
                    onChange={(e) => handleDocumentChange(0, 'documentNumber', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Issuing Country *</label>
                  <input
                    type="text"
                    value={formData.kycDocuments[0].issuingCountry}
                    onChange={(e) => handleDocumentChange(0, 'issuingCountry', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Issue Date</label>
                  <input
                    type="date"
                    value={formData.kycDocuments[0].issueDate}
                    onChange={(e) => handleDocumentChange(0, 'issueDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="date"
                    value={formData.kycDocuments[0].expiryDate}
                    onChange={(e) => handleDocumentChange(0, 'expiryDate', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Upload Document Scan</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files[0], 'kycDocument', 'documentImage')}
                  />
                  <small>Clear scan of your document</small>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <h2>Travel Information</h2>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Entry Point</label>
                  <input
                    type="text"
                    value={formData.travelInfo.entryPoint}
                    onChange={(e) => handleInputChange('travelInfo', 'entryPoint', e.target.value)}
                    placeholder="e.g., Mumbai Airport"
                  />
                </div>

                <div className="form-group">
                  <label>Entry Type</label>
                  <select
                    value={formData.travelInfo.entryType}
                    onChange={(e) => handleInputChange('travelInfo', 'entryType', e.target.value)}
                  >
                    <option value="airport">Airport</option>
                    <option value="seaport">Seaport</option>
                    <option value="land_border">Land Border</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Entry Date</label>
                  <input
                    type="date"
                    value={formData.travelInfo.entryDate}
                    onChange={(e) => handleInputChange('travelInfo', 'entryDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Expected Exit Date</label>
                  <input
                    type="date"
                    value={formData.travelInfo.exitDate}
                    onChange={(e) => handleInputChange('travelInfo', 'exitDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Purpose of Visit</label>
                  <select
                    value={formData.travelInfo.purposeOfVisit}
                    onChange={(e) => handleInputChange('travelInfo', 'purposeOfVisit', e.target.value)}
                  >
                    <option value="tourism">Tourism</option>
                    <option value="business">Business</option>
                    <option value="education">Education</option>
                    <option value="medical">Medical</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Accommodation</label>
                  <input
                    type="text"
                    value={formData.travelInfo.accommodation}
                    onChange={(e) => handleInputChange('travelInfo', 'accommodation', e.target.value)}
                    placeholder="Hotel name or address"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-step">
              <h2>Security PIN</h2>
              <p className="step-description">
                Set a 6-digit PIN to secure your Digital ID. This PIN will be required for verification at checkpoints.
              </p>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Access PIN (6 digits) *</label>
                  <input
                    type="password"
                    value={formData.accessPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData(prev => ({ ...prev, accessPin: value }));
                    }}
                    placeholder="Enter 6-digit PIN"
                    maxLength={6}
                    required
                  />
                  <small>Remember this PIN - you'll need it at checkpoints</small>
                </div>
              </div>

              <div className="terms-section">
                <label className="checkbox-label">
                  <input type="checkbox" required />
                  <span>I agree to the terms and conditions and privacy policy</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" required />
                  <span>I consent to share my travel data with authorized agencies for verification</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="btn-secondary">
              Previous
            </button>
          )}
          
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} className="btn-primary">
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Digital ID'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalIDGenerationPage;