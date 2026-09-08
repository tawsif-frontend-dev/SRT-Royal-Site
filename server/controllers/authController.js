const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { isValidEmail, requireString } = require('../middleware/validation');
const { sendEmail, notifyOwner, escapeHtml } = require('../services/emailService');
const { logActivity } = require('../services/activityLogService');

function sanitizeUser(user) {
  const doc = user.toObject ? user.toObject() : user;
  const { passwordHash, __v, ...safeUser } = doc;
  return safeUser;
}

function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'development-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function signup(req, res, next) {
  try {
    const { name, email, password, role = 'client', company } = req.body;

    if (!name || !email || !password || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = requireString(email, 'Email', { max: 254 }).toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const validRoles = ['client', 'designer', 'admin'];
    const requestedRole = String(role).toLowerCase();
    const assignedRole = requestedRole === 'admin' && process.env.NODE_ENV !== 'test'
      ? 'client'
      : (validRoles.includes(requestedRole) ? requestedRole : 'client');

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role: assignedRole,
      company: company ? String(company).trim() : '',
    });

    const token = signToken(user);

    logActivity({ actor: user._id, actorRole: user.role, action: 'user.signup', targetType: 'User', targetId: user._id, metadata: { name: user.name, role: user.role } });

    notifyOwner({
      subject: `New account created: ${user.name}`,
      text: `A new account was created.\n\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}${user.company ? `\nCompany: ${user.company}` : ''}`,
      html: `<p>A new account was created.</p><p><b>Name:</b> ${escapeHtml(user.name)}<br/><b>Email:</b> ${escapeHtml(user.email)}<br/><b>Role:</b> ${escapeHtml(user.role)}${user.company ? `<br/><b>Company:</b> ${escapeHtml(user.company)}` : ''}</p>`,
    });

    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);

    notifyOwner({
      subject: `Login: ${user.name}`,
      text: `${user.name} (${user.email}) just logged in.`,
      html: `<p><b>${escapeHtml(user.name)}</b> (${escapeHtml(user.email)}) just logged in.</p>`,
    });

    return res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function forgotPassword(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email address is required.' });
    }

    const genericMessage = 'If that email is registered, a password reset link has been sent.';
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.json({ message: genericMessage });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = hashResetToken(token);
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const base = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${base}/reset-password.html?token=${token}`;

    let delivery = { sent: false };
    try {
      delivery = await sendEmail({
        to: user.email,
        subject: 'SRT Royal — Reset your password',
        text: `You requested a password reset. Open this link within 1 hour: ${resetUrl}`,
        html: `<p>You requested a password reset for your SRT Royal account.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a> — the link is valid for 1 hour.</p><p>If you did not request this, you can safely ignore this email.</p>`,
      });
    } catch (emailError) {
      return res.json({ message: `${genericMessage} The email could not be delivered right now — please try again later.` });
    }

    if (!delivery.sent && process.env.NODE_ENV !== 'production') {
      return res.json({ message: `${genericMessage} (dev only — email provider not configured, reset link: ${resetUrl})`, devResetUrl: resetUrl });
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Reset token is required.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    const user = await User.findOne({
      resetTokenHash: hashResetToken(token),
      resetTokenExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetTokenHash = '';
    user.resetTokenExpires = null;
    await user.save();

    return res.json({ message: 'Password updated. You can now sign in with your new password.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { signup, login, forgotPassword, resetPassword, sanitizeUser, signToken };
