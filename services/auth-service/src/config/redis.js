const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

function getRedis() {
  if (redisClient) return redisClient;

  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

  redisClient.on('connect', () => logger.info('Redis connected (auth-service)'));
  redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));

  return redisClient;
}

module.exports = { getRedis };
