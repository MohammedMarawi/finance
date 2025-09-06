const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  category: {
    type: mongoose.Schema.ObjectId,  
    ref: 'Category',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  note: String,
  date: {
        type: Date,
        required: true,
        default: Date.now
      }
      
});

transactionSchema.pre(/^find/, function (next) {
  this.populate('category', 'name type icon');
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
