const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ctrl = require('../controllers/product.controller');

// ─── Multer Config ────────────────────────────────────────────────────────────
const UPLOAD_TEMP = path.join(__dirname, '../../uploads/temp');
fs.mkdirSync(UPLOAD_TEMP, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_TEMP),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024, files: 10 } });

// ─── Products ─────────────────────────────────────────────────────────────────
router.get('/products',           ctrl.listProducts);
router.get('/products/featured',  ctrl.getFeatured);
router.get('/products/:identifier', ctrl.getProduct);
router.post('/products',          ctrl.createProduct);
router.put('/products/:id',       ctrl.updateProduct);
router.patch('/products/:id',     ctrl.updateProduct);
router.delete('/products/:id',    ctrl.deleteProduct);

// Images — Worker Thread processing
router.post('/products/:id/images', upload.array('images', 10), ctrl.uploadImages);

// Reviews
router.post('/products/:id/reviews', ctrl.addReview);

// Inventory
router.patch('/products/:id/stock', ctrl.updateStock);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories',   ctrl.listCategories);
router.post('/categories',  ctrl.createCategory);

// ─── Admin stats ──────────────────────────────────────────────────────────────
router.get('/admin/stats',  ctrl.getAdminStats);

module.exports = router;
