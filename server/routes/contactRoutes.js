const express = require('express');
const ContactMessage = require('../models/ContactMessage');
const { isValidEmail } = require('../middleware/validation');
const { sendEmail, escapeHtml } = require('../services/emailService');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Your name and a valid email are required.' });
    }
    if (!message || String(message).trim().length < 10) {
      return res.status(400).json({ message: 'Please write a message of at least 10 characters.' });
    }

    const entry = await ContactMessage.create({
      name: String(name).trim().slice(0, 120),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim().slice(0, 40) : '',
      subject: subject ? String(subject).trim().slice(0, 160) : '',
      message: String(message).trim().slice(0, 4000),
    });

    // Best-effort email to the owner; the message is stored either way.
    let delivered = false;
    if (process.env.OWNER_EMAIL) {
      try {
        const result = await sendEmail({
          to: process.env.OWNER_EMAIL,
          subject: `Contact form: ${entry.subject || entry.name}`,
          text: `From: ${entry.name} <${entry.email}>${entry.phone ? `\nPhone: ${entry.phone}` : ''}\n\n${entry.message}`,
          html: `<p><b>From:</b> ${escapeHtml(entry.name)} &lt;${escapeHtml(entry.email)}&gt;${entry.phone ? `<br/><b>Phone:</b> ${escapeHtml(entry.phone)}` : ''}</p><p>${escapeHtml(entry.message)}</p>`,
        });
        delivered = result.sent;
      } catch (emailError) {
        console.error('Contact form email failed:', emailError.message);
      }
    }

    return res.status(201).json({
      message: delivered
        ? 'Message sent! We usually reply within 24 hours.'
        : 'Message received and saved! We usually reply within 24 hours.',
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
