const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const { getDatabase, closeDatabase } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');
const workItemService = require('../src/services/workItemService');

describe('Scale, Pagination & Search Tests', () => {
  let db;

  beforeEach(() => {
    db = getDatabase();
    seedDatabase(db);
  });

  after(() => {
    closeDatabase();
  });

  test('Server-side pagination limits payload and returns correct pagination metadata', () => {
    const adminUser = { id: 'usr-admin', system_role: 'ADMIN', teamIds: [] };

    // Request with limit 3, page 1
    const page1 = workItemService.listWorkItems({
      page: 1,
      limit: 3,
      currentUser: adminUser
    });

    assert.strictEqual(page1.items.length, 3);
    assert.strictEqual(page1.pagination.page, 1);
    assert.strictEqual(page1.pagination.limit, 3);
    assert.ok(page1.pagination.total >= 7);
    assert.strictEqual(page1.pagination.hasMore, true);

    // Request with limit 3, page 2
    const page2 = workItemService.listWorkItems({
      page: 2,
      limit: 3,
      currentUser: adminUser
    });

    assert.strictEqual(page2.items.length, 3);
    assert.strictEqual(page2.pagination.page, 2);
    // Ensure page 1 and page 2 items are disjoint
    const idsPage1 = new Set(page1.items.map(i => i.id));
    const idsPage2 = new Set(page2.items.map(i => i.id));
    for (const id of idsPage2) {
      assert.strictEqual(idsPage1.has(id), false, 'Page 1 and Page 2 must not contain duplicate items');
    }
  });

  test('Server-side SQL search accurately filters matches without loading full table', () => {
    const adminUser = { id: 'usr-admin', system_role: 'ADMIN', teamIds: [] };

    const searchResult = workItemService.listWorkItems({
      search: 'exhaustion',
      currentUser: adminUser
    });

    assert.ok(searchResult.items.length >= 1);
    assert.ok(searchResult.items[0].title.toLowerCase().includes('exhaustion'));
  });
});
