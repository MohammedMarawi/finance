  const Goal = require('../models/Goal');
  const catchAsync = require('../utils/catchAsync');
  const AppError = require('../utils/appError');

exports.createGoal = catchAsync(async (req, res, next) => {

  const { name, description, targetAmount, dueDate, categoryIcon, priority } = req.body;
  const userId = req.user && (req.user.id || req.user._id);

  if (!name || !targetAmount) {
    return next(new AppError('Goal name and target amount are required', 400));
  }

  if (targetAmount <= 0) {
    return next(new AppError('Target amount must be greater than zero', 400));
  }

  const goal = await Goal.create({
    user: userId,
    name,
    description,
    targetAmount,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    categoryIcon: categoryIcon || 'car',
    priority: priority || 'medium'
  });

  res.status(201).json({
    status: 'success',
    message: 'Goal created successfully',
    data: { goal }
  });
});

exports.getUserGoals = catchAsync(async (req, res, next) => {
  const userId = req.user && (req.user.id || req.user._id);
  const { status, priority } = req.query;
  const filter = { user: userId };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  const goals = await Goal.find(filter).sort({ createdAt: -1 });
  res.status(200).json({
    status: 'success',
    results: goals.length,
    data: { goals }
  });
});

exports.getGoal = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user && (req.user.id || req.user._id);
  const goal = await Goal.findOne({ _id: id, user: userId });
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { goal }
  });
});

exports.updateGoal = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user && (req.user.id || req.user._id);
  const updates = req.body;
  if (updates.targetAmount && updates.targetAmount <= 0) {
    return next(new AppError('Target amount must be greater than zero', 400));
  }
  if (updates.savedAmount && updates.savedAmount < 0) {
    return next(new AppError('Saved amount cannot be negative', 400));
  }
  const goal = await Goal.findOneAndUpdate(
    { _id: id, user: userId },
    updates,
    { new: true, runValidators: true }
  );
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { goal }
  });
});

exports.deleteGoal = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user && (req.user.id || req.user._id);
  const goal = await Goal.findOneAndDelete({ _id: id, user: userId });
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.addToGoal = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { amount } = req.body;
  const userId = req.user && (req.user.id || req.user._id);

  if (!amount || amount <= 0) {
    return next(new AppError('Amount must be greater than zero', 400));
  }

  const goal = await Goal.findOne({ _id: id, user: userId });

  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }

  if (goal.status !== 'active') {
    return next(new AppError('Cannot add money to inactive goal', 400));
  }

  const oldSavedAmount = goal.savedAmount;
  goal.savedAmount += amount;

  if (goal.savedAmount >= goal.targetAmount) {
    goal.status = 'completed';
  }

  const savedGoal = await goal.save();

  res.status(200).json({
    status: 'success',
    message: 'Amount added to goal successfully',
    data: { goal: savedGoal }
  });
});

exports.getGoalsStats = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('User not authenticated', 401));
  }
  const userId = req.user._id;
  const goals = await Goal.find({ user: userId });
  if (!goals.length) {
    return res.status(200).json({
      status: 'success',
      data: {
        totalGoals: 0,
        completedGoals: 0,
        totalTargetAmount: 0,
        totalSavedAmount: 0,
        overallProgress: 0,
        breakdown: []
      }
    });
  }
  const stats = await Goal.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalTarget: { $sum: '$targetAmount' },
        totalSaved: { $sum: '$savedAmount' }
      }
    }
  ]);
  let totalGoals = 0;
  let totalTargetAmount = 0;
  let totalSavedAmount = 0;
  let completedGoals = 0;
  stats.forEach(stat => {
    totalGoals += stat.count;
    totalTargetAmount += stat.totalTarget;
    totalSavedAmount += stat.totalSaved;
    if (stat._id === 'completed') completedGoals = stat.count;
  });
  const overallProgress = totalTargetAmount > 0 
    ? Math.round((totalSavedAmount / totalTargetAmount) * 100) 
    : 0;
  res.status(200).json({
    status: 'success',
    data: {
      totalGoals,
      completedGoals,
      totalTargetAmount,
      totalSavedAmount,
      overallProgress,
      breakdown: stats
    }
  });
});


exports.getActiveGoals = catchAsync(async (req, res, next) => {
  const userId = req.user && (req.user.id || req.user._id);
  const goals = await Goal.find({ 
    user: userId, 
    status: 'active' 
  }).sort({ priority: -1, createdAt: -1 });
  
  res.status(200).json({
    status: 'success',
    results: goals.length,
    data: { goals }
  });
});
