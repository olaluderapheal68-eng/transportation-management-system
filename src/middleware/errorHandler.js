const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "An internal server error occurred."
        : err.message,
  });
};

module.exports = errorHandler;