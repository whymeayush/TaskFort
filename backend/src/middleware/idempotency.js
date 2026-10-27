import { IdempotencyKey } from '../models/IdempotencyKey.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function idempotencyMiddleware(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return next();
  }

  let userId = req.user ? req.user._id : null;
  if (!userId && req.headers['x-user-id']) {
    userId = req.headers['x-user-id'];
  }
  if (!userId && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, config.JWT_SECRET);
      userId = decoded.userId;
    } catch (e) {}
  }
  if (!userId) {
    return next();
  }

  IdempotencyKey.findOne({ key: idempotencyKey, userId })
    .then((cached) => {
      if (cached) {
        res.setHeader('X-Cache', 'HIT-IDEMPOTENT');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        res.setHeader('Content-Type', 'application/json');
        return res.status(cached.responseStatus).json(cached.responseBody);
      }

      // Intercept send to cache on success
      const originalSend = res.send.bind(res);

      res.send = function (body) {
        // Cache only successful mutations (200-299)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;
            IdempotencyKey.create({
              key: idempotencyKey,
              userId,
              requestPath: req.originalUrl || req.url,
              requestMethod: req.method,
              responseStatus: res.statusCode,
              responseBody: bodyObj
            }).catch(() => {});
            res.setHeader('X-Cache', 'MISS-STORED');
          } catch (e) {}
        }
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        return originalSend(body);
      };

      next();
    })
    .catch((err) => {
      next(err);
    });
}
