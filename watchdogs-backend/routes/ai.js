const express = require('express');
const router = express.Router();
const SafetyReport = require('../models/SafetyReport');
const { protect } = require('../middleware/auth');

// @route   POST /api/ai/safety-prediction
// @desc    Get AI safety prediction for location
// @access  Private
router.post('/safety-prediction', protect, async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.body;

    // Get current time or use provided timestamp
    const currentTime = timestamp ? new Date(timestamp) : new Date();
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.getDay();

    // Basic AI logic (in production, this would use ML model)
    let riskScore = 20; // Base risk
    let riskLevel = 'low';
    let tips = [];
    let factors = [];

    // Time-based risk
    const isNight = hour >= 22 || hour < 6;
    const isEarlyMorning = hour >= 6 && hour < 9;
    const isEvening = hour >= 18 && hour < 22;
    const isRushHour = isEarlyMorning || isEvening;

    if (isNight) {
      riskScore += 35;
      tips.push('It\'s nighttime - stay in well-lit areas');
      tips.push('Use verified taxi services only');
      tips.push('Share your location with trusted contacts');
      factors.push('nighttime');
    } else if (isRushHour) {
      riskScore += 10;
      tips.push('Peak traffic hours - allow extra travel time');
      tips.push('Watch your belongings in crowded areas');
      factors.push('rush-hour');
    } else {
      tips.push('Good time for sightseeing');
      tips.push('Popular attractions are less crowded now');
      factors.push('daytime', 'low-crowd');
    }

    // Day of week risk
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
      riskScore += 5;
      factors.push('weekend');
    }

    // Get recent reports in area to adjust score
    const recentReports = await SafetyReport.find({
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: 2000 // 2km radius
        }
      }
    }).limit(20);

    // Adjust based on recent reports
    const dangerReports = recentReports.filter(r => r.reportType === 'danger').length;
    const cautionReports = recentReports.filter(r => r.reportType === 'caution').length;
    const safeReports = recentReports.filter(r => r.reportType === 'safe').length;

    if (dangerReports > 2) {
      riskScore += 30;
      tips.push('Multiple danger reports in this area');
      tips.push('Consider alternative routes');
      factors.push('danger-reports');
    } else if (cautionReports > 3) {
      riskScore += 15;
      tips.push('Some caution reports nearby');
      tips.push('Stay alert and aware');
      factors.push('caution-reports');
    } else if (safeReports > 5) {
      riskScore -= 10;
      factors.push('verified-safe-area');
    }

    // Determine risk level
    if (riskScore >= 70) {
      riskLevel = 'high';
    } else if (riskScore >= 40) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Cap risk score
    riskScore = Math.max(0, Math.min(100, riskScore));
    const safetyScore = 100 - riskScore;

    res.json({
      success: true,
      prediction: {
        safetyScore,
        riskScore,
        riskLevel,
        factors,
        tips,
        timeOfDay: isNight ? 'Night' : isRushHour ? 'Rush Hour' : 'Day',
        basedOn: {
          timeAnalysis: true,
          communityReports: recentReports.length,
          historicalData: false // Would be true with real ML model
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating safety prediction',
      error: error.message
    });
  }
});

// @route   POST /api/ai/recommendations
// @desc    Get AI recommendations for area
// @access  Private
router.post('/recommendations', protect, async (req, res) => {
  try {
    const { latitude, longitude, type = 'all' } = req.body;

    // Mock recommendations (in production, integrate with Google Places API)
    const allRecommendations = [
      {
        id: 1,
        type: 'restaurant',
        icon: '🍽️',
        title: 'Safe Dining Near You',
        description: 'Highly rated restaurants within 1km with verified safety standards',
        distance: '0.5km',
        safetyScore: 95,
        coordinates: { latitude: latitude + 0.005, longitude: longitude + 0.005 }
      },
      {
        id: 2,
        type: 'attraction',
        icon: '🏛️',
        title: 'Tourist-Friendly Attractions',
        description: 'Popular sites with good safety records and tourist police presence',
        distance: '1.2km',
        safetyScore: 92,
        coordinates: { latitude: latitude + 0.01, longitude: longitude - 0.005 }
      },
      {
        id: 3,
        type: 'transport',
        icon: '🚕',
        title: 'Safe Transportation Hub',
        description: 'Official taxi stand with verified drivers and fair pricing',
        distance: '0.3km',
        safetyScore: 88,
        coordinates: { latitude: latitude - 0.002, longitude: longitude + 0.003 }
      },
      {
        id: 4,
        type: 'medical',
        icon: '🏥',
        title: 'Tourist-Friendly Hospital',
        description: 'International hospital with English-speaking staff',
        distance: '2.1km',
        safetyScore: 98,
        coordinates: { latitude: latitude + 0.015, longitude: longitude + 0.01 }
      }
    ];

    let recommendations = allRecommendations;
    if (type !== 'all') {
      recommendations = allRecommendations.filter(r => r.type === type);
    }

    res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: error.message
    });
  }
});

