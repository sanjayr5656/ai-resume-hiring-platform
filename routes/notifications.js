const router = require('express').Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAuth);

// GET /api/notifications – list notifications for current user
router.get('/', asyncRoute(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 100);
  const unreadOnly = req.query.unread === 'true';
  const filter = { userId: req.user._id };
  if (unreadOnly) filter.readAt = null;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ userId: req.user._id, readAt: null }),
  ]);

  res.json({ notifications, unreadCount });
}));

// PATCH /api/notifications/read-all – mark all as read
router.patch('/read-all', asyncRoute(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, readAt: null },
    { $set: { readAt: new Date() } }
  );
  res.json({ ok: true });
}));

// PATCH /api/notifications/:id/read – mark single as read
router.patch('/:id/read', asyncRoute(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  res.json(n);
}));

// POST /api/notifications/test-email – send a test email to the user's registered email
router.post('/test-email', asyncRoute(async (req, res) => {
  const { enqueueEmail } = require('../services/email/sender');
  const { welcomeEmail } = require('../services/email/templates');
  const template = welcomeEmail({
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    company: req.user.company,
  });

  await enqueueEmail({
    to: req.user.email,
    subject: `[Test] ${template.subject}`,
    html: template.html,
    text: template.text,
  });

  const isConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  res.json({
    ok: true,
    sentTo: req.user.email,
    mode: isConfigured ? 'live-smtp' : 'test-mode',
    message: isConfigured
      ? `Email dispatched via SMTP to ${req.user.email}. Check your inbox/spam folder.`
      : `Email queued in test mode. To receive real emails in ${req.user.email}, configure SMTP_USER & SMTP_PASS in .env`,
  });
}));

module.exports = router;
