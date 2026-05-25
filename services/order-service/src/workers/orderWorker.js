/**
 * BullMQ Worker — processes order jobs in the background.
 * Runs independently from the HTTP server for scalability.
 *
 * Jobs handled:
 *  - process-order   → reserve inventory, notify seller
 *  - confirm-order   → mark order confirmed after payment
 *  - ship-order      → update status to shipped, set tracking
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Worker, MetricsTime } = require('bullmq');
const mongoose      = require('mongoose');
const Order         = require('../models/Order');
const { enqueueNotification } = require('../queues/orderQueue');
const productClient = require('../grpc/clients/productClient');   // gRPC ✅
const logger        = require('../utils/logger');

const _redisUrl  = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
const REDIS_CONN = {
  host:     _redisUrl.hostname,
  port:     parseInt(_redisUrl.port, 10) || 6379,
  password: _redisUrl.password || undefined,
};

// ─── Job Processors ───────────────────────────────────────────────────────────
async function processOrder(job) {
  const { orderId } = job.data;
  logger.info(`[Worker] Processing order ${orderId}`);

  await job.updateProgress(10);

  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  // 1. Reserve inventory — gRPC call to Product Service
  await job.updateProgress(30);
  for (const item of order.items) {
    const result = await productClient.deductStock(
      item.product.toString(),
      item.quantity
    );
    if (!result.success) {
      throw new Error(`Stock deduction failed for product ${item.product}: ${result.message}`);
    }
    logger.info(`[Worker] Stock deducted for ${item.product}: remaining ${result.current_stock}`);
  }

  // 2. Mark as processing
  await job.updateProgress(70);
  order.addStatus('processing', 'Order is being prepared');
  await order.save();

  // 3. Enqueue notification
  await enqueueNotification('order-confirmation', {
    email:       job.data.userEmail,
    orderNumber: order.orderNumber,
    items:       order.items,
    total:       order.total,
    orderId:     order._id,
  });

  await job.updateProgress(100);
  logger.info(`[Worker] Order ${orderId} processed successfully`);
  return { orderId, status: 'processing' };
}

async function confirmOrder(job) {
  const { orderId, paymentIntentId } = job.data;
  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  order.addStatus('confirmed', 'Payment confirmed');
  order.paymentStatus = 'paid';
  order.paymentIntentId = paymentIntentId;
  order.paidAt = new Date();
  await order.save();

  logger.info(`[Worker] Order ${orderId} confirmed`);
  return { orderId, status: 'confirmed' };
}

// ─── Worker Setup ─────────────────────────────────────────────────────────────
const worker = new Worker('orders', async (job) => {
  switch (job.name) {
    case 'process-order':  return processOrder(job);
    case 'confirm-order':  return confirmOrder(job);
    default:
      logger.warn(`[Worker] Unknown job type: ${job.name}`);
  }
}, {
  connection: REDIS_CONN,
  concurrency: 5,
  metrics: { maxDataPoints: MetricsTime.ONE_WEEK },
});

worker.on('completed', (job, result) => {
  logger.info(`[Worker] Job ${job.id} completed: ${JSON.stringify(result)}`);
});

worker.on('failed', (job, err) => {
  logger.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
});

worker.on('stalled', (jobId) => {
  logger.warn(`[Worker] Job ${jobId} stalled`);
});

// ─── Connect DB & Start ────────────────────────────────────────────────────────
async function start() {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce_orders',
    { maxPoolSize: 5 }
  );
  logger.info('[OrderWorker] Connected to MongoDB — waiting for jobs…');
}

start().catch((err) => {
  logger.error(`[OrderWorker] Startup error: ${err.message}`);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('[OrderWorker] Shutting down gracefully…');
  await worker.close();
  await mongoose.disconnect();
  process.exit(0);
});
