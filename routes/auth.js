const router = require('express').Router();
const auth = require('../controllers/auth');
const { requireAuth } = require('../middleware/auth');
const UserProfile = require('../models/UserProfile');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/me', requireAuth, auth.me);
router.post('/refresh', requireAuth, auth.refresh);
router.get('/refresh', requireAuth, auth.refresh);

// Update notification preferences
router.put('/preferences', requireAuth, async (req, res) => {
  try {
    const { emailStatusUpdates, jobAlerts, jobAlertsMode, minFitScore } = req.body;
    let profile = await UserProfile.findOne({ userId: req.user._id });
    if (!profile) profile = await UserProfile.create({ userId: req.user._id });

    if (emailStatusUpdates !== undefined) profile.notificationPreferences.emailStatusUpdates = Boolean(emailStatusUpdates);
    if (jobAlerts !== undefined) profile.notificationPreferences.jobAlerts = Boolean(jobAlerts);
    if (['instant', 'digest', 'off'].includes(jobAlertsMode)) profile.notificationPreferences.jobAlertsMode = jobAlertsMode;
    if (minFitScore !== undefined) profile.notificationPreferences.minFitScore = Math.max(0, Math.min(100, Number(minFitScore)));

    await profile.save();
    res.json(profile.notificationPreferences);
  } catch (e) {
    res.status(500).json({ error: 'Could not update preferences' });
  }
});

module.exports = router;
