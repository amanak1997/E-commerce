const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId:              { type: mongoose.Schema.Types.ObjectId, required: true },
  userId:               { type: mongoose.Schema.Types.ObjectId, required: true },
  stripePaymentIntentId:{ type: String, required: true, unique: true },
  stripeCustomerId:     { type: String },
  amount:               { type: Number, required: true },   // in cents
  currency:             { type: String, default: 'usd' },
  status:               {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'],
    default: 'pending',
  },
  paymentMethod:        { type: String },  // card, etc.
  last4:                { type: String },
  brand:                { type: String },
  refundId:             { type: String },
  refundAmount:         { type: Number },
  refundedAt:           { type: Date },
  failureMessage:       { type: String },
  metadata:             { type: Object },
}, { timestamps: true });

paymentSchema.index({ stripePaymentIntentId: 1 }, { unique: true });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
