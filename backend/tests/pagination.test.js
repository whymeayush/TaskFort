import { test, before, after, describe } from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/db/connection.js';
import { seedDatabase } from '../src/seeds/seed.js';
import { User } from '../src/models/User.js';

let server;
let baseUrl;

describe('Search, Filtering & Pagination Tests', () => {
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

  test('Server-side pagination limits output and returns pagination metadata', async () => {
    const admin = await User.findOne({ email: 'admin@newtonite.internal' });

    const res = await fetch(`${baseUrl}/api/work-items?page=1&limit=3`, {
      headers: { 'x-user-id': admin._id.toString() }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.ok(data.items.length <= 3, 'Should respect limit=3');
    assert.strictEqual(data.pagination.page, 1);
    assert.strictEqual(data.pagination.limit, 3);
    assert.ok(data.pagination.totalItems >= 5, 'Should count total items');
    assert.ok(data.pagination.totalPages >= 2, 'Should compute totalPages');
  });

  test('Server-side search accurately filters matches without loading full collection', async () => {
    const admin = await User.findOne({ email: 'admin@newtonite.internal' });

    const res = await fetch(`${baseUrl}/api/work-items?search=connection pool`, {
      headers: { 'x-user-id': admin._id.toString() }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.ok(data.items.length >= 1, 'Should find matching item');
    assert.ok(data.items.some(i => i.title.toLowerCase().includes('connection pool')));
  });
});
