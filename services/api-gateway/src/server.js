require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const compression = require('compression');
const http      = require('http');
const { Server: SocketIO } = require('socket.io');
const { createProxyMiddleware } = require('http-proxy-middleware');

const rateLimiter    = require('./middleware/rateLimiter');
const authMiddleware = require('./middleware/auth');
const logger         = require('./utils/logger');

const app    = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new SocketIO(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3006', credentials: true },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('join-order-room', (orderId) => {
    socket.join(`order:${orderId}`);
    logger.info(`Socket ${socket.id} joined order:${orderId}`);
  });
  socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
});
global.io = io;

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3006',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'api-gateway',
  pid: process.pid, uptime: process.uptime(),
}));

// ─── Rate Limiters ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 500, keyPrefix: 'rl:global' });
const authLimiter   = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20,  keyPrefix: 'rl:auth',
  message: 'Too many auth attempts, please try again in 15 minutes.' });

// ─── Proxy Factory ─────────────────────────────────────────────────────────────
// When Express mounts middleware with app.use('/api/foo', proxy), it strips
// the prefix from req.url before calling the proxy.  pathRewrite re-prepends
// the original prefix so the downstream service receives the full path it expects.
//
// e.g.  GET /api/products/featured
//   → Express strips /api/products → req.url = /featured
//   → pathRewrite { '^': '/api/products' } → /api/products/featured  ✓
function proxy(target, mountPrefix, extraOpts = {}) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    // Prepend the stripped prefix back so downstream services see the full path
    pathRewrite: { '^': mountPrefix },
    on: {
      error: (err, req, res) => {
        logger.error(`Proxy error → ${target}: ${err.message}`);
        res.status(502).json({ success: false, message: 'Service temporarily unavailable' });
      },
    },
    ...extraOpts,
  });
}

// Service URLs (from env in Docker; localhost defaults for local dev)
const AUTH_URL         = process.env.AUTH_SERVICE_URL         || 'http://localhost:3001';
const PRODUCT_URL      = process.env.PRODUCT_SERVICE_URL      || 'http://localhost:3002';
const ORDER_URL        = process.env.ORDER_SERVICE_URL        || 'http://localhost:3003';
const PAYMENT_URL      = process.env.PAYMENT_SERVICE_URL      || 'http://localhost:3004';
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';

// ─── Auth routes ──────────────────────────────────────────────────────────────
// Public — but rate-limited.  Auth service mounts at /api/auth.
app.use('/api/auth',
  authLimiter,
  proxy(AUTH_URL, '/api/auth')
);

// ─── Product routes ───────────────────────────────────────────────────────────
// GET  → public.  POST/PUT/DELETE → requires auth.
// Product service mounts at /api  →  handles /api/products/*, /api/categories/*
app.use('/api/products',
  globalLimiter,
  (req, res, next) => {
    if (['GET', 'HEAD'].includes(req.method)) return next();
    return authMiddleware(req, res, next);
  },
  proxy(PRODUCT_URL, '/api/products')
);

// ─── Category routes ──────────────────────────────────────────────────────────
// GET → public.  POST (create) → requires admin auth.
app.use('/api/categories',
  globalLimiter,
  (req, res, next) => {
    if (['GET', 'HEAD'].includes(req.method)) return next();
    return authMiddleware(req, res, next);
  },
  proxy(PRODUCT_URL, '/api/categories')
);

// ─── Order routes ─────────────────────────────────────────────────────────────
// Always authenticated.  Order service mounts at /api → handles /api/orders/*.
app.use('/api/orders',
  globalLimiter,
  authMiddleware,
  proxy(ORDER_URL, '/api/orders')
);

// ─── Payment routes ───────────────────────────────────────────────────────────
// Stripe webhook must NOT have rate-limit or auth — Stripe calls it directly.
app.use('/api/payments',
  (req, res, next) => req.path === '/webhook' ? next() : globalLimiter(req, res, next),
  (req, res, next) => req.path === '/webhook' ? next() : authMiddleware(req, res, next),
  proxy(PAYMENT_URL, '/api/payments')
);

// ─── Admin routes ─────────────────────────────────────────────────────────────
// Authenticated. Role check happens inside each service.
// Routes split: product-admin → /api/admin/products|stats|categories
//               order-admin   → /api/admin/orders
app.use('/api/admin/orders',
  globalLimiter,
  authMiddleware,
  proxy(ORDER_URL, '/api/admin/orders')
);

app.use('/api/admin',
  globalLimiter,
  authMiddleware,
  proxy(PRODUCT_URL, '/api/admin')
);

// ─── 404 / Error ──────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` })
);
app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  logger.info(`API Gateway [pid:${process.pid}] on port ${PORT}`)
);

module.exports = { app, server, io };
