const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const safeUser = user => ({ id: user._id, name: user.name, email: user.email, role: user.role, company: user.company });

function tokenFor(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, company } = req.body;
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 8 || !['candidate', 'recruiter'].includes(role)) {
      return res.status(400).json({ error: 'Provide a name, valid email, password (8+ characters), and valid role' });
    }
    if (role === 'recruiter' && !company?.trim()) {
      return res.status(400).json({ error: 'Company name is required for recruiters' });
    }
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(password, 12),
      role,
      company: role === 'recruiter' ? company.trim() : undefined
    });
    res.status(201).json({ token: tokenFor(user), user: safeUser(user) });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 500).json({ error: e.code === 11000 ? 'Email is already registered' : 'Could not register account' });
  }
};

exports.login = async (req, res) => {
  try {
    const user = await User.findOne({ email: (req.body.email || '').toLowerCase().trim() }).select('+passwordHash');
    if (!user || !await bcrypt.compare(req.body.password || '', user.passwordHash)) {
      return res.status(401).json({ error: 'Email or password is incorrect' });
    }
    res.json({ token: tokenFor(user), user: safeUser(user) });
  } catch {
    res.status(500).json({ error: 'Could not log in' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ error: 'Session user no longer exists', code: 'SESSION_EXPIRED' });
    res.json({ token: tokenFor(user), user: safeUser(user) });
  } catch {
    res.status(500).json({ error: 'Could not refresh session' });
  }
};

exports.me = (req, res) => res.json({ user: safeUser(req.user) });
