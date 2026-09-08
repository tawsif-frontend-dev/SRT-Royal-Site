const express = require('express');
const Project = require('../models/Project');
const { requireAuth } = require('../middleware/auth');
const { pagination, requireObjectId, requireString } = require('../middleware/validation');
const { createNotification } = require('../services/notificationService');
const { logActivity } = require('../services/activityLogService');
const Designer = require('../models/Designer');

const router = express.Router();
router.use(requireAuth);

async function projectFilter(user) {
  if (user.role === 'admin') return {};
  const designer = await Designer.findOne({ user: user.id }).select('_id').lean();
  return { $or: [{ client: user.id }, ...(designer ? [{ designer: designer._id }] : [])] };
}

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = { ...(await projectFilter(req.user)), ...(req.query.status ? { status: req.query.status } : {}) };
    const [projects, total] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('client', 'name email').populate('designer', 'user').lean(),
      Project.countDocuments(filter),
    ]);
    return res.json({ projects, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: requireObjectId(req.params.id, 'Project ID'), ...(await projectFilter(req.user)) }).populate('client', 'name email').populate('designer', 'user').lean();
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    return res.json({ project });
  } catch (error) { return next(error); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: requireObjectId(req.params.id, 'Project ID'), ...(await projectFilter(req.user)) });
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    const status = requireString(req.body.status, 'Status', { max: 20 });
    const designer = await Designer.findOne({ _id: project.designer, user: req.user.id }).select('_id').lean();
    const isClient = String(project.client) === String(req.user.id);
    const isDesigner = !!designer;
    const isAdmin = req.user.role === 'admin';
    const allowed = {
      pending: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    if (!isAdmin && !allowed[project.status]?.includes(status)) {
      return res.status(400).json({ message: `Cannot change project from ${project.status} to ${status}.` });
    }
    if (!Object.prototype.hasOwnProperty.call(allowed, status)) return res.status(400).json({ message: 'Invalid project status.' });
    if (!isAdmin && status === 'cancelled' && !isClient && !isDesigner) {
      return res.status(403).json({ message: 'Only the client or assigned designer can cancel this project.' });
    }
    if (!isAdmin && status !== 'cancelled' && !isDesigner) {
      return res.status(403).json({ message: 'Only the assigned designer can advance this project.' });
    }
    project.status = status;
    await project.save();
    logActivity({ actor: req.user.id, actorRole: req.user.role, action: `project.${status}`, targetType: 'Project', targetId: project._id, metadata: { title: project.title } });
    const projectDesigner = await Designer.findById(project.designer).select('user').lean();
    const recipient = String(project.client) === String(req.user.id) ? projectDesigner?.user : project.client;
    if (recipient) {
    await createNotification({ user: recipient, type: 'project_status', message: `Project status changed to ${status}.`, metadata: { projectId: project.id } });
    }
    return res.json({ project });
  } catch (error) { return next(error); }
});

module.exports = router;
