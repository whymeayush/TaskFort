const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class OutboxService {
  constructor() {
    this.intervalHandle = null;
    this.isProcessing = false;
  }

  /**
   * Enqueues an outbox job within the caller's active database transaction
   */
  enqueue(db, aggregateId, eventType, payload, maxRetries = 3) {
    const id = `job-${uuidv4()}`;
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const stmt = db.prepare(`
      INSERT INTO outbox_jobs (
        id, aggregate_id, event_type, payload, status, retry_count, max_retries, scheduled_at, created_at
      ) VALUES (?, ?, ?, ?, 'PENDING', 0, ?, datetime('now'), datetime('now'))
    `);

    stmt.run(id, aggregateId, eventType, payloadStr, maxRetries);
    return id;
  }

  /**
   * Processes a single pending or retryable job
   */
  processNextJob(db, targetJobId = null) {
    let job = null;
    if (targetJobId) {
      const selectStmt = db.prepare(`
        SELECT * FROM outbox_jobs
        WHERE id = ? AND status IN ('PENDING', 'FAILED')
      `);
      job = selectStmt.get(targetJobId);
    } else {
      const selectStmt = db.prepare(`
        SELECT * FROM outbox_jobs
        WHERE status IN ('PENDING', 'FAILED')
          AND scheduled_at <= datetime('now')
        ORDER BY scheduled_at ASC
        LIMIT 1
      `);
      job = selectStmt.get();
    }
    if (!job) return null;

    // Mark as PROCESSING immediately
    db.prepare(`
      UPDATE outbox_jobs 
      SET status = 'PROCESSING' 
      WHERE id = ? AND status IN ('PENDING', 'FAILED')
    `).run(job.id);

    try {
      // Execute the job logic based on event_type
      this.executeJobLogic(job);

      // On success, mark COMPLETED
      db.prepare(`
        UPDATE outbox_jobs
        SET status = 'COMPLETED',
            processed_at = datetime('now')
        WHERE id = ?
      `).run(job.id);

      return { job, success: true };
    } catch (err) {
      const nextRetryCount = job.retry_count + 1;
      const isDeadLetter = nextRetryCount >= job.max_retries;
      const backoffSeconds = Math.pow(2, nextRetryCount); // Exponential backoff: 2s, 4s, 8s...

      const updateStmt = db.prepare(`
        UPDATE outbox_jobs
        SET status = ?,
            retry_count = ?,
            last_error = ?,
            scheduled_at = datetime('now', '+' || ? || ' seconds')
        WHERE id = ?
      `);

      updateStmt.run(
        isDeadLetter ? 'DEAD_LETTER' : 'FAILED',
        nextRetryCount,
        err.message || 'Unknown processing error',
        backoffSeconds,
        job.id
      );

      return { job, success: false, error: err.message, isDeadLetter };
    }
  }

  /**
   * Internal job execution dispatcher
   */
  executeJobLogic(job) {
    const payload = JSON.parse(job.payload);

    // Simulated test failure mechanism for demonstration & testing
    if (payload.simulateFailure) {
      throw new Error(payload.failureReason || 'Simulated upstream service connection timeout');
    }

    switch (job.event_type) {
      case 'NOTIFICATION_DISPATCH':
        // Simulated Slack / PagerDuty / Email webhook dispatch
        break;

      case 'AUDIT_ENRICHMENT':
        // Secondary metadata enrichment or analytical telemetry sink
        break;

      case 'SLA_TIMER_CHECK':
        // SLA breach countdown check
        break;

      default:
        // Generic job completed
        break;
    }
  }

  /**
   * Starts background worker loop
   */
  startWorker(db) {
    if (this.intervalHandle) return;

    this.intervalHandle = setInterval(() => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        let jobResult = null;
        do {
          jobResult = this.processNextJob(db);
        } while (jobResult !== null);
      } catch (err) {
        // Log worker error without crashing
      } finally {
        this.isProcessing = false;
      }
    }, config.OUTBOX_POLL_INTERVAL_MS);
  }

  /**
   * Stops background worker
   */
  stopWorker() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Returns current queue statistics
   */
  getQueueStats(db) {
    const stmt = db.prepare(`
      SELECT 
        status, 
        COUNT(*) as count 
      FROM outbox_jobs 
      GROUP BY status
    `);
    const rows = stmt.all();
    const stats = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0, DEAD_LETTER: 0 };
    rows.forEach(r => { stats[r.status] = r.count; });
    return stats;
  }
}

module.exports = new OutboxService();
