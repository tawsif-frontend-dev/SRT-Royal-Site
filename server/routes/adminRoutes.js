const express = require('express');
const User = require('../models/User');
const Designer = require('../models/Designer');
const HireRequest = require('../models/HireRequest');
const Review = require('../models/Review');
const Project = require('../models/Project');
const ContactMessage = require('../models/ContactMessage');
const Payment = require('../models/Payment');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireObjectId, requireString } = require('../middleware/validation');
const { logActivity } = require('../services/activityLogService');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/overview', async (req, res, next) => {
  try {
    const [users, designers, hireRequests, projects, reviews] = await Promise.all([
      User.countDocuments(),
      Designer.countDocuments(),
      HireRequest.countDocuments({ status: 'pending' }),
      Project.countDocuments(),
      Review.countDocuments(),
    ]);

    const averageRating = await Review.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);

    const summary = {
      totalUsers: users,
      totalDesigners: designers,
      totalProjects: projects,
      pendingHireRequests: hireRequests,
      totalReviews: reviews,
      averageRating: averageRating[0]?.avg ? Number(averageRating[0].avg.toFixed(1)) : 0,
    };

    return res.json({ summary });
  } catch (error) {
    return next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash -__v').sort({ createdAt: -1 }).lean();
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const user = await User.findById(requireObjectId(req.params.id, 'User ID'));
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (String(user._id) === String(req.user.id)) return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be a boolean.' });
    user.isActive = req.body.isActive;
    await user.save();
    return res.json({ user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive } });
  } catch (error) { return next(error); }
});

router.get('/contact-messages', async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ messages });
  } catch (error) {
    return next(error);
  }
});

router.patch('/contact-messages/:id/handled', async (req, res, next) => {
  try {
    const message = await ContactMessage.findById(requireObjectId(req.params.id, 'Message ID'));
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    message.handled = true;
    await message.save();
    return res.json({ message: 'Marked as handled.', contactMessage: message });
  } catch (error) {
    return next(error);
  }
});

router.get('/hire-requests', async (req, res, next) => {
  try {
    const requests = await HireRequest.find().sort({ createdAt: -1 }).populate('client', 'name email').populate('designer', 'user').lean();
    return res.json({ hireRequests: requests });
  } catch (error) {
    return next(error);
  }
});

// ── Payments — full financial visibility for the owner/admin ──
router.get('/payments', async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: String(req.query.status) } : {};
    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('user', 'name email')
      .populate('project', 'title')
      .populate({ path: 'designer', populate: { path: 'user', select: 'name email' } })
      .lean();
    return res.json({ payments });
  } catch (error) {
    return next(error);
  }
});

router.get('/revenue', async (req, res, next) => {
  try {
    const [totals, byStatus] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'paid' } },
        {
          $group: {
            _id: null,
            totalGross: { $sum: '$amount' },
            totalDeveloperEarnings: { $sum: '$developerShare' },
            totalPlatformEarnings: { $sum: '$platformShare' },
            totalPaidCount: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
    ]);

    const summary = totals[0] || { totalGross: 0, totalDeveloperEarnings: 0, totalPlatformEarnings: 0, totalPaidCount: 0 };
    const statusBreakdown = {};
    byStatus.forEach((row) => { statusBreakdown[row._id] = { count: row.count, amount: row.amount }; });

    return res.json({
      totalRevenue: summary.totalGross,
      developerEarnings: summary.totalDeveloperEarnings,
      platformEarnings: summary.totalPlatformEarnings,
      completedPayments: summary.totalPaidCount,
      statusBreakdown,
    });
  } catch (error) {
    return next(error);
  }
});

// ── Developer approval workflow ──
router.get('/designers', async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: String(req.query.status) } : {};
    const designers = await Designer.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('user', 'name email photo role')
      .lean();
    return res.json({ designers });
  } catch (error) {
    return next(error);
  }
});

router.patch('/designers/:id/status', async (req, res, next) => {
  try {
    const designer = await Designer.findById(requireObjectId(req.params.id, 'Designer ID'));
    if (!designer) return res.status(404).json({ message: 'Designer application not found.' });

    const nextStatus = requireString(req.body.status, 'Status', { max: 20 });
    if (!['approved', 'rejected'].includes(nextStatus)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'." });
    }

    designer.status = nextStatus;
    designer.reviewedBy = req.user.id;
    designer.reviewedAt = new Date();
    if (nextStatus === 'rejected' && req.body.reason) {
      designer.rejectionReason = requireString(req.body.reason, 'Rejection reason', { max: 500 });
    }
    await designer.save();
    logActivity({
      actor: req.user.id, actorRole: 'admin',
      action: `designer.${nextStatus}`, targetType: 'Designer', targetId: designer._id,
      metadata: { reason: nextStatus === 'rejected' ? designer.rejectionReason : undefined },
    });

    if (nextStatus === 'approved') {
      // Grants designer-only API access (hire request handling, etc).
      // Note: if this user is already logged in with a JWT issued before
      // approval, that token still carries their old role — they need to
      // log out and back in for the new permissions to take effect.
      await User.findByIdAndUpdate(designer.user, { role: 'designer' });
    }

    return res.json({ designer, message: `Designer application ${nextStatus}.` });
  } catch (error) {
    return next(error);
  }
});

// ── Activity log — recent significant platform actions, for the audit trail ──
router.get('/activity', async (req, res, next) => {
  try {
    const ActivityLog = require('../models/ActivityLog');
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const entries = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name email role')
      .lean();
    return res.json({ entries });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
