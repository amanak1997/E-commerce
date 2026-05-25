require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const orderRoutes = require('./routes/order.routes');
const { startGrpcServer } = require('./grpc/server');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service', pid: process.pid }));

app.use('/api', orderRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 3003;

async function start() {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_orders',
    { maxPoolSize: 10 }
  );
  logger.info('MongoDB connected (order-service)');

  startGrpcServer();   // gRPC on port 50053

  const server = app.listen(PORT, () =>
    logger.info(`Order service [pid:${process.pid}] on port ${PORT}`)
  );
  server.on('error', (err) => {
    logger.error(`HTTP server error: ${err.message}`);
    process.exit(1);
  });
}

start().catch((err) => {
  logger.error(`Startup failed: ${err.message}`);
  process.exit(1);
});
