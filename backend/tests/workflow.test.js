import { test, before, after, describe } from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/db/connection.js';
import { seedDatabase } from '../src/seeds/seed.js';
import { User } from '../src/models/User.js';
import { WorkItem } from '../src/models/WorkItem.js';

let server;
let baseUrl;

describe('Workflow State Machine & Lifecycle Validation Tests', () => {
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

  test('Illegal status jump from Open to Resolved is rejected with 400', async () => {
    const admin = await User.findOne({ email: 'admin@newtonite.internal' });
    const openItem = await WorkItem.findOne({ status: 'Open' });

    const res = await fetch(`${baseUrl}/api/work-items/${openItem._id}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': admin._id.toString()
      },
      body: JSON.stringify({
        targetStatus: 'Resolved',
        expectedVersion: openItem.version
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.code, 'ILLEGAL_STATUS_TRANSITION');
  });

  test('Transition to Resolved requires resolution summary', async () => {
    const david = await User.findOne({ email: 'david.kim@newtonite.internal' });
    const inProgressItem = await WorkItem.findOne({ status: 'In Progress', assigneeId: david._id });

    const res = await fetch(`${baseUrl}/api/work-items/${inProgressItem._id}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': david._id.toString()
      },
      body: JSON.stringify({
        targetStatus: 'Resolved',
        expectedVersion: inProgressItem.version
        // Missing resolutionSummary
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.code, 'MISSING_RESOLUTION_SUMMARY');
  });
});
