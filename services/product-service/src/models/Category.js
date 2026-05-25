const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, unique: true },
  slug:        { type: String, required: true, unique: true },
  description: { type: String, trim: true },
  image:       { type: String },
  parent:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive:    { type: Boolean, default: true },
  sortOrder:   { type: Number, default: 0 },
}, { timestamps: true });

// slug unique index is already created by { unique: true } on the field
categorySchema.index({ parent: 1 });

module.exports = mongoose.model('Category', categorySchema);
