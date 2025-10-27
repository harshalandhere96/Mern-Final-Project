const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

// @route   GET /api/alerts/active
// @desc    Get active alerts for user's location
// @access  Private
router.get('/active', protect, async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const query = {
      isActive: true,
      validFrom: { $lte: new Date() },
      $or: [
        { validUntil: { $gte: new Date() } },
        { validUntil: null }
      ]
    };

    // Add geospatial query
    if (latitude && longitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    const alerts = await Alert.find(query)
      .sort({ severity: 1, priority: -1, createdAt: -1 }) // Critical first
      .populate('createdBy', 'firstName lastName')
      .limit(50);

    // Group by severity
    const groupedAlerts = {
      critical: alerts.filter(a => a.severity === 'critical'),
      high: alerts.filter(a => a.severity === 'high'),
      medium: alerts.filter(a => a.severity === 'medium'),
      low: alerts.filter(a => a.severity === 'low'),
      info: alerts.filter(a => a.severity === 'info')
    };

    res.json({
      success: true,
      count: alerts.length,
      alerts,
      grouped: groupedAlerts,
      summary: {
        critical: groupedAlerts.critical.length,
        high: groupedAlerts.high.length,
        medium: groupedAlerts.medium.length,
        low: groupedAlerts.low.length,
        info: groupedAlerts.info.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/:id
// @desc    Get alert by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Increment view count
    alert.views += 1;
    await alert.save();

    res.json({
      success: true,
      alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching alert',
      error: error.message
    });
  }
});

// @route   POST /api/alerts/:id/acknowledge
// @desc    Acknowledge an alert
// @access  Private
router.post('/:id/acknowledge', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if already acknowledged
    if (!alert.acknowledgedBy.includes(req.user.id)) {
      alert.acknowledgedBy.push(req.user.id);
      await alert.save();
    }

    res.json({
      success: true,
      message: 'Alert acknowledged',
      acknowledgedCount: alert.acknowledgedBy.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error acknowledging alert',
      error: error.message
    });
  }
});

// @route   POST /api/alerts/:id/share
// @desc    Share an alert
// @access  Private
router.post('/:id/share', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.sharedCount += 1;
    await alert.save();

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('alert:shared', {
      alertId: alert._id,
      sharedBy: req.user.id,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Alert shared',
      sharedCount: alert.sharedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sharing alert',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/filter/by-type
// @desc    Get alerts by type
// @access  Private
router.get('/filter/by-type', protect, async (req, res) => {
  try {
    const { type, severity, limit = 20 } = req.query;

    const query = {
      isActive: true,
      validFrom: { $lte: new Date() }
    };

    if (type) query.alertType = type;
    if (severity) query.severity = severity;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error filtering alerts',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/my/acknowledged
// @desc    Get user's acknowledged alerts
// @access  Private
router.get('/my/acknowledged', protect, async (req, res) => {
  try {
    const alerts = await Alert.find({
      acknowledgedBy: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching acknowledged alerts',
      error: error.message
    });
  }
});

// @route   GET /api/alerts/stats
// @desc    Get alert statistics
// @access  Public
router.get('/stats/summary', async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      activeAlerts,
      last24HoursAlerts,
      last7DaysAlerts,
      bySeverity,
      byType
    ] = await Promise.all([
      Alert.countDocuments({ isActive: true }),
      Alert.countDocuments({ 
        isActive: true, 
        createdAt: { $gte: last24Hours } 
      }),
      Alert.countDocuments({ 
        isActive: true, 
        createdAt: { $gte: last7Days } 
      }),
      Alert.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      Alert.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$alertType', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        activeAlerts,
        last24Hours: last24HoursAlerts,
        last7Days: last7DaysAlerts,
        bySeverity: bySeverity.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;
