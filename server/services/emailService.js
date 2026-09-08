function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Sends transactional email through the Resend HTTPS API using the global
// fetch API, so no SMTP/npm dependency is required (works on Vercel as-is).
async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: 'Email provider is not configured.' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: text || '',
      html: html || text || '',
    }),
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    const error = new Error(`Email provider rejected the request (${res.status}). ${detail}`);
    error.statusCode = 502;
    throw error;
  }

  return { sent: true };
}

// Best-effort notification to the site owner. Never throws — a failed
// notification email must never break the request that triggered it.
async function notifyOwner({ subject, text, html }) {
  const to = process.env.OWNER_EMAIL;
  if (!to) return { sent: false, reason: 'OWNER_EMAIL is not configured.' };
  try {
    return await sendEmail({ to, subject, text, html });
  } catch (error) {
    console.error('Owner notification email failed:', error.message);
    return { sent: false, reason: error.message };
  }
}

module.exports = { sendEmail, notifyOwner, escapeHtml };
