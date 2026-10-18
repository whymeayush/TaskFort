const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const { getDatabase, closeDatabase } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');
const workItemService = require('../src/services/workItemService');

describe('Critical Concurrency Tests (OCC)', () => {
  let db;

  beforeEach(() => {
    // Reset test database with clean seed
    db = getDatabase();
    seedDatabase(db);
  });

  after(() => {
    closeDatabase();
  });

  test('Two users attempting to claim the same work item: exactly one succeeds and second receives 409 Conflict', () => {
    const userAlice = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-alice');
    const userBob = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-bob');

    // Create an unassigned test item
    const initialItem = workItemService.createWorkItem({
      title: 'Emergency fiber cut triage',
      description: 'Backbone link failure in US-East region',
      type: 'PRODUCTION_INCIDENT',
      priority: 'CRITICAL',
      team_id: 'team-ops',
      reason_for_existence: 'Fiber cut alert from Tier 1 ISP',
      business_impact: 'Increased latency for 12% of customer traffic',
      next_action_required: 'Reroute BGP paths'
    }, userAlice);

    const versionAtViewTime = initialItem.version; // v1

    // First user claims ownership
    const firstClaim = workItemService.claimWorkItem(initialItem.id, userAlice, versionAtViewTime);
    assert.strictEqual(firstClaim.owner_id, userAlice.id);
    assert.strictEqual(firstClaim.version, 2);

    // Second user attempts to claim using the now-stale version v1
    assert.throws(
      () => {
        workItemService.claimWorkItem(initialItem.id, userBob, versionAtViewTime);
      },
      (err) => {
        assert.strictEqual(err.code, 'CONCURRENCY_CONFLICT');
        assert.strictEqual(err.serverVersion, 2);
        assert.strictEqual(err.serverItem.owner_id, userAlice.id);
        return true;
      },
      'Second claimant should fail with CONCURRENCY_CONFLICT error'
    );
  });

  test('Updating a work item with an outdated version token triggers 409 Conflict', () => {
    const userAlice = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-alice');

    const item = workItemService.createWorkItem({
      title: 'Investigate slow database query',
      description: 'Slow queries in reports generation',
      type: 'ENGINEERING_PROBLEM',
      priority: 'MEDIUM',
      team_id: 'team-ops',
      reason_for_existence: 'Reports dashboard timeout',
      business_impact: 'Reports delayed by 5 minutes',
      next_action_required: 'Analyze EXPLAIN query plans'
    }, userAlice);

    // Concurrent user updates the item first (incrementing to v2)
    workItemService.updateWorkItem(item.id, { priority: 'HIGH' }, userAlice, item.version);

    // Original user tries to update using old version v1
    assert.throws(
      () => {
        workItemService.updateWorkItem(item.id, { description: 'Updated description from stale tab' }, userAlice, 1);
      },
      (err) => {
        assert.strictEqual(err.code, 'CONCURRENCY_CONFLICT');
        assert.strictEqual(err.serverVersion, 2);
        return true;
      }
    );
  });
});
