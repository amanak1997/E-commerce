require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const productRoutes = require('./routes/product.routes');
const { startGrpcServer } = require('./grpc/server');
const logger = require('./utils/logger');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

// Serve uploaded product images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'product-service', pid: process.pid }));

app.use('/api', productRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 3002;

async function start() {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_products',
    { maxPoolSize: 10 }
  );
  logger.info('MongoDB connected (product-service)');

  startGrpcServer();   // gRPC on port 50052
  app.listen(PORT, () => logger.info(`Product service [pid:${process.pid}] on port ${PORT}`));
}

start();
