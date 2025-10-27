const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const DigitalID = require('../models/DigitalID');
const { protect } = require('../middleware/auth');

// Helper to generate QR code data (in production, use actual QR library)
const generateQRCode = (data) => {
  // This is a placeholder - in production use 'qrcode' npm package
  // For now, return a base64 encoded string representation
  const qrData = JSON.stringify(data);
  return Buffer.from(qrData).toString('base64');
};

// @route   POST /api/digital-id/generate
// @desc    Generate new digital ID
// @access  Private
router.post('/generate', protect, async (req, res) => {
  try {
    // Check if user already has a digital ID
    const existingId = await DigitalID.findOne({ user: req.user.id });
    if (existingId) {
      return res.status(400).json({
        success: false,
        message: 'Digital ID already exists for this user'
      });
    }

    const {
      personalInfo,
      kycDocuments,
      travelInfo,
      accessPin
    } = req.body;

    // Generate QR code data
    const qrData = {
      id: crypto.randomBytes(16).toString('hex'),
      userId: req.user.id,
      timestamp: new Date().toISOString()
    };
    const qrCode = generateQRCode(qrData);

    // Hash access PIN
    const hashedPin = accessPin ? 
      crypto.createHash('sha256').update(accessPin).digest('hex') : null;

    const digitalId = await DigitalID.create({
      user: req.user.id,
      personalInfo,
      kycDocuments: kycDocuments || [],
      travelInfo: travelInfo || {},
      qrCode,
      accessPin: hashedPin,
      verificationStatus: 'pending'
    });

    res.status(201).json({
      success: true,
      digitalId,
      message: 'Digital ID generated successfully. Awaiting verification.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating digital ID',
      error: error.message
    });
  }
});

// @route   GET /api/digital-id/me
// @desc    Get user's digital ID
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    res.json({
      success: true,
      digitalId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching digital ID',
      error: error.message
    });
  }
});

// @route   PUT /api/digital-id/update
// @desc    Update digital ID information
// @access  Private
router.put('/update', protect, async (req, res) => {
  try {
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    const allowedUpdates = ['personalInfo', 'travelInfo'];
    allowedUpdates.forEach(field => {
      if (req.body[field]) {
        digitalId[field] = { ...digitalId[field], ...req.body[field] };
      }
    });

    // If documents are updated, set verification back to pending
    if (req.body.kycDocuments) {
      digitalId.kycDocuments = req.body.kycDocuments;
      digitalId.verificationStatus = 'in_review';
    }

    await digitalId.save();

    res.json({
      success: true,
      digitalId,
      message: 'Digital ID updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating digital ID',
      error: error.message
    });
  }
});

// @route   POST /api/digital-id/verify-pin
// @desc    Verify access PIN
// @access  Private
router.post('/verify-pin', protect, async (req, res) => {
  try {
    const { pin } = req.body;
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    if (!digitalId.accessPin) {
      return res.status(400).json({
        success: false,
        message: 'No PIN set for this digital ID'
      });
    }

    const hashedPin = crypto.createHash('sha256').update(pin).digest('hex');
    
    if (hashedPin !== digitalId.accessPin) {
      digitalId.failedAccessAttempts += 1;
      digitalId.lastAccessAttempt = new Date();
      await digitalId.save();

      return res.status(401).json({
        success: false,
        message: 'Incorrect PIN',
        attemptsRemaining: Math.max(0, 3 - digitalId.failedAccessAttempts)
      });
    }

    // Reset failed attempts on success
    digitalId.failedAccessAttempts = 0;
    digitalId.lastUsed = new Date();
    digitalId.usageCount += 1;
    await digitalId.save();

    res.json({
      success: true,
      message: 'PIN verified successfully',
      digitalId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying PIN',
      error: error.message
    });
  }
});

// @route   POST /api/digital-id/checkpoint
// @desc    Record checkpoint usage
// @access  Private
router.post('/checkpoint', protect, async (req, res) => {
  try {
    const { location, checkpointType, verifiedBy } = req.body;
    
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    if (!digitalId.isActive || digitalId.isExpired) {
      return res.status(400).json({
        success: false,
        message: 'Digital ID is not active or has expired'
      });
    }

    digitalId.checkpoints.push({
      location,
      checkpointType,
      verifiedBy,
      timestamp: new Date()
    });

    digitalId.lastUsed = new Date();
    digitalId.usageCount += 1;

    await digitalId.save();

    res.json({
      success: true,
      message: 'Checkpoint recorded successfully',
      checkpoint: digitalId.checkpoints[digitalId.checkpoints.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error recording checkpoint',
      error: error.message
    });
  }
});

// @route   GET /api/digital-id/checkpoints
// @desc    Get checkpoint history
// @access  Private
router.get('/checkpoints', protect, async (req, res) => {
  try {
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    res.json({
      success: true,
      checkpoints: digitalId.checkpoints.sort((a, b) => b.timestamp - a.timestamp)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching checkpoints',
      error: error.message
    });
  }
});

// @route   POST /api/digital-id/regenerate-qr
// @desc    Regenerate QR code
// @access  Private
router.post('/regenerate-qr', protect, async (req, res) => {
  try {
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    // Generate new QR code
    const qrData = {
      id: crypto.randomBytes(16).toString('hex'),
      userId: req.user.id,
      timestamp: new Date().toISOString()
    };
    digitalId.qrCode = generateQRCode(qrData);

    await digitalId.save();

    res.json({
      success: true,
      qrCode: digitalId.qrCode,
      message: 'QR code regenerated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error regenerating QR code',
      error: error.message
    });
  }
});

// @route   GET /api/digital-id/status
// @desc    Get digital ID status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const digitalId = await DigitalID.findOne({ user: req.user.id });
    
    if (!digitalId) {
      return res.json({
        success: true,
        hasDigitalId: false
      });
    }

    res.json({
      success: true,
      hasDigitalId: true,
      status: {
        verificationStatus: digitalId.verificationStatus,
        isActive: digitalId.isActive,
        isExpired: digitalId.isExpired,
        verificationPercentage: digitalId.verificationPercentage,
        expiresAt: digitalId.expiresAt,
        lastUsed: digitalId.lastUsed,
        usageCount: digitalId.usageCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching status',
      error: error.message
    });
  }
});

module.exports = router;
