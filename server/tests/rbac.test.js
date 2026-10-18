import { test, before, after, describe } from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/db/connection.js';
import { seedDatabase } from '../src/seeds/seed.js';
import { User } from '../src/models/User.js';
import { WorkItem } from '../src/models/WorkItem.js';

let server;
let baseUrl;

describe('RBAC & Resource-Level Authorization Tests', () => {
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

  test('Non-compliance user cannot access confidential compliance ticket', async () => {
    const bob = await User.findOne({ email: 'bob.miller@newtonite.internal' }); // Central Ops
    const complianceItem = await WorkItem.findOne({ type: 'COMPLIANCE_REQUEST' });

    const res = await fetch(`${baseUrl}/api/work-items/${complianceItem._id}`, {
      headers: { 'x-user-id': bob._id.toString() }
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.error, 'RESOURCE_ACCESS_DENIED');
  });

  test('Authorized compliance lead can access confidential compliance ticket', async () => {
    const elena = await User.findOne({ email: 'elena.rostova@newtonite.internal' }); // Compliance Lead
    const complianceItem = await WorkItem.findOne({ type: 'COMPLIANCE_REQUEST' });

    const res = await fetch(`${baseUrl}/api/work-items/${complianceItem._id}`, {
      headers: { 'x-user-id': elena._id.toString() }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.title, complianceItem.title);
  });

  test('System Administrator bypasses team confidentiality boundaries', async () => {
    const admin = await User.findOne({ email: 'admin@newtonite.internal' });
    const complianceItem = await WorkItem.findOne({ type: 'COMPLIANCE_REQUEST' });

    const res = await fetch(`${baseUrl}/api/work-items/${complianceItem._id}`, {
      headers: { 'x-user-id': admin._id.toString() }
    });
    assert.strictEqual(res.status, 200);
  });

  test('Non-admin member cannot add member to team', async () => {
    const bob = await User.findOne({ email: 'bob.miller@newtonite.internal' }); // Team member, not admin
    const teamsRes = await fetch(`${baseUrl}/api/teams`, {
      headers: { 'x-user-id': bob._id.toString() }
    });
    const teams = await teamsRes.json();
    const opsTeam = teams.find(t => t.code === 'OPS');

    const res = await fetch(`${baseUrl}/api/teams/${opsTeam._id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': bob._id.toString()
      },
      body: JSON.stringify({
        userId: bob._id.toString(),
        roleInTeam: 'TEAM_ADMIN'
      })
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.error, 'FORBIDDEN');
  });
});
