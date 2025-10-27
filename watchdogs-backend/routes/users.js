const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'nationality', 'phone', 'dateOfBirth', 'profilePicture', 'preferences'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// @route   POST /api/users/emergency-contacts
// @desc    Add emergency contact
// @access  Private
router.post('/emergency-contacts', protect, async (req, res) => {
  try {
    const { name, relationship, phone, email, priorityOrder } = req.body;

    const user = await User.findById(req.user.id);
    user.emergencyContacts.push({
      name,
      relationship,
      phone,
      email,
      priorityOrder: priorityOrder || user.emergencyContacts.length + 1
    });

    await user.save();

    res.json({
      success: true,
      emergencyContacts: user.emergencyContacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding emergency contact',
      error: error.message
    });
  }
});

// @route   PUT /api/users/emergency-contacts/:contactId
// @desc    Update emergency contact
// @access  Private
router.put('/emergency-contacts/:contactId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const contact = user.emergencyContacts.id(req.params.contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    Object.assign(contact, req.body);
    await user.save();

    res.json({
      success: true,
      emergencyContacts: user.emergencyContacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating emergency contact',
      error: error.message
    });
  }
});

// @route   DELETE /api/users/emergency-contacts/:contactId
// @desc    Delete emergency contact
// @access  Private
router.delete('/emergency-contacts/:contactId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.emergencyContacts.pull(req.params.contactId);
    await user.save();

    res.json({
      success: true,
      emergencyContacts: user.emergencyContacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting emergency contact',
      error: error.message
    });
  }
});

// @route   PUT /api/users/medical-info
// @desc    Update medical information
// @access  Private
router.put('/medical-info', protect, async (req, res) => {
  try {
    const { bloodType, allergies, medications, medicalConditions, emergencyNotes } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        medicalInfo: {
          bloodType,
          allergies,
          medications,
          medicalConditions,
          emergencyNotes
        }
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      medicalInfo: user.medicalInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating medical information',
      error: error.message
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
});

module.exports = router;
