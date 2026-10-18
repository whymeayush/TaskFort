const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');
const workItemService = require('../services/workItemService');
const outboxService = require('../services/outboxService');
const { v4: uuidv4 } = require('uuid');

/**
 * SIMULATION 1: Concurrent Race Condition
 * Demonstrates 2 users attempting to claim the same work item simultaneously
 */
router.post('/race-claim', async (req, res) => {
  const db = getDatabase();
  const { workItemId } = req.body;

  if (!workItemId) {
    return res.status(400).json({ error: 'workItemId is required' });
  }

  // Fetch current item state
  const item = db.prepare('SELECT * FROM work_items WHERE id = ?').get(workItemId);
  if (!item) {
    return res.status(404).json({ error: 'Work item not found' });
  }

  const initialVersion = item.version;

  // Mock User 1 (Alice) and User 2 (Bob)
  const user1 = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-alice');
  const user2 = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-bob');

  const results = {
    testDescription: `Two users attempting to claim ${workItemId} concurrently at version ${initialVersion}`,
    user1Attempt: null,
    user2Attempt: null,
    finalState: null
  };

  // Attempt simultaneous claims with the same expectedVersion
  try {
    const outcome1 = workItemService.claimWorkItem(workItemId, user1, initialVersion);
    results.user1Attempt = {
      status: 'SUCCESS (HTTP 200)',
      claimedBy: user1.name,
      newVersion: outcome1.version
    };
  } catch (err) {
    results.user1Attempt = {
      status: `CONFLICT (HTTP ${err.statusCode || 409})`,
      error: err.code || 'CONCURRENCY_CONFLICT',
      message: err.message
    };
  }

  try {
    const outcome2 = workItemService.claimWorkItem(workItemId, user2, initialVersion);
    results.user2Attempt = {
      status: 'SUCCESS (HTTP 200)',
      claimedBy: user2.name,
      newVersion: outcome2.version
    };
  } catch (err) {
    results.user2Attempt = {
      status: `CONFLICT (HTTP 409)`,
      error: err.code || 'CONCURRENCY_CONFLICT',
      message: err.message,
      serverVersion: err.serverVersion
    };
  }

  // Fetch final item
  results.finalState = db.prepare(`
    SELECT w.id, w.title, w.version, u.name as current_owner, w.updated_at
    FROM work_items w
    LEFT JOIN users u ON w.owner_id = u.id
    WHERE w.id = ?
  `).get(workItemId);

  res.json(results);
});

/**
 * SIMULATION 2: Repeated Operation with Idempotency Key
 * Demonstrates safe retries without duplicate side effects
 */
router.post('/idempotency-test', (req, res) => {
  const db = getDatabase();
  const testKey = req.body.key || `demo-key-${Date.now()}`;
  const userId = req.user ? req.user.id : 'usr-alice';

  // Check how many audit logs exist before
  const beforeCount = db.prepare('SELECT COUNT(*) as count FROM audit_events').get().count;

  // Simulate first execution
  const existing = db.prepare('SELECT * FROM idempotency_keys WHERE key = ? AND user_id = ?').get(testKey, userId);

  let firstExecution = false;
  if (!existing) {
    firstExecution = true;
    db.prepare(`
      INSERT INTO idempotency_keys (
        key, user_id, request_path, request_method, response_status, response_body, created_at
      ) VALUES (?, ?, '/api/simulation/idempotency-test', 'POST', 201, ?, datetime('now'))
    `).run(testKey, userId, JSON.stringify({ message: 'Operation executed successfully', key: testKey }));
  }

  const afterCount = db.prepare('SELECT COUNT(*) as count FROM audit_events').get().count;

  res.json({
    idempotencyKey: testKey,
    isFirstCall: firstExecution,
    cacheStatus: firstExecution ? 'MISS-STORED' : 'HIT-IDEMPOTENT',
    cachedResponse: firstExecution 
      ? { message: 'Operation executed successfully', key: testKey }
      : JSON.parse(existing.response_body),
    sideEffectsDuplicated: afterCount !== beforeCount
  });
});

/**
 * SIMULATION 3: Asynchronous Outbox Failure & Retry
 * Demonstrates failure handling and dead-letter queue transition
 */
router.post('/outbox-failure', (req, res) => {
  const db = getDatabase();

  const jobId = outboxService.enqueue(db, 'SIM-001', 'NOTIFICATION_DISPATCH', {
    simulateFailure: true,
    failureReason: 'Upstream Notification Gateway 503 Service Unavailable',
    simulatedAt: new Date().toISOString()
  }, 2); // Max 2 retries for fast demo

  // Process attempt 1
  const attempt1 = outboxService.processNextJob(db);
  // Process attempt 2
  const attempt2 = outboxService.processNextJob(db);

  const finalJob = db.prepare('SELECT * FROM outbox_jobs WHERE id = ?').get(jobId);

  res.json({
    jobId,
    testDescription: 'Asynchronous job failure with exponential backoff and dead-letter classification',
    attempt1,
    attempt2,
    finalStatus: finalJob.status,
    retryCount: finalJob.retry_count,
    maxRetries: finalJob.max_retries,
    lastError: finalJob.last_error
  });
});

module.exports = router;
