const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function currentUserFromToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
  const id = payload.id || payload.sub;
  if (!id) {
    const error = new Error('Invalid token payload.');
    error.statusCode = 401;
    throw error;
  }

  // Roles and account activity can change after a token is issued. Looking up
  // the account here makes an admin approval, role change, or deactivation take
  // effect immediately instead of leaving the old token authoritative for days.
  const user = await User.findById(id).select('email role isActive').lean();
  if (!user || !user.isActive) {
    const error = new Error('This account is no longer active.');
    error.statusCode = 401;
    throw error;
  }

  return { id: user._id.toString(), email: user.email, role: user.role };
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    req.user = await currentUserFromToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: error.message === 'This account is no longer active.' ? error.message : 'Invalid or expired token.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    req.user = await currentUserFromToken(token);
  } catch (error) {
    req.user = null;
  }

  return next();
}

module.exports = { requireAuth, requireRole, optionalAuth };
