const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleCodeErrorDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0]; 
  
  const message = `Duplicate field value: ${value} Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(', ')}`;
  return new AppError(message, 400);
};

const handleJWTErorr = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpired = () =>
  new AppError('Your token has expired Please log in again', 401);

const sendErrorForDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorForProd = (err, res) => {
    if(err.isOperational){
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });

    } else {
        console.error('ERROR', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
};

const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if(process.env.NODE_ENV === 'development'){
        sendErrorForDev(err, res);
    } else if (process.env.NODE_ENV === 'production'){
        let error = Object.create(err);
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleCodeErrorDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTErorr();
    if (error.name === 'TokenExpiredError') error = handleJWTExpired();
    sendErrorForProd(error, res);
    } 
    
};

module.exports = globalErrorHandler;
