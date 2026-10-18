const { getDatabase } = require('../db/database');

/**
 * Idempotency Middleware: Prevents accidental duplicate operations
 * by caching and returning identical responses for repeated Idempotency-Key headers
 */
function idempotencyMiddleware(req, res, next) {
  // Only apply to mutating requests
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return next();
  }

  const db = getDatabase();
  const userId = req.user ? req.user.id : 'anonymous';

  // Check if this key was already processed for this user
  const existingRecord = db.prepare(`
    SELECT * FROM idempotency_keys WHERE key = ? AND user_id = ?
  `).get(idempotencyKey, userId);

  if (existingRecord) {
    res.setHeader('X-Cache', 'HIT-IDEMPOTENT');
    res.setHeader('X-Idempotency-Key', idempotencyKey);
    res.setHeader('Content-Type', 'application/json');
    return res.status(existingRecord.response_status).send(existingRecord.response_body);
  }

  // Intercept response to cache it on completion
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.send = function (body) {
    // Only cache successful mutations (status 200..299)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        db.prepare(`
          INSERT INTO idempotency_keys (
            key, user_id, request_path, request_method, response_status, response_body, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          idempotencyKey,
          userId,
          req.originalUrl || req.url,
          req.method,
          res.statusCode,
          bodyStr
        );
      } catch (err) {
        // If unique constraint violation race happens, ignore
      }
      res.setHeader('X-Cache', 'MISS-STORED');
    }
    res.setHeader('X-Idempotency-Key', idempotencyKey);
    return originalSend(body);
  };

  res.json = function (jsonObj) {
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(jsonObj));
  };

  next();
}

module.exports = { idempotencyMiddleware };
