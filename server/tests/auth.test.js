import { test, before, after, describe } from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/db/connection.js';
import { seedDatabase } from '../src/seeds/seed.js';

let server;
let baseUrl;

describe('Authentication & Profile API Tests', () => {
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

  test('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.chen@newtonite.internal',
        password: 'Password123!'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.token, 'Should return JWT token');
    assert.strictEqual(data.user.name, 'Alice Chen');
    assert.strictEqual(data.user.email, 'alice.chen@newtonite.internal');
  });

  test('POST /api/auth/login fails with invalid password (401)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice.chen@newtonite.internal',
        password: 'WrongPassword!'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.error, 'UNAUTHENTICATED');
  });

  test('GET /api/work-items without token fails (401)', async () => {
    const res = await fetch(`${baseUrl}/api/work-items`);
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.error, 'UNAUTHENTICATED');
  });

  test('GET /api/auth/profile with Bearer token returns profile context', async () => {
    // 1. Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@newtonite.internal',
        password: 'AdminSecret2026!'
      })
    });
    const { token } = await loginRes.json();

    // 2. Fetch profile
    const profileRes = await fetch(`${baseUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const profileData = await profileRes.json();
    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileData.user.name, 'System Administrator');
    assert.strictEqual(profileData.user.isSystemAdmin, true);
  });
});
