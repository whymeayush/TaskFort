const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const { getDatabase, closeDatabase } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');
const workItemService = require('../src/services/workItemService');

describe('Critical Resource-Level Authorization Tests', () => {
  let db;

  beforeEach(() => {
    db = getDatabase();
    seedDatabase(db);
  });

  after(() => {
    closeDatabase();
  });

  test('Confidential compliance work items are filtered out for non-team users', () => {
    const operatorInOps = {
      id: 'usr-bob',
      system_role: 'OPERATOR',
      teamIds: ['team-ops']
    };

    const complianceLead = {
      id: 'usr-elena',
      system_role: 'TEAM_LEAD',
      teamIds: ['team-comp']
    };

    // Ops user listing work items
    const opsList = workItemService.listWorkItems({
      currentUser: operatorInOps
    });

    const opsHasCompliance = opsList.items.some(i => i.type === 'COMPLIANCE_REQUEST');
    assert.strictEqual(opsHasCompliance, false, 'Confidential compliance items must NOT be visible to Ops operators');

    // Compliance user listing work items
    const compList = workItemService.listWorkItems({
      currentUser: complianceLead
    });

    const compHasCompliance = compList.items.some(i => i.type === 'COMPLIANCE_REQUEST');
    assert.strictEqual(compHasCompliance, true, 'Compliance officer must be able to view compliance items');
  });

  test('System Administrator bypasses team confidentiality boundaries', () => {
    const adminUser = {
      id: 'usr-admin',
      system_role: 'ADMIN',
      teamIds: ['team-ops']
    };

    const adminList = workItemService.listWorkItems({
      currentUser: adminUser
    });

    const hasCompliance = adminList.items.some(i => i.type === 'COMPLIANCE_REQUEST');
    const hasPayments = adminList.items.some(i => i.type === 'PAYMENT_INVESTIGATION');

    assert.strictEqual(hasCompliance, true, 'Admin must see compliance items');
    assert.strictEqual(hasPayments, true, 'Admin must see payment investigation items');
  });
});
