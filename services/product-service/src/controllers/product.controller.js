const Product = require('../models/Product');
const Category = require('../models/Category');
const { cacheGet, cacheSet, cacheInvalidate, TTL } = require('../config/redis');
const { pool } = require('../utils/workerPool');
const slugify = require('slugify');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// ─── Products ─────────────────────────────────────────────────────────────────

exports.listProducts = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      category, minPrice, maxPrice, search,
      sort = 'createdAt', order = 'desc',
      featured, inStock,
    } = req.query;

    // Build cache key from query params
    const cacheKey = `products:list:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, cached: true, data: cached });

    const query = { isActive: true };
    if (category)  query.category = category;
    if (featured)  query.isFeatured = featured === 'true';
    if (inStock)   query.stock = { $gt: 0 };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = +minPrice;
      if (maxPrice) query.price.$lte = +maxPrice;
    }
    if (search) {
      query.$text = { $search: search };
    }

    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(+limit)
        .populate('category', 'name slug')
        .select('-reviews -costPrice'),
      Product.countDocuments(query),
    ]);

    const data = {
      products,
      total,
      page: +page,
      pages: Math.ceil(total / limit),
      limit: +limit,
    };

    await cacheSet(cacheKey, data, TTL.LIST);
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`listProducts: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { identifier } = req.params; // id or slug
    const cacheKey = `products:single:${identifier}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, cached: true, data: { product: cached } });

    const query = identifier.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: identifier }
      : { slug: identifier };

    const product = await Product.findOne({ ...query, isActive: true })
      .populate('category', 'name slug');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Increment view count (fire-and-forget)
    Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } }).exec();

    await cacheSet(cacheKey, product, TTL.PRODUCT);
    res.json({ success: true, data: { product } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const role = req.headers['x-user-role'];
    if (!['admin', 'seller'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const body = req.body;
    const slug = slugify(body.name, { lower: true, strict: true });

    // Check slug uniqueness
    const exists = await Product.findOne({ slug });
    const finalSlug = exists ? `${slug}-${Date.now()}` : slug;

    const product = await Product.create({ ...body, slug: finalSlug });

    await cacheInvalidate(['products:list:*', 'products:featured:*']);

    logger.info(`Product created: ${product._id} (${product.name})`);
    res.status(201).json({ success: true, data: { product } });
  } catch (err) {
    logger.error(`createProduct: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const role = req.headers['x-user-role'];
    if (!['admin', 'seller'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await cacheInvalidate([
      `products:single:${req.params.id}`,
      `products:single:${product.slug}`,
      'products:list:*',
    ]);

    res.json({ success: true, data: { product } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await cacheInvalidate([`products:single:*`, 'products:list:*']);

    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Image Upload with Worker Thread ─────────────────────────────────────────
exports.uploadImages = async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Process all images in parallel using Worker Thread pool
    const processedImages = await Promise.all(
      req.files.map(async (file, idx) => {
        const filename = `${productId}_${Date.now()}_${idx}`;
        const outputDir = path.join(UPLOAD_DIR, productId);

        fs.mkdirSync(outputDir, { recursive: true });

        const sizes = await pool.run({
          inputPath: file.path,
          outputDir,
          filename,
        });

        return {
          url: `/uploads/${productId}/${sizes.medium}`,
          thumbnail: `/uploads/${productId}/${sizes.thumbnail}`,
          large: `/uploads/${productId}/${sizes.large}`,
          alt: product.name,
          isPrimary: idx === 0 && product.images.length === 0,
        };
      })
    );

    product.images.push(...processedImages);
    await product.save();

    await cacheInvalidate([`products:single:${productId}`, `products:single:${product.slug}`]);

    logger.info(`Uploaded ${processedImages.length} images for product ${productId} via Worker Thread`);
    res.json({ success: true, data: { images: processedImages } });
  } catch (err) {
    logger.error(`uploadImages: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Reviews ──────────────────────────────────────────────────────────────────
exports.addReview = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, message: 'Login required' });

    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const existing = product.reviews.find((r) => r.user.toString() === userId);
    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
    } else {
      product.reviews.push({ user: userId, name: req.headers['x-user-name'] || 'User', rating, comment });
    }

    product.updateRating();
    await product.save();

    await cacheInvalidate([`products:single:${product._id}`, `products:single:${product.slug}`]);

    res.json({ success: true, data: { rating: product.rating, reviewCount: product.reviewCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Categories ───────────────────────────────────────────────────────────────
exports.listCategories = async (req, res) => {
  try {
    const cached = await cacheGet('categories:all');
    if (cached) return res.json({ success: true, cached: true, data: { categories: cached } });

    const categories = await Category.find({ isActive: true })
      .populate('parent', 'name slug')
      .sort({ sortOrder: 1, name: 1 });

    await cacheSet('categories:all', categories, TTL.CATEGORY);
    res.json({ success: true, data: { categories } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    if (req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { name, description, image, parent, sortOrder } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const category = await Category.create({ name, slug, description, image, parent, sortOrder });
    await cacheInvalidate(['categories:*']);
    res.status(201).json({ success: true, data: { category } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Inventory (Admin) ────────────────────────────────────────────────────────
exports.updateStock = async (req, res) => {
  try {
    if (!['admin', 'seller'].includes(req.headers['x-user-role'])) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { delta } = req.body; // positive = restock, negative = deduct
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { stock: delta } },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await cacheInvalidate([`products:single:${req.params.id}`]);
    res.json({ success: true, data: { stock: product.stock } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Featured & Stats ─────────────────────────────────────────────────────────
exports.getFeatured = async (req, res) => {
  try {
    const cacheKey = 'products:featured';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, cached: true, data: { products: cached } });

    const products = await Product.find({ isActive: true, isFeatured: true })
      .limit(12)
      .populate('category', 'name slug')
      .select('-reviews -costPrice');

    await cacheSet(cacheKey, products, TTL.FEATURED);
    res.json({ success: true, data: { products } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    if (req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const [total, active, lowStock, categories] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ stock: { $lte: 5 }, isActive: true }),
      Category.countDocuments({ isActive: true }),
    ]);

    res.json({ success: true, data: { total, active, lowStock, categories } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
