const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../utils/redis');

/**
 * Factory — returns a rate limiter middleware backed by Redis.
 */
module.exports = function rateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 100,
  keyPrefix = 'rl',
  message = 'Too many requests, please slow down.',
} = {}) {
  const client = getRedisClient();

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
    store: new RedisStore({
      sendCommand: (...args) => client.call(...args),
      prefix: keyPrefix + ':',
    }),
    keyGenerator: (req) =>
      req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip,
  });
};
