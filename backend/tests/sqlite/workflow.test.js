const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const { getDatabase, closeDatabase } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');
const { validateTransition } = require('../src/services/workflowStateMachine');
const workItemService = require('../src/services/workItemService');

describe('Critical Workflow State Machine Tests', () => {
  let db;

  beforeEach(() => {
    db = getDatabase();
    seedDatabase(db);
  });

  after(() => {
    closeDatabase();
  });

  test('Illegal status jumps are blocked by state machine rules', () => {
    const actorLead = { id: 'usr-alice', system_role: 'TEAM_LEAD', team_role: 'LEAD' };
    const draftItem = { id: 'WI-TEST', status: 'DRAFT', priority: 'LOW' };

    // DRAFT -> RESOLVED is illegal (must go through TRIAGED/IN_INVESTIGATION)
    assert.throws(
      () => validateTransition(draftItem, 'RESOLVED', actorLead, { resolution_summary: 'Quick fix applied' }),
      (err) => {
        assert.strictEqual(err.code, 'ILLEGAL_STATUS_TRANSITION');
        return true;
      }
    );
  });

  test('Transition to RESOLVED requires a meaningful resolution summary', () => {
    const actorLead = { id: 'usr-alice', system_role: 'TEAM_LEAD', team_role: 'LEAD' };
    const inInvestItem = { id: 'WI-TEST', status: 'IN_INVESTIGATION', priority: 'LOW' };

    // Empty or short resolution summary
    assert.throws(
      () => validateTransition(inInvestItem, 'RESOLVED', actorLead, { resolution_summary: 'done' }),
      (err) => {
        assert.strictEqual(err.code, 'MISSING_RESOLUTION_SUMMARY');
        return true;
      }
    );
  });

  test('Resolving high or critical items requires an assigned owner', () => {
    const actorLead = { id: 'usr-alice', system_role: 'TEAM_LEAD', team_role: 'LEAD' };
    const unassignedCritical = {
      id: 'WI-TEST',
      status: 'IN_INVESTIGATION',
      priority: 'CRITICAL',
      owner_id: null
    };

    assert.throws(
      () => validateTransition(unassignedCritical, 'RESOLVED', actorLead, {
        resolution_summary: 'Resolved after restart'
      }),
      (err) => {
        assert.strictEqual(err.code, 'OWNER_REQUIRED_FOR_RESOLUTION');
        return true;
      }
    );
  });

  test('Approving an item in PENDING_APPROVAL requires TEAM_LEAD or ADMIN role', () => {
    const operatorUser = { id: 'usr-bob', system_role: 'OPERATOR', team_role: 'MEMBER' };
    const leadUser = { id: 'usr-alice', system_role: 'TEAM_LEAD', team_role: 'LEAD' };

    const pendingItem = {
      id: 'WI-TEST',
      status: 'PENDING_APPROVAL',
      priority: 'MEDIUM',
      pending_approval_role: 'TEAM_LEAD',
      owner_id: 'usr-bob'
    };

    // Standard operator cannot grant approval
    assert.throws(
      () => validateTransition(pendingItem, 'RESOLVED', operatorUser, {
        resolution_summary: 'Approved and cleared for production'
      }),
      (err) => {
        assert.strictEqual(err.code, 'INSUFFICIENT_APPROVAL_PERMISSIONS');
        return true;
      }
    );

    // Team lead can grant approval
    const allowed = validateTransition(pendingItem, 'RESOLVED', leadUser, {
      resolution_summary: 'Approved and cleared for production'
    });
    assert.strictEqual(allowed, true);
  });
});
