const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, required: true },
  name:         { type: String, required: true },
  slug:         { type: String },
  image:        { type: String },
  price:        { type: Number, required: true },
  quantity:     { type: Number, required: true, min: 1 },
  variant:      { type: Object },  // { name, value }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  firstName: String,
  lastName:  String,
  street:    String,
  city:      String,
  state:     String,
  zipCode:   String,
  country:   String,
  phone:     String,
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status:    String,
  message:   String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const ORDER_STATUSES = [
  'pending',        // just placed
  'confirmed',      // payment confirmed
  'processing',     // being prepared
  'shipped',        // handed to carrier
  'delivered',      // delivered to customer
  'cancelled',      // cancelled before shipping
  'refunded',       // refunded
  'failed',         // payment failed
];

const orderSchema = new mongoose.Schema({
  orderNumber:    { type: String, unique: true },
  user:           { type: mongoose.Schema.Types.ObjectId, required: true },
  items:          [orderItemSchema],
  shippingAddress: addressSchema,
  billingAddress:  addressSchema,

  // Pricing
  subtotal:    { type: Number, required: true },
  shippingCost:{ type: Number, default: 0 },
  tax:         { type: Number, default: 0 },
  discount:    { type: Number, default: 0 },
  total:       { type: Number, required: true },
  currency:    { type: String, default: 'usd' },

  // Payment
  paymentMethod:    { type: String, enum: ['stripe', 'cod'], default: 'stripe' },
  paymentIntentId:  { type: String },
  paymentStatus:    { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paidAt:           { type: Date },

  // Status
  status:         { type: String, enum: ORDER_STATUSES, default: 'pending' },
  statusHistory:  [statusHistorySchema],

  // Shipping
  trackingNumber: { type: String },
  carrier:        { type: String },
  shippedAt:      { type: Date },
  deliveredAt:    { type: Date },
  estimatedDelivery: { type: Date },

  // BullMQ job tracking
  processingJobId: { type: String },

  notes:   { type: String },
  coupon:  { type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// ─── Virtuals ──────────────────────────────────────────────────────────────────
orderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, i) => sum + i.quantity, 0);
});

// ─── Pre-save: generate order number ──────────────────────────────────────────
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  next();
});

// ─── Methods ──────────────────────────────────────────────────────────────────
orderSchema.methods.addStatus = function (status, message = '') {
  this.status = status;
  this.statusHistory.push({ status, message });
};

// ─── Indexes ──────────────────────────────────────────────────────────────────
// orderNumber unique index is already created by { unique: true } on the field
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentIntentId: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
