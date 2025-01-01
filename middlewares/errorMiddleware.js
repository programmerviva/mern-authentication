class ErrorHandler extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; // 500 means internal server error.
  err.message = err.message || "Internal Server Error.";

//   console.log(err);
  
  if(err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ErrorHandler(404, message);   
  }

  if(err.name === "JsonWebTokenError") {
    const message = `Resource JsonWebToken not found. Invalid: ${err.path}`;
    err = new ErrorHandler(404, message);   
  }

   if(err.name === "TokenExpiredError") {
    const message = `Resource JsonWebToken Expired. Invalid: ${err.path}`;
    err = new ErrorHandler(404, message);   
  }

  if(err.code === 11000){
    const message = `Duplicate ${Object.keys(err.keyValue)}. Resource already exists.`;
    err = new ErrorHandler(400, message);
  }

  return res.status(err.statusCode).json({
    success: false,
    message: err.message
  })

};

export default ErrorHandler;