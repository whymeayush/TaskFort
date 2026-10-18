export function errorHandler(err, req, res, next) {
  // Workflow state machine validation errors
  if (err.name === 'WorkflowValidationError') {
    return res.status(err.statusCode || 400).json({
      error: err.code || 'VALIDATION_ERROR',
      code: err.code || 'VALIDATION_ERROR',
      message: err.message
    });
  }

  // Concurrency conflict errors (including MongoDB transaction write conflicts)
  if (
    err.code === 'CONCURRENCY_CONFLICT' ||
    (err.hasErrorLabel && err.hasErrorLabel('TransientTransactionError')) ||
    (err.message && err.message.includes('WriteConflict'))
  ) {
    return res.status(409).json({
      error: 'CONCURRENCY_CONFLICT',
      code: 'CONCURRENCY_CONFLICT',
      message: err.message || 'Concurrent conflict: another user modified or claimed this record.',
      serverVersion: err.serverVersion,
      serverItem: err.serverItem
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: messages.join(', ')
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error: 'DUPLICATE_KEY_ERROR',
      message: `A record with this ${field} already exists.`
    });
  }

  // JSON Web Token errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'UNAUTHENTICATED',
      message: 'Invalid or expired authentication credentials'
    });
  }

  console.error('[Error] Unhandled error:', err);

  res.status(err.status || 500).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected internal error occurred'
  });
}
