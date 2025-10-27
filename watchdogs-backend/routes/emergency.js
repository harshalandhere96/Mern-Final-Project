const express = require('express');
const router = express.Router();
const Emergency = require('../models/Emergency');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/emergency/trigger
// @desc    Trigger emergency alert
// @access  Private
router.post('/trigger', protect, async (req, res) => {
  try {
    const { emergencyLevel, latitude, longitude, locationName, emergencyType, notes } = req.body;

    // Get user with emergency contacts and medical info
    const user = await User.findById(req.user.id);

    const emergency = await Emergency.create({
      user: req.user.id,
      emergencyLevel: emergencyLevel || 3,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      locationName,
      emergencyType,
      notes,
      status: 'active'
    });

    // Create notification records for emergency contacts
    const notifications = [];
    
    user.emergencyContacts.forEach(contact => {
      // SMS notification
      notifications.push({
        recipientType: 'contact',
        recipientId: contact._id,
        recipientName: contact.name,
        recipientPhone: contact.phone,
        recipientEmail: contact.email,
        notificationMethod: 'sms',
        status: 'pending'
      });

      // Email notification
      if (contact.email) {
        notifications.push({
          recipientType: 'contact',
          recipientId: contact._id,
          recipientName: contact.name,
          recipientEmail: contact.email,
          notificationMethod: 'email',
          status: 'pending'
        });
      }
    });

    // Add notification for platform monitoring
    notifications.push({
      recipientType: 'platform',
      recipientName: 'WatchDogs Emergency Team',
      notificationMethod: 'push',
      status: 'pending'
    });

    emergency.notifications = notifications;
    await emergency.save();

    // Send notifications (would integrate with Twilio/SendGrid here)
    // For now, just mark as sent
    emergency.notifications.forEach(n => {
      n.status = 'sent';
      n.sentAt = new Date();
    });
    await emergency.save();

    // Broadcast emergency via Socket.io
    const io = req.app.get('io');
    io.emit('emergency:alert', {
      id: emergency._id,
      user: {
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone
      },
      emergencyLevel,
      emergencyType,
      location: {
        latitude,
        longitude,
        name: locationName
      },
      medicalInfo: user.medicalInfo,
      timestamp: emergency.triggeredAt
    });

    res.status(201).json({
      success: true,
      emergency,
      message: 'Emergency alert triggered. Authorities and contacts have been notified.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error triggering emergency',
      error: error.message
    });
  }
});

// @route   PUT /api/emergency/:id/resolve
// @desc    Resolve emergency
// @access  Private
router.put('/:id/resolve', protect, async (req, res) => {
  try {
    const emergency = await Emergency.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    emergency.status = 'resolved';
    emergency.resolvedAt = new Date();
    emergency.notes = req.body.notes || emergency.notes;

    await emergency.save();

    // Notify contacts that emergency is resolved
    const io = req.app.get('io');
    io.emit('emergency:resolved', {
      id: emergency._id,
      userId: req.user.id,
      timestamp: emergency.resolvedAt
    });

    res.json({
      success: true,
      emergency,
      message: 'Emergency resolved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resolving emergency',
      error: error.message
    });
  }
});

// @route   PUT /api/emergency/:id/cancel
// @desc    Cancel emergency
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const emergency = await Emergency.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    emergency.status = 'cancelled';
    emergency.resolvedAt = new Date();

    await emergency.save();

    // Notify that emergency was cancelled
    const io = req.app.get('io');
    io.emit('emergency:cancelled', {
      id: emergency._id,
      userId: req.user.id
    });

    res.json({
      success: true,
      emergency,
      message: 'Emergency cancelled'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling emergency',
      error: error.message
    });
  }
});

// @route   GET /api/emergency/status
// @desc    Get active emergency status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const activeEmergency = await Emergency.findOne({
      user: req.user.id,
      status: 'active'
    }).sort({ triggeredAt: -1 });

    if (!activeEmergency) {
      return res.json({
        success: true,
        hasActiveEmergency: false
      });
    }

    res.json({
      success: true,
      hasActiveEmergency: true,
      emergency: activeEmergency
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency status',
      error: error.message
    });
  }
});

// @route   GET /api/emergency/history
// @desc    Get emergency history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const emergencies = await Emergency.find({ user: req.user.id })
      .sort({ triggeredAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Emergency.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      emergencies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency history',
      error: error.message
    });
  }
});

// @route   POST /api/emergency/:id/response
// @desc    Add response to emergency (for responders)
// @access  Private
router.post('/:id/response', protect, async (req, res) => {
  try {
    const { responder, responderType, message } = req.body;

    const emergency = await Emergency.findById(req.params.id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    emergency.responses.push({
      responder,
      responderType,
      message,
      timestamp: new Date()
    });

    await emergency.save();

    // Notify user of response
    const io = req.app.get('io');
    io.to(emergency.user.toString()).emit('emergency:response', {
      emergencyId: emergency._id,
      response: {
        responder,
        message,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Response added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding response',
      error: error.message
    });
  }
});

module.exports = router;
