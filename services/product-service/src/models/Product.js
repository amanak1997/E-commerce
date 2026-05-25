const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name:   { type: String, required: true },   // e.g. "Color", "Size"
  value:  { type: String, required: true },   // e.g. "Red", "XL"
  price:  { type: Number },                   // optional price override
  stock:  { type: Number, default: 0 },
  sku:    { type: String },
}, { _id: true });

const reviewSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, required: true },
  name:    { type: String, required: true },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 200 },
  slug:        { type: String, required: true, unique: true },
  description: { type: String, required: true, maxlength: 5000 },
  shortDesc:   { type: String, maxlength: 500 },
  price:       { type: Number, required: true, min: 0 },
  comparePrice:{ type: Number, min: 0 },          // original price for "sale" display
  costPrice:   { type: Number, min: 0, select: false }, // internal
  sku:         { type: String, unique: true, sparse: true },
  barcode:     { type: String },
  stock:       { type: Number, default: 0, min: 0 },
  lowStockAlert: { type: Number, default: 5 },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  tags:        [{ type: String, trim: true, lowercase: true }],
  images:      [{ url: String, alt: String, isPrimary: Boolean }],
  variants:    [variantSchema],
  reviews:     [reviewSchema],
  rating:      { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  isFeatured:  { type: Boolean, default: false },
  weight:      { type: Number },     // kg
  dimensions:  {
    length: Number,
    width:  Number,
    height: Number,
  },
  seller:      { type: mongoose.Schema.Types.ObjectId },  // optional seller ref
  soldCount:   { type: Number, default: 0 },
  viewCount:   { type: Number, default: 0 },
  metaTitle:   { type: String },
  metaDesc:    { type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Virtuals ──────────────────────────────────────────────────────────────────
productSchema.virtual('isOnSale').get(function () {
  return this.comparePrice && this.comparePrice > this.price;
});

productSchema.virtual('discountPct').get(function () {
  if (!this.comparePrice || this.comparePrice <= this.price) return 0;
  return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
});

productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
// slug unique index is already created by { unique: true } on the field
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ price: 1 });

// ─── Methods ──────────────────────────────────────────────────────────────────
productSchema.methods.updateRating = function () {
  if (!this.reviews.length) {
    this.rating = 0;
    this.reviewCount = 0;
    return;
  }
  const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
  this.rating = Math.round((total / this.reviews.length) * 10) / 10;
  this.reviewCount = this.reviews.length;
};

module.exports = mongoose.model('Product', productSchema);
