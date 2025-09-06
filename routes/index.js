const express = require('express');
const userRoutes = require('./userRoutes')
const transactionRoutes = require('./transactionRoutes')
const budgetRoutes = require('./budgetRoutes')
const goalRoutes = require('./goalRoutes')
const categoryRoutes = require('./categoryRoutes');


const router = express.Router();

router.use('/categories', categoryRoutes);
router.use('/users' , userRoutes)
router.use('/transactions' , transactionRoutes)
router.use('/budgets', budgetRoutes)
router.use('/goals', goalRoutes)

module.exports = router;
