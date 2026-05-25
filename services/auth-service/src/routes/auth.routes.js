const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const ctrl = require('../controllers/auth.controller');

// ─── Validation Middleware ────────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.headers['x-user-id']) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.headers['x-user-role'] !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post('/register',
  [
    body('firstName').trim().notEmpty().isLength({ max: 50 }),
    body('lastName').trim().notEmpty().isLength({ max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  ctrl.register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  ctrl.login
);

router.post('/refresh',
  [body('refreshToken').notEmpty()],
  validate,
  ctrl.refreshToken
);

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.post('/logout', requireAuth, ctrl.logout);
router.get('/me', requireAuth, ctrl.getProfile);
router.patch('/me', requireAuth, ctrl.updateProfile);
router.patch('/me/password',
  requireAuth,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  validate,
  ctrl.changePassword
);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, ctrl.listUsers);

module.exports = router;
