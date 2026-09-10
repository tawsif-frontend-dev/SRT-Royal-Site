const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const designerRoutes = require('./routes/designerRoutes');
const hireRequestRoutes = require('./routes/hireRequestRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { validateEnvironment } = require('./config/env');
const notificationRoutes = require('./routes/notificationRoutes');
const projectRoutes = require('./routes/projectRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const contactRoutes = require('./routes/contactRoutes');

async function createApp() {
  validateEnvironment();
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'development-secret-change-me';

  if (process.env.MONGODB_URI) {
    await connectDB(process.env.MONGODB_URI);
  }

  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  app.use(compression());

  app.use(cors({
    origin: process.env.CLIENT_URL || false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please wait a moment and try again.' },
  });
  app.use('/api/', apiLimiter);

  // Tighter limit on auth endpoints specifically — brute-force / credential-stuffing protection
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please wait 15 minutes and try again.' },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/signup', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/designers', designerRoutes);
  app.use('/api/hire-requests', hireRequestRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/contact', contactRoutes);

  app.get('/api/health', (req, res) => {
    const databaseReady = mongoose.connection.readyState === 1;
    res.json({
      status: databaseReady || !process.env.MONGODB_URI ? 'healthy' : 'degraded',
      database: databaseReady ? 'connected' : 'not-connected',
      env: process.env.NODE_ENV || 'development',
      features: {
        googleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        githubOAuth: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
        passwordResetEmail: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
        ownerNotifications: !!process.env.OWNER_EMAIL,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      // HTML/CSS/JS change often during active development with no
      // content-hash in the filename, so browsers must always revalidate
      // (fast — usually just a 304) instead of trusting a stale copy for
      // days. Only images are safe to cache long.
      if (/\.(html|css|js)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      }
    },
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
module.exports.createApp = createApp;
