const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const Category = require("../models/Category");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { resolveDateRange } = require('../utils/dateUtils');
const mongoose = require("mongoose");

exports.createTransaction = catchAsync(async (req, res, next) => {
  const { type, category, amount, note, icon } = req.body;
  const userId = req.user && (req.user.id || req.user._id);
  
  if (!["income", "expense"].includes(type)) {
    return next(
      new AppError("Invalid transaction type. Must be 'income' or 'expense'.", 400)
    );
  }

  if (!amount || amount <= 0) {
    return next(new AppError("Transaction amount must be greater than zero.", 400));
  }

  let categoryDoc = null;
  if (mongoose.Types.ObjectId.isValid(category)) {
    categoryDoc = await Category.findById(category);
  }

  if (!categoryDoc) {
    categoryDoc = await Category.findOne({
      name: { $regex: new RegExp(`^${category}$`, "i") }
    });
  }

  if (!categoryDoc) {
    categoryDoc = await Category.create({
      name: category,
      type,      
      icon: icon || "default-icon"
    });
  }

  const transaction = await Transaction.create({
    user: userId,
    type,
    category: categoryDoc._id,
    amount,
    note
  });

  if (categoryDoc.isSavings && type === "income") {
    try {
      const activeGoals = await Goal.find({ user: userId, status: "active" });
      if (activeGoals.length > 0) {
        const amountPerGoal = amount / activeGoals.length;
        for (const goal of activeGoals) {
          goal.savedAmount += amountPerGoal;
          if (goal.savedAmount >= goal.targetAmount) {
            goal.status = "completed";
          }
          await goal.save();
        }
      }
    } catch (error) {
      console.log("Error updating goals:", error.message);
    }
  }

  res.status(201).json({
    status: "success",
    message: "Transaction created successfully",
    data: { transaction }
  });
});

exports.getAllTransactions = catchAsync(async (req, res, next) => {
  const userId = req.user && (req.user.id || req.user._id);
  const { type, category, page = 1, limit = 10, sort = "-date" } = req.query;

  const filter = { user: userId };
  if (type) filter.type = type;
  if (category) filter.category = category;

  const skip = (Number(page) - 1) * Number(limit);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Transaction.countDocuments(filter)
  ]);

  res.status(200).json({
    status: "success",
    results: transactions.length,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    },
    data: { transactions }
  });
});

exports.getTransaction = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user && (req.user.id || req.user._id);
  const transaction = await Transaction.findOne({ _id: id, user: userId });

  if (!transaction) {
    return next(new AppError("Transaction not found.", 404));
  }

  res.status(200).json({
    status: "success",
    data: { transaction }
  });
});

exports.updateTransaction = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user && (req.user.id || req.user._id);
  const updates = { ...req.body };

  if (updates.type && !["income", "expense"].includes(updates.type)) {
    return next(new AppError("Invalid transaction type. Must be 'income' or 'expense'.", 400));
  }

  if (Object.prototype.hasOwnProperty.call(updates, "amount") && updates.amount <= 0) {
    return next(new AppError("Transaction amount must be greater than zero.", 400));
  }

  if (updates.category) {
    let categoryDoc = null;

    if (mongoose.Types.ObjectId.isValid(updates.category)) {
      categoryDoc = await Category.findById(updates.category);
    }

    if (!categoryDoc) {
      categoryDoc = await Category.findOne({ name: { $regex: new RegExp(`^${updates.category}$`, "i") } });
    }

    if (!categoryDoc) {
      categoryDoc = await Category.create({
        name: updates.category,
        type: updates.type || "expense", 
      });
    }

    updates.category = categoryDoc._id;
  }

  const transaction = await Transaction.findOneAndUpdate(
    { _id: id, user: userId },
    updates,
    { new: true, runValidators: true }
  );

  if (!transaction) {
    return next(new AppError("Transaction not found.", 404));
  }

  const categoryDoc = await Category.findById(transaction.category);
  if (categoryDoc.isSavings && transaction.type === "income") {
    const activeGoals = await Goal.find({ user: userId, status: "active" });
    if (activeGoals.length > 0) {
      const amountPerGoal = transaction.amount / activeGoals.length;
      for (const goal of activeGoals) {
        goal.savedAmount += amountPerGoal;
        if (goal.savedAmount >= goal.targetAmount) goal.status = "completed";
        await goal.save();
      }
    }
  }

  res.status(200).json({
    status: "success",
    data: { transaction }
  });
});

exports.deleteTransaction = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user && (req.user.id || req.user._id);

  const transaction = await Transaction.findOneAndDelete({ _id: id, user: userId });

  if (!transaction) {
    return next(new AppError("Transaction not found.", 404));
  }

  res.status(204).json({
    status: "success",
    data: null
  });
});

exports.getTransactionsSummary = catchAsync(async (req, res, next) => {
  const userId = req.user && (req.user.id || req.user._id);
  const { dateFrom, dateTo } = req.query;

  const match = { user: new mongoose.Types.ObjectId(userId) };
  if (dateFrom || dateTo) {
    match.date = {};
    if (dateFrom) match.date.$gte = new Date(dateFrom);
    if (dateTo) match.date.$lt = new Date(dateTo);
  }

  const summary = await Transaction.aggregate([
    { $addFields: { typeLower: { $toLower: "$type" } } },
    { $match: match },
    {
      $group: {
        _id: "$typeLower",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const row of summary) {
    if (row._id === "income") {
      totalIncome = row.totalAmount;
      incomeCount = row.count;
    } else if (row._id === "expense") {
      totalExpense = row.totalAmount;
      expenseCount = row.count;
    }
  }

  const balance = totalIncome - totalExpense;

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let budgetAmount = null;
  let progressPercent = null;

  const budget = await Budget.findOne({ user: new mongoose.Types.ObjectId(userId), month: monthStr });
  if (budget) {
    budgetAmount = budget.amount;
    progressPercent = Math.min(100, Math.round((totalExpense / budget.amount) * 100));
  }

  res.status(200).json({
    status: "success",
    data: {
      totalIncome,
      totalExpense,
      balance,
      counts: { income: incomeCount, expense: expenseCount },
      budget: budgetAmount,
      progressPercent
    }
  });
});

exports.getTransactionsTrend = catchAsync(async (req, res, next) => {
  const { period, dateFrom, dateTo, category } = req.query;
  const userId = req.user && (req.user.id || req.user._id);

  const { start, end } = resolveDateRange(period, dateFrom, dateTo);

  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const match = { user: userObjectId };

  if (start || end) {
    match.date = {};
    if (start) match.date.$gte = start;
    if (end) match.date.$lt = end;
  }

  if (category) {
      match.category = new mongoose.Types.ObjectId(category);
  }

  let bucketFormat;
  if (period === "daily") bucketFormat = "%Y-%m-%d";
  else if (period === "weekly") bucketFormat = "%G-%V";
  else bucketFormat = "%Y-%m";

  const trend = await Transaction.aggregate([
    { $match: match },
    {
      $project: {
        type: 1,
        amount: 1,
        bucket: { $dateToString: { format: bucketFormat, date: "$date", timezone: "Asia/Damascus" } }
      }
    },
    {
      $group: {
        _id: { bucket: "$bucket", type: { $toLower: "$type" } },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.bucket": 1 } }
  ]);

  res.status(200).json({
    status: "success",
    data: { trend }
  });
});
