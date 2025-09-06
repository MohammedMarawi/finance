require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/usersModel');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const Category = require('../models/Category');

(async () => {
  try {
    await connectDB();

    const email =  'mohammedmarawi2@gmail.com';
    const password =  '1234abcd';

    if (process.argv.includes('--purge')) {
      const u = await User.findOne({ email });
      if (u) {
        await Transaction.deleteMany({ user: u._id });
        await Budget.deleteMany({ user: u._id });
        await Goal.deleteMany({ user: u._id });
      }
      await mongoose.connection.close();
      process.exit(0);
    }

    if (process.argv.includes('--purge-all')) {
      const u = await User.findOne({ email });
      if (u) {
        await Transaction.deleteMany({ user: u._id });
        await Budget.deleteMany({ user: u._id });
        await Goal.deleteMany({ user: u._id });
        await User.deleteOne({ _id: u._id });
      }
      await Category.deleteMany();
      await mongoose.connection.close();
      process.exit(0);
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: 'MOHAMMED MARAWI',
        email,
        password,
        passwordConfirm: password
      });
    } 

    const categoriesData = [
      { name: 'Salary', type: 'income'},
      { name: 'Savings', type: 'income', isSavings: true },
      { name: 'Groceries', type: 'expense'},
      { name: 'Rent', type: 'expense'},
      { name: 'Transport', type: 'expense'},
      { name: 'Food', type: 'expense'}
    ];

    const categories = {};
    for (const cat of categoriesData) {
      const c = await Category.findOneAndUpdate(
        { name: cat.name, type: cat.type },
        cat,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      categories[cat.name] = c; 
    }

    const now = new Date();
    const year = now.getFullYear();
    const april = 3; 
    const march = 2; 

    const docs = [
      { user: user._id, type: 'income', category: categories['Salary']._id, amount: 4000, note: 'April salary', date: new Date(year, april, 30, 18, 27) },
      { user: user._id, type: 'income', category: categories['Savings']._id, amount: 1000, note: 'April savings deposit', date: new Date(year, april, 25, 12, 0) },
      { user: user._id, type: 'expense', category: categories['Groceries']._id, amount: 100, note: 'Pantry', date: new Date(year, april, 24, 17, 0) },
      { user: user._id, type: 'expense', category: categories['Rent']._id, amount: 674.4, note: 'April 15', date: new Date(year, april, 15, 8, 30) },
      { user: user._id, type: 'expense', category: categories['Transport']._id, amount: 4.13, note: 'Fuel', date: new Date(year, april, 8, 9, 30) },
      { user: user._id, type: 'expense', category: categories['Food']._id, amount: 70.4, note: 'Dinner', date: new Date(year, march, 31, 19, 30) }
    ];

    const ops = [];
    for (const d of docs) {
      ops.push(
        Transaction.findOneAndUpdate(
          { user: d.user, date: d.date, amount: d.amount, category: d.category, type: d.type },
          d,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      );
    }
    await Promise.all(ops);

    const currentMonth = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await Budget.findOneAndUpdate(
      { user: user._id, month: currentMonth },
      { amount: 20000 },
      { upsert: true, new: true }
    );

    const goal = await Goal.create({
      user: user._id,
      name: 'Car Down Payment',
      description: 'Saving for a new car down payment',
      targetAmount: 15000,
      savedAmount: 5000,
      categoryIcon: 'car',
      priority: 'high',
      dueDate: new Date(year + 1, 0, 1)
    });

    const savingsTx = await Transaction.findOne({ user: user._id, category: categories['Savings']._id });
    if (savingsTx) {
      const activeGoals = await Goal.find({ user: user._id, status: 'active' });
      if (activeGoals.length > 0) {
        const amountPerGoal = savingsTx.amount / activeGoals.length;
        for (const g of activeGoals) {
          g.savedAmount += amountPerGoal;
          if (g.savedAmount >= g.targetAmount) g.status = 'completed';
          await g.save();
        }
      }
    }

    console.log('Seed completed');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
})();
