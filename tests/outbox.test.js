const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const { getDatabase, closeDatabase } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');
const outboxService = require('../src/services/outboxService');

describe('Critical Asynchronous Outbox Worker Tests', () => {
  let db;

  beforeEach(() => {
    db = getDatabase();
    seedDatabase(db);
  });

  after(() => {
    closeDatabase();
  });

  test('Outbox job processes successfully and transitions from PENDING to COMPLETED', () => {
    const jobId = outboxService.enqueue(db, 'WI-1001', 'NOTIFICATION_DISPATCH', {
      channel: 'slack',
      message: 'Status transitioned'
    });

    const pending = db.prepare('SELECT * FROM outbox_jobs WHERE id = ?').get(jobId);
    assert.strictEqual(pending.status, 'PENDING');

    const result = outboxService.processNextJob(db, jobId);
    assert.ok(result);
    assert.strictEqual(result.success, true);

    const completed = db.prepare('SELECT * FROM outbox_jobs WHERE id = ?').get(jobId);
    assert.strictEqual(completed.status, 'COMPLETED');
    assert.ok(completed.processed_at, 'Processed timestamp must be set');
  });

  test('Failing outbox jobs retry with backoff and transition to DEAD_LETTER after max retries', () => {
    // Clear outbox for this test
    db.prepare('DELETE FROM outbox_jobs').run();

    // Enqueue a job configured to simulate failure with maxRetries = 2
    const jobId = outboxService.enqueue(db, 'WI-1002', 'NOTIFICATION_DISPATCH', {
      simulateFailure: true,
      failureReason: 'External webhook endpoint timeout (504)'
    }, 2);

    // Attempt 1: Fails, increments retry_count to 1, status = FAILED
    const attempt1 = outboxService.processNextJob(db, jobId);
    assert.strictEqual(attempt1.success, false);
    assert.strictEqual(attempt1.isDeadLetter, false);

    let jobState = db.prepare('SELECT * FROM outbox_jobs WHERE id = ?').get(jobId);
    assert.strictEqual(jobState.status, 'FAILED');
    assert.strictEqual(jobState.retry_count, 1);

    // Fast-forward scheduled_at to make it immediately eligible for attempt 2
    db.prepare("UPDATE outbox_jobs SET scheduled_at = datetime('now', '-1 minute') WHERE id = ?").run(jobId);

    // Attempt 2: Fails, reaches maxRetries (2) -> transitions to DEAD_LETTER
    const attempt2 = outboxService.processNextJob(db, jobId);
    assert.strictEqual(attempt2.success, false);
    assert.strictEqual(attempt2.isDeadLetter, true);

    jobState = db.prepare('SELECT * FROM outbox_jobs WHERE id = ?').get(jobId);
    assert.strictEqual(jobState.status, 'DEAD_LETTER');
    assert.strictEqual(jobState.retry_count, 2);
    assert.ok(jobState.last_error.includes('External webhook endpoint timeout'));
  });
});
