const express = require('express');
const budgetController = require('../controllers/budgetController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.route('/') 
    .post(budgetController.createBudget)
    .get(budgetController.getUserBudgets);

router.get('/current', budgetController.getCurrentMonthBudget);
    
router.route('/:id')
    .get(budgetController.getBudget)
    .patch(budgetController.updateBudget)
    .delete(budgetController.deleteBudget);
    

module.exports = router;
