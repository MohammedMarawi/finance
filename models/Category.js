const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Category type is required']
  },
  icon: {
    type: String,
    default: 'default-icon'
  },
  isSavings: {
    type: Boolean,
    default: false 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
