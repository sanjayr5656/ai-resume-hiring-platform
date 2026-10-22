const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { requireAuth, requireRole } = require('../middleware/auth');
const profileCtrl = require('../controllers/profile');

// Per-user rate limit for refresh (expensive external calls)
const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh requests, please try again later' },
  skip: (req) => !req.user, // skip unauthenticated (handled by requireAuth)
});

router.use(requireAuth, requireRole('candidate'));

// Get full profile (links + stats + prefs)
router.get('/', profileCtrl.getProfile);

// Profile links
router.post('/links', profileCtrl.addLink);
router.put('/links/:platform', profileCtrl.updateLink);
router.delete('/links/:platform', profileCtrl.deleteLink);

// Coding stats
router.get('/coding-stats', profileCtrl.getCodingStats);
router.post('/coding-stats/:platform/refresh', refreshLimiter, profileCtrl.refreshStats);
router.put('/coding-stats/:platform/manual', profileCtrl.manualStats);

module.exports = router;
