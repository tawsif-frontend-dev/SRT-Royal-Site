const express = require('express');
const mongoose = require('mongoose');
const HireRequest = require('../models/HireRequest');
const Designer = require('../models/Designer');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireObjectId, requireString, isValidEmail, pagination } = require('../middleware/validation');
const { createNotification } = require('../services/notificationService');
const { logActivity } = require('../services/activityLogService');
const { sendEmail, escapeHtml } = require('../services/emailService');
const Project = require('../models/Project');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = {};
    if (req.user.role !== 'admin') {
      const designerProfile = await Designer.findOne({ user: req.user.id }).select('_id').lean();
      filter.$or = [{ client: req.user.id }];
      if (designerProfile) filter.$or.push({ designer: designerProfile._id });
    }
    const [requests, total] = await Promise.all([
      HireRequest.find(filter).populate('client', 'name email company').populate('designer').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      HireRequest.countDocuments(filter),
    ]);
    return res.json({ hireRequests: requests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
});

router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { designerId, projectTitle, description, budget, budgetLabel, deadline, timeline, designStyle, name, email, whatsapp } = req.body;

    if (!projectTitle || !description) {
      return res.status(400).json({ message: 'Project title and description are required.' });
    }

    // Guests (not signed in) must leave contact details so the studio can reply.
    let guestName = '', guestEmail = '', guestWhatsapp = '';
    if (!req.user) {
      if (!name || !email || !isValidEmail(email)) {
        return res.status(400).json({ message: 'Your name and a valid email are required.' });
      }
      guestName = String(name).trim().slice(0, 120);
      guestEmail = String(email).trim().toLowerCase();
      guestWhatsapp = whatsapp ? String(whatsapp).trim().slice(0, 40) : '';
    }

    let designer = null;
    if (designerId) {
      // A designerId was explicitly provided — it must resolve to a real
      // designer. Silently falling back to a different (auto-assigned)
      // designer here would mean the client ends up paired with someone
      // they didn't choose, with no indication anything went wrong.
      if (!mongoose.Types.ObjectId.isValid(designerId)) {
        return res.status(400).json({ message: 'The selected designer could not be found. Please choose a designer again.' });
      }
      designer = await Designer.findOne({ _id: designerId, status: 'approved' });
      if (!designer) {
        return res.status(400).json({ message: 'The selected designer is not currently available. Please choose an approved designer again.' });
      }
    } else {
      // No designer specified at all — this is a legitimate general inquiry
      // ("Hire Me" style request with no specific pick), so auto-assign the
      // top-rated approved designer.
      designer = await Designer.findOne({ status: 'approved' }).sort({ rating: -1, createdAt: -1 });
    }

    const request = await HireRequest.create({
      client: req.user ? req.user.id : null,
      designer: designer ? designer._id : null,
      guestName,
      guestEmail,
      guestWhatsapp,
      projectTitle: String(projectTitle).trim(),
      description: String(description).trim(),
      budget: Number(String(budget).replace(/[^0-9.]/g, '')) || 0,
      budgetLabel: budgetLabel ? String(budgetLabel).trim().slice(0, 60) : (budget ? String(budget).slice(0, 60) : ''),
      timeline: timeline ? String(timeline).trim().slice(0, 60) : '',
      designStyle: designStyle ? String(designStyle).trim().slice(0, 60) : '',
      deadline: deadline || timeline || '',
    });

    if (designer) {
      await createNotification({ user: designer.user, type: 'hire_request', message: `New hire request: ${request.projectTitle}.`, metadata: { hireRequestId: request.id } });
    }
    logActivity({
      actor: req.user ? req.user.id : null,
      actorRole: req.user ? req.user.role : 'client',
      action: 'hire_request.created',
      targetType: 'HireRequest',
      targetId: request._id,
      metadata: { projectTitle: request.projectTitle, designerAssigned: !!designer },
    });

    // Best-effort email to the site owner; never fails the request.
    if (process.env.OWNER_EMAIL) {
      const contactLine = req.user
        ? `Registered client (account email via dashboard)`
        : `${guestName} — ${guestEmail}${guestWhatsapp ? ` (WhatsApp: ${guestWhatsapp})` : ''}`;
      try {
        await sendEmail({
          to: process.env.OWNER_EMAIL,
          subject: `New hire request: ${request.projectTitle}`,
          text: `New hire request received.\n\nProject: ${request.projectTitle}\nBudget: ${request.budgetLabel || '—'}\nTimeline: ${request.timeline || '—'}\nStyle: ${request.designStyle || '—'}\nDesigner: ${designer ? 'assigned automatically/specific' : 'none available yet'}\nContact: ${contactLine}\n\nDescription:\n${request.description}`,
          html: `<h3>New hire request</h3><p><b>Project:</b> ${escapeHtml(request.projectTitle)}<br/><b>Budget:</b> ${escapeHtml(request.budgetLabel || '—')}<br/><b>Timeline:</b> ${escapeHtml(request.timeline || '—')}<br/><b>Contact:</b> ${escapeHtml(contactLine)}</p><p>${escapeHtml(request.description)}</p>`,
        });
      } catch (emailError) {
        console.error('Owner notification email failed:', emailError.message);
      }
    }

    return res.status(201).json({ hireRequest: request, message: 'Request received! We will be in touch within 24 hours.' });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const request = await HireRequest.findById(requireObjectId(req.params.id, 'Hire request ID'));
    if (!request) return res.status(404).json({ message: 'Hire request not found.' });

    const requestDesigner = await Designer.findById(request.designer).select('user');
    const isClient = String(request.client) === String(req.user.id);
    const isDesignerUser = !!requestDesigner && String(requestDesigner.user) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && !isClient && !isDesignerUser) {
      return res.status(403).json({ message: 'You cannot update this hire request.' });
    }

    const nextStatus = requireString(req.body.status, 'Status', { max: 20 });
    const transitions = {
      pending: ['accepted', 'rejected', 'cancelled'], accepted: ['in_progress', 'cancelled'],
      rejected: [], in_progress: ['completed', 'cancelled'], completed: [], cancelled: [],
    };
    if (!transitions[request.status]?.includes(nextStatus)) return res.status(400).json({ message: `Cannot change request from ${request.status} to ${nextStatus}.` });
    if (!isAdmin && ['accepted', 'rejected', 'in_progress', 'completed'].includes(nextStatus) && !isDesignerUser) {
      return res.status(403).json({ message: 'Only the assigned designer can advance this hire request.' });
    }
    if (!isAdmin && nextStatus === 'cancelled' && !isClient && !isDesignerUser) {
      return res.status(403).json({ message: 'Only the client or assigned designer can cancel this hire request.' });
    }
    // Guests can submit a lead, but a billable project needs an authenticated
    // client account for ownership, payments, and notifications. Do not mark
    // the request accepted unless that account exists.
    if (nextStatus === 'accepted' && !request.client) {
      return res.status(400).json({ message: 'This is a guest inquiry. Ask the client to create an account before accepting it as a project.' });
    }

    const previousStatus = request.status;
    request.status = nextStatus;
    await request.save();
    logActivity({
      actor: req.user.id, actorRole: req.user.role,
      action: `hire_request.${nextStatus}`, targetType: 'HireRequest', targetId: request._id,
      metadata: { projectTitle: request.projectTitle },
    });
    if (nextStatus === 'accepted') {
      let project;
      try {
        project = await Project.create({ client: request.client, designer: request.designer, hireRequest: request._id, title: request.projectTitle, description: request.description, budget: request.budget, deadline: request.deadline });
      } catch (error) {
        // Do not leave the request accepted if its required project could not
        // be created. This compensation also keeps standalone MongoDB setups
        // working without requiring transaction support from a replica set.
        request.status = previousStatus;
        await request.save();
        throw error;
      }
      await createNotification({ user: request.client, type: 'hire_accepted', message: `Your hire request was accepted. Project ${project.title} was created.`, metadata: { hireRequestId: request.id } });
      logActivity({ actor: req.user.id, actorRole: req.user.role, action: 'project.created', targetType: 'Project', targetId: project._id, metadata: { title: project.title } });
      return res.json({ hireRequest: request, project });
    }
    const notifyUser = isClient ? requestDesigner?.user : request.client;
    if (notifyUser) {
      await createNotification({ user: notifyUser, type: `hire_${nextStatus}`, message: `Hire request status changed to ${nextStatus}.`, metadata: { hireRequestId: request.id } });
    }
    return res.json({ hireRequest: request });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
