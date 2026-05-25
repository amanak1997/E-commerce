const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../utils/redis');

/**
 * JWT authentication middleware for the API Gateway.
 * Validates token, checks Redis blacklist, then forwards user info as headers.
 */
module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    // Verify signature & expiry
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(401).json({ success: false, message: msg });
    }

    // Check blacklist (logout / token revocation)
    const redis = getRedisClient();
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ success: false, message: 'Token has been revoked' });
    }

    // Forward user context to downstream services via headers
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;

    next();
  } catch (err) {
    next(err);
  }
};
