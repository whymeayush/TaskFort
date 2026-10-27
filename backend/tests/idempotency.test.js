import { test, before, after, describe } from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/db/connection.js';
import { seedDatabase } from '../src/seeds/seed.js';
import { User } from '../src/models/User.js';
import { WorkItem } from '../src/models/WorkItem.js';
import { Comment } from '../src/models/Comment.js';

let server;
let baseUrl;

describe('Idempotency & Deduplication Tests', () => {
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

  test('Repeating a request with the same Idempotency-Key returns cached response without duplicate comments', async () => {
    const admin = await User.findOne({ email: 'admin@newtonite.internal' });
    const item = await WorkItem.findOne();
    const idempotencyKey = `test-key-${Date.now()}`;

    const commentsBefore = await Comment.countDocuments({ workItemId: item._id });

    // First request
    const res1 = await fetch(`${baseUrl}/api/work-items/${item._id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': admin._id.toString(),
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({ body: 'Crucial verification comment' })
    });
    const data1 = await res1.json();
    assert.strictEqual(res1.status, 201);

    // Second request with exact same Idempotency-Key
    const res2 = await fetch(`${baseUrl}/api/work-items/${item._id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': admin._id.toString(),
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({ body: 'Crucial verification comment' })
    });
    const data2 = await res2.json();

    assert.strictEqual(res2.status, 201);
    assert.strictEqual(data2._id, data1._id, 'Should replay identical response body');

    // Verify database count increased by exactly 1, not 2
    const commentsAfter = await Comment.countDocuments({ workItemId: item._id });
    assert.strictEqual(commentsAfter, commentsBefore + 1, 'Only one comment must be created in the database');
  });
});
