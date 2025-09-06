const Budget = require('../models/Budget');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createBudget = catchAsync(async (req, res, next) => {
  const { month, amount } = req.body;
  const userId = req.user && (req.user.id || req.user._id);

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return next(new AppError('Month must be in YYYY-MM format (e.g., 2025-04)', 400));
  }

  if (!amount || amount <= 0) {
    return next(new AppError('Budget amount must be greater than zero', 400));
  }

  const budget = await Budget.findOneAndUpdate(
    { user: userId, month },
    { amount },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json({
    status: 'success',
    message: 'Budget created/updated successfully',
    data: { budget }
  });
});

exports.getUserBudgets = catchAsync(async (req, res, next) => {
  const userId = req.user && (req.user.id || req.user._id);
  const { month } = req.query;

  const filter = { user: userId };
  if (month) filter.month = month;

  const budgets = await Budget.find(filter).sort({ month: -1 });

  res.status(200).json({
    status: 'success',
    results: budgets.length,
    data: { budgets }
  });
});

exports.getBudget = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user && (req.user.id || req.user._id);

  const budget = await Budget.findOne({ _id: id, user: userId });

  if (!budget) {
    return next(new AppError('Budget not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { budget }
  });
});

exports.updateBudget = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user && (req.user.id || req.user._id);
  const updates = req.body;

  if (updates.amount && updates.amount <= 0) {
    return next(new AppError('Budget amount must be greater than zero', 400));
  }

  const budget = await Budget.findOneAndUpdate(
    { _id: id, user: userId },
    updates,
    { new: true, runValidators: true }
  );

  if (!budget) {
    return next(new AppError('No budget found with that ID for this user', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { budget }
  });
});

exports.deleteBudget = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user && (req.user.id || req.user._id);

  const budget = await Budget.findOneAndDelete({ _id: id, user: userId });

  if (!budget) {
    return next(new AppError('Budget not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getCurrentMonthBudget = catchAsync(async (req, res, next) => {
  const userId = req.user && (req.user.id || req.user._id);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const budget = await Budget.findOne({ user: userId, month: currentMonth });

  res.status(200).json({
    status: 'success',
    data: { budget }
  });
});
