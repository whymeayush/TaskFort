const express = require('express');
const router = express.Router();
const eventStream = require('../services/eventStream');

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

module.exports = router;
