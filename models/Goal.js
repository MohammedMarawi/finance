const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: [true, 'Goal name is required'],
    trim: true,
    maxlength: [100, 'Goal name cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  targetAmount: { 
    type: Number, 
    required: [true, 'Target amount is required'],
    min: [1, 'Target amount must be greater than 0']
  },
  savedAmount: { 
    type: Number, 
    default: 0,
    min: [0, 'Saved amount cannot be negative']
  },
  dueDate: { 
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  categoryIcon: { 
    type: String, 
    default: 'car',
    enum: ['car', 'house', 'vacation', 'education', 'emergency', 'gift']
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true
});

goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ user: 1, dueDate: 1 });

goalSchema.virtual('progressPercentage').get(function() {
  if (this.targetAmount <= 0) return 0;
  return Math.min(100, Math.round((this.savedAmount / this.targetAmount) * 100));
});

goalSchema.virtual('remainingAmount').get(function() {
  return Math.max(0, this.targetAmount - this.savedAmount);
});

goalSchema.virtual('isCompleted').get(function() {
  return this.savedAmount >= this.targetAmount;
});

goalSchema.set('toJSON', { virtuals: true });
goalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Goal', goalSchema);
