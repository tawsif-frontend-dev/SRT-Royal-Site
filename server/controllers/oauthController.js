// Hand-rolled OAuth 2.0 authorization-code flow for Google and GitHub.
// Uses the global fetch API so it needs no extra npm dependencies and runs
// on Vercel serverless functions as-is. Enable per provider by setting
// <PROVIDER>_CLIENT_ID and <PROVIDER>_CLIENT_SECRET in the environment.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('./authController');
const { notifyOwner, escapeHtml } = require('../services/emailService');

const STATE_COOKIE = 'srt_oauth_state';

const PROVIDERS = {
  google: {
    scope: 'openid email profile',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    async getUserInfo(accessToken) {
      const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Google profile request failed.');
      const profile = await res.json();
      return {
        email: profile.email,
        name: profile.name,
        photo: profile.picture,
        emailVerified: profile.email_verified !== false,
      };
    },
  },
  github: {
    scope: 'read:user user:email',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    clientId: () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
    async getUserInfo(accessToken) {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      };
      const res = await fetch('https://api.github.com/user', { headers });
      if (!res.ok) throw new Error('GitHub profile request failed.');
      const profile = await res.json();

      let email = profile.email;
      if (!email) {
        const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
        if (emailsRes.ok) {
          const emails = await emailsRes.json();
          const primary = Array.isArray(emails)
            ? (emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified))
            : null;
          if (primary) email = primary.email;
        }
      }
      return {
        email,
        name: profile.name || profile.login,
        photo: profile.avatar_url,
        emailVerified: !!email,
      };
    },
  },
};

function isConfigured(provider) {
  const config = PROVIDERS[provider];
  return !!(config.clientId() && config.clientSecret());
}

function baseUrl(req) {
  return process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function stateCookie(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${STATE_COOKIE}=${value}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function startAuth(provider) {
  return (req, res) => {
    const config = PROVIDERS[provider];
    if (!(config.clientId() && config.clientSecret())) {
      return res.status(503).json({ message: `${provider} sign-in is not configured on this server yet.` });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const url = new URL(config.authorizeUrl);
    url.searchParams.set('client_id', config.clientId());
    url.searchParams.set('redirect_uri', `${baseUrl(req)}/api/auth/${provider}/callback`);
    url.searchParams.set('scope', config.scope);
    url.searchParams.set('state', state);
    url.searchParams.set('response_type', 'code');

    res.setHeader('Set-Cookie', stateCookie(state, 600));
    return res.redirect(url.toString());
  };
}

async function findOrCreateUser({ email, name, photo, provider }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });
  let created = false;
  if (!user) {
    user = await User.create({
      name: String(name || normalizedEmail.split('@')[0]).trim().slice(0, 120),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12),
      provider,
      photo: photo || '',
    });
    created = true;
  }
  return { user, created };
}

async function handleCallback(provider, req, res, next) {
  try {
    const config = PROVIDERS[provider];
    const { code, state } = req.query;

    if (!code) return res.status(400).send('Missing authorization code.');
    if (typeof state !== 'string' || !state || state !== readCookie(req, STATE_COOKIE)) {
      return res.status(400).send('Invalid OAuth state. Please go back and try signing in again.');
    }

    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: config.clientId(),
        client_secret: config.clientSecret(),
        code: String(code),
        grant_type: 'authorization_code',
        redirect_uri: `${baseUrl(req)}/api/auth/${provider}/callback`,
      }),
    });
    if (!tokenRes.ok) return res.status(502).send('Could not verify the login with the provider.');
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(502).send('The provider did not return an access token.');

    const info = await config.getUserInfo(tokenData.access_token);
    if (!info.email || !info.emailVerified) {
      return res.status(400).send('Your provider account does not expose a verified email address.');
    }

    const { user, created } = await findOrCreateUser(info);
    if (!user.isActive) return res.status(403).send('This account has been deactivated.');

    const token = signToken(user);

    notifyOwner(created ? {
      subject: `New account created: ${user.name}`,
      text: `A new account was created via ${provider}.\n\nName: ${user.name}\nEmail: ${user.email}`,
      html: `<p>A new account was created via <b>${escapeHtml(provider)}</b>.</p><p><b>Name:</b> ${escapeHtml(user.name)}<br/><b>Email:</b> ${escapeHtml(user.email)}</p>`,
    } : {
      subject: `Login: ${user.name}`,
      text: `${user.name} (${user.email}) just logged in via ${provider}.`,
      html: `<p><b>${escapeHtml(user.name)}</b> (${escapeHtml(user.email)}) just logged in via ${escapeHtml(provider)}.</p>`,
    });

    res.setHeader('Set-Cookie', stateCookie('', 0));
    return res.redirect(`/Login_page.html#token=${encodeURIComponent(token)}`);
  } catch (error) {
    return next(error);
  }
}

const googleAuth = startAuth('google');
const googleCallback = (req, res, next) => handleCallback('google', req, res, next);
const githubAuth = startAuth('github');
const githubCallback = (req, res, next) => handleCallback('github', req, res, next);

module.exports = { googleAuth, googleCallback, githubAuth, githubCallback };
