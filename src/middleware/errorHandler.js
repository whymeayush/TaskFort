function errorHandler(err, req, res, next) {
  // Handle State Machine Validation Errors
  if (err.name === 'WorkflowValidationError') {
    return res.status(err.statusCode || 400).json({
      error: err.code || 'VALIDATION_ERROR',
      message: err.message
    });
  }

  // Handle Concurrency Conflicts
  if (err.code === 'CONCURRENCY_CONFLICT') {
    return res.status(409).json({
      error: 'CONCURRENCY_CONFLICT',
      message: err.message,
      serverVersion: err.serverVersion,
      serverItem: err.serverItem
    });
  }

  console.error('Unhandled server error:', err);

  res.status(err.status || 500).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected internal error occurred'
  });
}

module.exports = { errorHandler };