// @route   GET /api/ai/cultural-tips
// @desc    Get cultural etiquette tips for location
// @access  Private
router.get('/cultural-tips', protect, async (req, res) => {
  try {
    const { country = 'India' } = req.query;

    // Mock cultural tips (in production, maintain a database)
    const tipsDatabase = {
      'India': [
        { icon: '👕', tip: 'Dress modestly when visiting religious sites' },
        { icon: '🙏', tip: 'Remove shoes before entering homes and temples' },
        { icon: '🤝', tip: 'Use right hand for giving and receiving items' },
        { icon: '📸', tip: 'Ask permission before photographing locals' },
        { icon: '💰', tip: 'Bargaining is expected in local markets' }
      ],
      'Japan': [
        { icon: '🙇', tip: 'Bow when greeting people' },
        { icon: '🥢', tip: 'Never stick chopsticks upright in rice' },
        { icon: '🔇', tip: 'Keep your voice down in public places' },
        { icon: '👞', tip: 'Remove shoes when entering homes' },
        { icon: '🎁', tip: 'Give and receive gifts with both hands' }
      ]
    };

    const tips = tipsDatabase[country] || tipsDatabase['India'];

    res.json({
      success: true,
      country,
      tips
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cultural tips',
      error: error.message
    });
  }
});

// @route   POST /api/ai/translate
// @desc    Translate emergency phrases
// @access  Private
router.post('/translate', protect, async (req, res) => {
  try {
    const { phrase, targetLanguage = 'hi' } = req.body;

    // Mock translations (in production, integrate Google Translate API)
    const translations = {
      'Help!': {
        'hi': 'मदद!',
        'es': '¡Ayuda!',
        'fr': 'Au secours!',
        'de': 'Hilfe!'
      },
      'Police': {
        'hi': 'पुलिस',
        'es': 'Policía',
        'fr': 'Police',
        'de': 'Polizei'
      },
      'Hospital': {
        'hi': 'अस्पताल',
        'es': 'Hospital',
        'fr': 'Hôpital',
        'de': 'Krankenhaus'
      },
      'Lost': {
        'hi': 'खो गया',
        'es': 'Perdido',
        'fr': 'Perdu',
        'de': 'Verloren'
      }
    };

    const translatedText = translations[phrase]?.[targetLanguage] || phrase;

    res.json({
      success: true,
      translation: {
        originalText: phrase,
        translatedText,
        targetLanguage,
        audioUrl: null // Would generate with text-to-speech API
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error translating phrase',
      error: error.message
    });
  }
});

// @route   GET /api/ai/local-alerts
// @desc    Get local alerts for area
// @access  Private
router.get('/local-alerts', protect, async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    // Mock alerts (in production, integrate weather/news APIs)
    const alerts = [
      {
        id: 1,
        type: 'weather',
        icon: '⛈️',
        message: 'Heavy rain expected this evening',
        severity: 'medium',
        timestamp: new Date()
      },
      {
        id: 2,
        type: 'traffic',
        icon: '🚦',
        message: 'Road closure on Main Street due to festival',
        severity: 'low',
        timestamp: new Date()
      }
    ];

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching local alerts',
      error: error.message
    });
  }
});

module.exports = router;
