const express = require('express');
const transactionController = require('../controllers/transactionController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(transactionController.getAllTransactions)   
  .post(transactionController.createTransaction);  

router.get('/summary', transactionController.getTransactionsSummary); 
router.get('/trend', transactionController.getTransactionsTrend);  

router
  .route('/:id')
  .get(transactionController.getTransaction)       
  .patch(transactionController.updateTransaction)  
  .delete(transactionController.deleteTransaction);

module.exports = router;
