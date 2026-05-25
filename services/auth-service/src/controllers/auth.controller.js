const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateRandomToken,
  getTokenTTL,
} = require('../utils/tokens');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');
const crypto = require('crypto');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const issueTokens = (user) => {
  const payload = { userId: user._id, email: user.email, role: user.role };
  return {
    accessToken:  generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

// ─── Register ─────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const user = await User.create({ firstName, lastName, email, password });
    const { accessToken, refreshToken } = issueTokens(user);

    // Store hashed refresh token
    const redis = getRedis();
    await redis.setex(
      `refresh:${user._id}:${hashToken(refreshToken)}`,
      7 * 24 * 3600,
      '1'
    );

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    logger.error(`Register error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }

    const { accessToken, refreshToken } = issueTokens(user);

    // Store hashed refresh token with TTL
    const redis = getRedis();
    await redis.setex(
      `refresh:${user._id}:${hashToken(refreshToken)}`,
      7 * 24 * 3600,
      '1'
    );

    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // Check if token exists in Redis
    const redis = getRedis();
    const key = `refresh:${decoded.userId}:${hashToken(refreshToken)}`;
    const exists = await redis.get(key);
    if (!exists) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    // Rotate — delete old, issue new
    await redis.del(key);
    const tokens = issueTokens(user);
    await redis.setex(
      `refresh:${user._id}:${hashToken(tokens.refreshToken)}`,
      7 * 24 * 3600,
      '1'
    );

    res.json({ success: true, data: tokens });
  } catch (err) {
    logger.error(`Refresh error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Token refresh failed' });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const accessToken = req.headers.authorization?.split(' ')[1];
    const userId = req.headers['x-user-id'];

    const redis = getRedis();

    // Blacklist access token until it naturally expires
    if (accessToken) {
      const ttl = getTokenTTL(accessToken);
      if (ttl > 0) await redis.setex(`blacklist:${accessToken}`, ttl, '1');
    }

    // Revoke refresh token
    if (refreshToken && userId) {
      await redis.del(`refresh:${userId}:${hashToken(refreshToken)}`);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    logger.error(`Logout error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const allowed = ['firstName', 'lastName', 'phone', 'avatar', 'addresses'];
    const updates = {};
    allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    // Invalidate all refresh tokens for this user
    const redis = getRedis();
    const keys = await redis.keys(`refresh:${userId}:*`);
    if (keys.length) await redis.del(...keys);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admin: List Users ────────────────────────────────────────────────────────
exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName:  new RegExp(search, 'i') },
      { email:     new RegExp(search, 'i') },
    ];

    const [users, total] = await Promise.all([
      User.find(query).skip((page - 1) * limit).limit(+limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.json({ success: true, data: { users, total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
