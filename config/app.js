const express = require('express');
const errorHandler = require('../middleware/errorHandler');
const AppError = require('../utils/appError');
const morgan = require('morgan');
const cors = require('cors');
const routes = require('../routes');

const configureApp = (app) => {
  app.use(express.json());

  app.use(
    cors({
      origin: '*',
    })
  );
  
  app.use('/api', routes);
   
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }


  app.all('/{*any}', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
  });

  app.use(errorHandler);
};

module.exports = configureApp;