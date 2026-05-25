require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const paymentRoutes = require('./routes/payment.routes');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
// Note: body parsing is handled per-route (raw for webhook, json for others)

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'payment-service', pid: process.pid }));

app.use('/api', paymentRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 3004;

async function start() {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_payments',
    { maxPoolSize: 10 }
  );
  logger.info('MongoDB connected (payment-service)');
  app.listen(PORT, () => logger.info(`Payment service [pid:${process.pid}] on port ${PORT}`));
}

start();
