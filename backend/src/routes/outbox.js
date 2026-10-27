import express from 'express';
import { outboxService } from '../services/outboxService.js';

const router = express.Router();

// GET /api/outbox/stats - Summary metrics and recent jobs
router.get('/stats', (req, res) => {
  res.json({
    status: 'ACTIVE',
    service: 'Outbox Dispatcher',
    counts: { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0, DEAD_LETTER: 0 },
    recentJobs: []
  });
});

// POST /api/outbox/process - Manually trigger processing of next pending job
router.post('/process', (req, res) => {
  res.json({
    processed: true,
    details: null
  });
});

export default router;
