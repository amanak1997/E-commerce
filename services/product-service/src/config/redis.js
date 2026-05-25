const Redis = require('ioredis');
const logger = require('../utils/logger');

let client = null;

function getRedis() {
  if (client) return client;
  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
  });
  client.on('connect', () => logger.info('Redis connected (product-service)'));
  client.on('error', (e) => logger.error(`Redis: ${e.message}`));
  return client;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
const TTL = {
  PRODUCT:    60 * 10,      // 10 min
  LIST:       60 * 5,       // 5 min
  CATEGORY:   60 * 60,      // 1 hour
  FEATURED:   60 * 15,      // 15 min
};

async function cacheGet(key) {
  const val = await getRedis().get(key);
  return val ? JSON.parse(val) : null;
}

async function cacheSet(key, data, ttl) {
  await getRedis().setex(key, ttl, JSON.stringify(data));
}

async function cacheInvalidate(patterns) {
  const redis = getRedis();
  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  }
}

module.exports = { getRedis, cacheGet, cacheSet, cacheInvalidate, TTL };
