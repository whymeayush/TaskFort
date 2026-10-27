import express from 'express';
import eventStream from '../services/eventStream.js';

const router = express.Router();

// GET /api/events - Real-time Server-Sent Events stream
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering

  // Flush headers
  res.flushHeaders?.();

  eventStream.addClient(res);
});

export default router;
