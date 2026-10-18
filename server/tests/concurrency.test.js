import { test, before, after, describe } from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/db/connection.js';
import { seedDatabase } from '../src/seeds/seed.js';
import { User } from '../src/models/User.js';
import { WorkItem } from '../src/models/WorkItem.js';
import { Team } from '../src/models/Team.js';
import { TeamMembership } from '../src/models/TeamMembership.js';

let server;
let baseUrl;

describe('Concurrency & Optimistic Concurrency Control (OCC) Tests', () => {
  before(async () => {
    await connectDB();
    await seedDatabase();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
    await disconnectDB();
  });

  test('Simultaneous claims on unassigned item: exactly one succeeds, second gets 409 Conflict', async () => {
    const alice = await User.findOne({ email: 'alice.chen@newtonite.internal' });
    const bob = await User.findOne({ email: 'bob.miller@newtonite.internal' });
    const opsTeam = await Team.findOne({ code: 'OPS' });

    // Create a fresh unassigned item
    const unassignedItem = await WorkItem.create({
      title: 'Race Condition Test Item',
      description: 'Testing two users claiming simultaneously',
      type: 'CUSTOMER_ISSUE',
      status: 'Open',
      priority: 'HIGH',
      teamId: opsTeam._id,
      createdBy: alice._id,
      assigneeId: null,
      reasonForExistence: 'Concurrency test',
      businessImpact: 'Validation of OCC atomic claims',
      version: 1
    });

    // Both users attempt to claim at version 1 simultaneously
    const [resAlice, resBob] = await Promise.all([
      fetch(`${baseUrl}/api/work-items/${unassignedItem._id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': alice._id.toString(),
          'If-Match': '"v1"'
        },
        body: JSON.stringify({ expectedVersion: 1 })
      }),
      fetch(`${baseUrl}/api/work-items/${unassignedItem._id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': bob._id.toString(),
          'If-Match': '"v1"'
        },
        body: JSON.stringify({ expectedVersion: 1 })
      })
    ]);

    const statuses = [resAlice.status, resBob.status].sort();
    assert.deepStrictEqual(statuses, [200, 409], 'One request must succeed (200) and one must receive conflict (409)');

    // Verify item has incremented version and assigned owner
    const finalItem = await WorkItem.findById(unassignedItem._id);
    assert.strictEqual(finalItem.version, 2);
    assert.ok(finalItem.assigneeId, 'Item should be assigned');
  });

  test('Updating a work item with an outdated version token triggers 409 Conflict', async () => {
    const alice = await User.findOne({ email: 'alice.chen@newtonite.internal' });
    const opsTeam = await Team.findOne({ code: 'OPS' });
    const item = await WorkItem.findOne({ teamId: opsTeam._id });

    // Stale update: sending version 999
    const res = await fetch(`${baseUrl}/api/work-items/${item._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': alice._id.toString(),
        'If-Match': '"v999"'
      },
      body: JSON.stringify({
        title: 'New Title from Stale Client',
        expectedVersion: 999
      })
    });

    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.strictEqual(data.error, 'CONCURRENCY_CONFLICT');
    assert.strictEqual(data.code, 'CONCURRENCY_CONFLICT');
    assert.ok(data.serverVersion, 'Should provide current server version');
  });
});
