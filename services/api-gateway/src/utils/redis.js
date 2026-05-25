const Redis = require('ioredis');
const logger = require('./logger');

let client = null;

function getRedisClient() {
  if (client) return client;

  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    reconnectOnError: (err) => {
      logger.error(`Redis reconnect error: ${err.message}`);
      return true;
    },
  });

  client.on('connect', () => logger.info('Redis connected (api-gateway)'));
  client.on('error', (err) => logger.error(`Redis error: ${err.message}`));

  return client;
}

module.exports = { getRedisClient };
