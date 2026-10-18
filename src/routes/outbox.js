const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');
const outboxService = require('../services/outboxService');

// GET /api/outbox/stats - Summary metrics and recent jobs
router.get('/stats', (req, res) => {
  const db = getDatabase();
  const counts = outboxService.getQueueStats(db);

  const recentJobs = db.prepare(`
    SELECT * FROM outbox_jobs
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  res.json({
    counts,
    recentJobs
  });
});

// POST /api/outbox/process - Manually trigger processing of next pending job
router.post('/process', (req, res) => {
  const db = getDatabase();
  const result = outboxService.processNextJob(db);
  res.json({
    processed: result !== null,
    details: result
  });
});

module.exports = router;
