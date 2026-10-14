const router = require('express').Router();
const auth = require('../controllers/auth');
const { requireAuth } = require('../middleware/auth');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/me', requireAuth, auth.me);
router.post('/refresh', requireAuth, auth.refresh);
router.get('/refresh', requireAuth, auth.refresh);

module.exports = router;
