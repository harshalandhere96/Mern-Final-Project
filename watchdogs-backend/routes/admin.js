const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SafetyReport = require('../models/SafetyReport');
const Emergency = require('../models/Emergency');
const Alert = require('../models/Alert');
const DigitalID = require('../models/DigitalID');
const { protect } = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking admin status',
      error: error.message
    });
  }
};

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard overview
// @access  Admin only
router.get('/dashboard', protect, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Get all statistics
    const [
      totalUsers,
      newUsersLast30Days,
      totalReports,
      pendingReports,
      activeEmergencies,
      totalEmergencies,
      activeAlerts,
      verifiedDigitalIds,
      pendingDigitalIds
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: last30Days } }),
      SafetyReport.countDocuments(),
      SafetyReport.countDocuments({ isVerified: false, isFlagged: false }),
      Emergency.countDocuments({ status: 'active' }),
      Emergency.countDocuments(),
      Alert.countDocuments({ isActive: true }),
      DigitalID.countDocuments({ verificationStatus: 'verified' }),
      DigitalID.countDocuments({ verificationStatus: 'pending' })
    ]);

    // Get user growth data (last 7 days)
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get report distribution
    const reportDistribution = await SafetyReport.aggregate([
      {
        $group: {
          _id: '$reportType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get emergency response times (average)
    const emergencyStats = await Emergency.aggregate([
      {
        $match: {
          status: 'resolved',
          resolvedAt: { $exists: true }
        }
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$resolvedAt', '$triggeredAt'] },
              1000 * 60 // Convert to minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    res.json({
      success: true,
      dashboard: {
        overview: {
          totalUsers,
          newUsersLast30Days,
          totalReports,
          pendingReports,
          activeEmergencies,
          totalEmergencies,
          activeAlerts,
          verifiedDigitalIds,
          pendingDigitalIds
        },
        userGrowth,
        reportDistribution,
        avgEmergencyResponseTime: emergencyStats[0]?.avgResponseTime || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Admin only
router.get('/users', protect, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, verified, premium } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    if (verified !== undefined) query.isVerified = verified === 'true';
    if (premium !== undefined) query.premiumStatus = premium === 'true';

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (verify, premium, etc.)
// @access  Admin only
router.put('/users/:id', protect, isAdmin, async (req, res) => {
  try {
    const { isVerified, premiumStatus, premiumExpiry } = req.body;

    const updates = {};
    if (isVerified !== undefined) updates.isVerified = isVerified;
    if (premiumStatus !== undefined) updates.premiumStatus = premiumStatus;
    if (premiumExpiry) updates.premiumExpiry = premiumExpiry;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Admin only
router.delete('/users/:id', protect, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Also delete related data
    await Promise.all([
      SafetyReport.deleteMany({ user: req.params.id }),
      Emergency.deleteMany({ user: req.params.id }),
      DigitalID.deleteOne({ user: req.params.id })
    ]);

    res.json({
      success: true,
      message: 'User and related data deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// @route   GET /api/admin/reports/pending
// @desc    Get pending/flagged reports for moderation
// @access  Admin only
router.get('/reports/pending', protect, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const reports = await SafetyReport.find({
      $or: [
        { isVerified: false },
        { isFlagged: true }
      ]
    })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SafetyReport.countDocuments({
      $or: [
        { isVerified: false },
        { isFlagged: true }
      ]
    });

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending reports',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/reports/:id/verify
// @desc    Verify a safety report
// @access  Admin only
router.put('/reports/:id/verify', protect, isAdmin, async (req, res) => {
  try {
    const report = await SafetyReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.isVerified = true;
    report.verifiedBy = req.user.id;
    report.isFlagged = false;
    await report.save();

    res.json({
      success: true,
      report,
      message: 'Report verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying report',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/reports/:id
// @desc    Delete a report
// @access  Admin only
router.delete('/reports/:id', protect, isAdmin, async (req, res) => {
  try {
    const report = await SafetyReport.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting report',
      error: error.message
    });
  }
});

// @route   POST /api/admin/alerts/create
// @desc    Create new alert
// @access  Admin only
router.post('/alerts/create', protect, isAdmin, async (req, res) => {
  try {
    const alertData = {
      ...req.body,
      createdBy: req.user.id,
      source: 'admin',
      isVerified: true
    };

    const alert = await Alert.create(alertData);

    // Broadcast alert via Socket.io
    const io = req.app.get('io');
    io.emit('alert:new', {
      id: alert._id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      alertType: alert.alertType
    });

    res.status(201).json({
      success: true,
      alert,
      message: 'Alert created and broadcasted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating alert',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/alerts/:id
// @desc    Update alert
// @access  Admin only
router.put('/alerts/:id', protect, isAdmin, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdatedBy: req.user.id },
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      alert,
      message: 'Alert updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating alert',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/alerts/:id
// @desc    Delete alert
// @access  Admin only
router.delete('/alerts/:id', protect, isAdmin, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting alert',
      error: error.message
    });
  }
});

// @route   GET /api/admin/digital-ids/pending
// @desc    Get pending digital ID verifications
// @access  Admin only
router.get('/digital-ids/pending', protect, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const digitalIds = await DigitalID.find({
      verificationStatus: { $in: ['pending', 'in_review'] }
    })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await DigitalID.countDocuments({
      verificationStatus: { $in: ['pending', 'in_review'] }
    });

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      digitalIds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending digital IDs',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/digital-ids/:id/verify
// @desc    Verify digital ID
// @access  Admin only
router.put('/digital-ids/:id/verify', protect, isAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body; // status: 'verified' or 'rejected'

    const digitalId = await DigitalID.findById(req.params.id);

    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'Digital ID not found'
      });
    }

    digitalId.verificationStatus = status;
    digitalId.verificationNotes = notes;

    if (status === 'verified') {
      digitalId.kycDocuments.forEach(doc => {
        doc.isVerified = true;
        doc.verifiedAt = new Date();
        doc.verifiedBy = req.user.id;
      });
    }

    await digitalId.save();

    res.json({
      success: true,
      digitalId,
      message: `Digital ID ${status} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying digital ID',
      error: error.message
    });
  }
});

// @route   GET /api/admin/emergencies/active
// @desc    Get all active emergencies
// @access  Admin only
router.get('/emergencies/active', protect, isAdmin, async (req, res) => {
  try {
    const emergencies = await Emergency.find({ status: 'active' })
      .populate('user', 'firstName lastName email phone')
      .sort({ triggeredAt: -1 });

    res.json({
      success: true,
      count: emergencies.length,
      emergencies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active emergencies',
      error: error.message
    });
  }
});

module.exports = router;
