require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/database');
const { getRedis } = require('./config/redis');
const authRoutes = require('./routes/auth.routes');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'auth-service', pid: process.pid,
}));

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── 404 / Error ──────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 3001;

async function start() {
  await connectDB();
  getRedis(); // warm up connection
  app.listen(PORT, () => logger.info(`Auth service [pid:${process.pid}] on port ${PORT}`));
}

start();
