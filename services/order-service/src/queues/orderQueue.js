/**
 * BullMQ Queue — Order processing queue backed by Redis.
 * Jobs flow:  place order → confirm-payment → notify → update-inventory
 */
const { Queue, QueueEvents } = require('bullmq');
const logger = require('../utils/logger');

// Parse Redis URL safely with built-in URL class
const _redisUrl  = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
const connection = {
  host:     _redisUrl.hostname,
  port:     parseInt(_redisUrl.port, 10) || 6379,
  password: _redisUrl.password || undefined,
};

// ─── Queues ───────────────────────────────────────────────────────────────────
const orderQueue = new Queue('orders', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
  },
});

// ─── Queue Events (for logging) ───────────────────────────────────────────────
const orderQueueEvents = new QueueEvents('orders', { connection });

orderQueueEvents.on('completed', ({ jobId }) =>
  logger.info(`Order job ${jobId} completed`)
);
orderQueueEvents.on('failed', ({ jobId, failedReason }) =>
  logger.error(`Order job ${jobId} failed: ${failedReason}`)
);

// ─── Job Factories ────────────────────────────────────────────────────────────
async function enqueueOrderProcessing(orderId, data = {}) {
  const job = await orderQueue.add('process-order', { orderId, ...data }, {
    jobId: `order:${orderId}`,
  });
  logger.info(`Enqueued order processing job ${job.id} for order ${orderId}`);
  return job;
}

async function enqueueOrderConfirmation(orderId) {
  return orderQueue.add('confirm-order', { orderId }, {
    jobId: `confirm:${orderId}`,
    delay: 0,
  });
}

async function enqueueNotification(type, payload) {
  return notificationQueue.add(type, payload, {
    priority: type === 'order-confirmation' ? 1 : 5,
  });
}

module.exports = {
  orderQueue,
  notificationQueue,
  orderQueueEvents,
  enqueueOrderProcessing,
  enqueueOrderConfirmation,
  enqueueNotification,
};
