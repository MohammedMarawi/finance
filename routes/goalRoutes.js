const express = require('express');
const goalController = require('../controllers/goalController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.route('/')
  .post(goalController.createGoal)
  .get(goalController.getUserGoals);

router.get('/stats', goalController.getGoalsStats);

router.get('/active', goalController.getActiveGoals);

router.patch('/:id/add', goalController.addToGoal);

router.route('/:id')
  .get(goalController.getGoal)
  .patch(goalController.updateGoal)
  .delete(goalController.deleteGoal);

module.exports = router;
