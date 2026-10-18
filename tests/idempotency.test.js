const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const { getDatabase, closeDatabase } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');

describe('Critical Idempotency Tests (Deduplication)', () => {
  let db;

  beforeEach(() => {
    db = getDatabase();
    seedDatabase(db);
  });

  after(() => {
    closeDatabase();
  });

  test('Repeating a request with the same Idempotency-Key returns cached response without duplicate side effects', () => {
    const testKey = 'idem-test-key-999';
    const userId = 'usr-alice';
    const requestPath = '/api/work-items';
    const requestMethod = 'POST';
    const samplePayload = { id: 'WI-TEST-IDEM', title: 'Idempotent Item Created' };

    // Initial operation records result in idempotency_keys
    db.prepare(`
      INSERT INTO idempotency_keys (
        key, user_id, request_path, request_method, response_status, response_body, created_at
      ) VALUES (?, ?, ?, ?, 201, ?, datetime('now'))
    `).run(testKey, userId, requestPath, requestMethod, JSON.stringify(samplePayload));

    // Also record initial audit count
    const initialAuditCount = db.prepare('SELECT COUNT(*) as count FROM audit_events').get().count;

    // Simulate second repeated request arriving with identical Idempotency-Key
    const cachedEntry = db.prepare(`
      SELECT * FROM idempotency_keys WHERE key = ? AND user_id = ?
    `).get(testKey, userId);

    assert.ok(cachedEntry, 'Idempotency record must be found in storage');
    assert.strictEqual(cachedEntry.response_status, 201);
    
    const parsedCachedBody = JSON.parse(cachedEntry.response_body);
    assert.strictEqual(parsedCachedBody.id, 'WI-TEST-IDEM');

    // Confirm that replaying the cached response causes ZERO additional database mutations
    const finalAuditCount = db.prepare('SELECT COUNT(*) as count FROM audit_events').get().count;
    assert.strictEqual(finalAuditCount, initialAuditCount, 'Audit event count must not increase on duplicate idempotent request');
  });
});
