const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const userControllers = require('../controllers/userController');


router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout' , authController.logout) ; 
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);


router
  .route('/')
  .get(userControllers.getAllUsers)
  .post(userControllers.createUser);

router
  .route('/:id')
  .get(userControllers.getUser)
  .patch(userControllers.updateUser)
  .delete(userControllers.deleteUser);

module.exports = router;
