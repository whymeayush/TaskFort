const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const { getDatabase, closeDatabase } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');
const workItemService = require('../src/services/workItemService');

describe('Full Backend Verification Audit (HTTP & Service Layers)', () => {
  let server;
  let baseUrl;
  let db;

  function makeRequest(path, { method = 'GET', headers = {}, body = null } = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const reqHeaders = { 'Connection': 'close', ...headers };
      let bodyData = null;

      if (body) {
        bodyData = typeof body === 'string' ? body : JSON.stringify(body);
        if (!reqHeaders['Content-Type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
        reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
      }

      const req = http.request(url, { method, headers: reqHeaders, agent: false }, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch (e) {
            json = { raw };
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json
          });
        });
      });

      req.on('error', reject);
      if (bodyData) {
        req.write(bodyData);
      }
      req.end();
    });
  }

  // Spin up test server once for the audit suite
  const { before } = require('node:test');

  before(async () => {
    db = getDatabase();
    seedDatabase(db);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  beforeEach(() => {
    seedDatabase(db);
  });

  after(async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
    closeDatabase();
  });

  // 1. AUTHENTICATION AUDIT
  describe('1. Authentication Verification', () => {
    test('Request without X-User-Id header to API returns HTTP 401 UNAUTHENTICATED', async () => {
      const res = await makeRequest('/api/work-items');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'UNAUTHENTICATED');
    });

    test('Request with unknown/invalid user ID returns HTTP 401 UNAUTHENTICATED', async () => {
      const res = await makeRequest('/api/work-items', {
        headers: { 'X-User-Id': 'usr-fake-imposter' }
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'UNAUTHENTICATED');
    });

    test('Request with valid X-User-Id succeeds and loads correct user context', async () => {
      const res = await makeRequest('/api/users/me', {
        headers: { 'X-User-Id': 'usr-alice' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.id, 'usr-alice');
      assert.strictEqual(res.body.name, 'Alice Chen');
    });
  });

  // 2. TEAM & RESOURCE-LEVEL AUTHORIZATION AUDIT
  describe('2. Team & Resource-Level Authorization', () => {
    test('Non-team user is blocked from viewing confidential Compliance ticket (HTTP 403)', async () => {
      // Bob Miller belongs only to Operations, attempting to inspect Compliance ticket WI-1003
      const res = await makeRequest('/api/work-items/WI-1003', {
        headers: { 'X-User-Id': 'usr-bob' }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error, 'RESOURCE_ACCESS_DENIED');
    });

    test('Authorized Compliance team officer can view confidential Compliance ticket (HTTP 200)', async () => {
      // Elena Rostova belongs to team-comp
      const res = await makeRequest('/api/work-items/WI-1003', {
        headers: { 'X-User-Id': 'usr-elena' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.id, 'WI-1003');
      assert.strictEqual(res.body.type, 'COMPLIANCE_REQUEST');
    });

    test('System Administrator has universal access across all confidential boundaries', async () => {
      const resComp = await makeRequest('/api/work-items/WI-1003', {
        headers: { 'X-User-Id': 'usr-admin' }
      });
      assert.strictEqual(resComp.status, 200);

      const resPay = await makeRequest('/api/work-items/WI-1002', {
        headers: { 'X-User-Id': 'usr-admin' }
      });
      assert.strictEqual(resPay.status, 200);
    });

    test('Non-owning team member is blocked from mutating another team item (HTTP 403)', async () => {
      // David Kim (Engineering) attempting to mutate an Operations work item WI-1006
      const res = await makeRequest('/api/work-items/WI-1006', {
        method: 'PATCH',
        headers: { 'X-User-Id': 'usr-david' },
        body: { description: 'Attempted unauthorized mutation by engineering' }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error, 'RESOURCE_ACCESS_DENIED');
    });
  });

  // 3. ATOMIC CONCURRENT ASSIGNMENT & 4. STALE-VERSION REJECTION
  describe('3 & 4. Atomic Concurrency & Stale Rejection', () => {
    test('Atomic claim: exactly one claimant succeeds, second claimant receives HTTP 409 Conflict', async () => {
      // Fetch initial item state
      const initial = await makeRequest('/api/work-items/WI-1004', {
        headers: { 'X-User-Id': 'usr-admin' }
      });
      assert.strictEqual(initial.status, 200);
      const v = initial.body.version;

      // Alice (Ops) and Admin attempt to claim WI-1004 using expectedVersion = v
      const [res1, res2] = await Promise.all([
        makeRequest('/api/work-items/WI-1004/claim', {
          method: 'POST',
          headers: { 'X-User-Id': 'usr-admin' },
          body: { expectedVersion: v }
        }),
        makeRequest('/api/work-items/WI-1004/claim', {
          method: 'POST',
          headers: { 'X-User-Id': 'usr-admin' },
          body: { expectedVersion: v }
        })
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(statuses, [200, 409], 'Must have exactly one 200 and one 409');

      const conflictRes = res1.status === 409 ? res1 : res2;
      assert.strictEqual(conflictRes.body.error, 'CONCURRENCY_CONFLICT');
      assert.ok(conflictRes.body.serverVersion > v);
    });

    test('Mutating with outdated If-Match header triggers HTTP 409 Conflict', async () => {
      const res = await makeRequest('/api/work-items/WI-1001', {
        method: 'PATCH',
        headers: {
          'X-User-Id': 'usr-admin',
          'If-Match': '"v1"' // Current seed version is v3
        },
        body: { priority: 'LOW' }
      });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.error, 'CONCURRENCY_CONFLICT');
      assert.strictEqual(res.body.serverVersion, 3);
    });
  });

  // 5. IDEMPOTENT RETRIES AUDIT
  describe('5. Idempotent Retries', () => {
    test('Repeated requests with same Idempotency-Key return cached response and do not duplicate audit logs', async () => {
      const idemKey = `audit-key-${Date.now()}`;

      const payload = {
        title: 'Audit idempotency created ticket',
        description: 'Verifying idempotency cache replay',
        type: 'CUSTOMER_ISSUE',
        priority: 'MEDIUM',
        team_id: 'team-ops',
        reason_for_existence: 'Testing idempotency duplicate safety',
        business_impact: 'None - synthetic test',
        next_action_required: 'Check cache'
      };

      // Initial request
      const firstRes = await makeRequest('/api/work-items', {
        method: 'POST',
        headers: {
          'X-User-Id': 'usr-admin',
          'Idempotency-Key': idemKey
        },
        body: payload
      });

      assert.strictEqual(firstRes.status, 201);
      assert.strictEqual(firstRes.headers['x-cache'], 'MISS-STORED');
      const createdId = firstRes.body.id;

      // Count audit logs for this item
      const auditCountBefore = db.prepare('SELECT COUNT(*) as count FROM audit_events WHERE work_item_id = ?').get(createdId).count;
      assert.strictEqual(auditCountBefore, 1);

      // Repeat identical request with same key
      const secondRes = await makeRequest('/api/work-items', {
        method: 'POST',
        headers: {
          'X-User-Id': 'usr-admin',
          'Idempotency-Key': idemKey
        },
        body: payload
      });

      assert.strictEqual(secondRes.status, 201);
      assert.strictEqual(secondRes.headers['x-cache'], 'HIT-IDEMPOTENT');
      assert.strictEqual(secondRes.body.id, createdId);

      // Verify audit logs did NOT increase
      const auditCountAfter = db.prepare('SELECT COUNT(*) as count FROM audit_events WHERE work_item_id = ?').get(createdId).count;
      assert.strictEqual(auditCountAfter, 1, 'Audit records must NOT be duplicated on idempotent replay');
    });
  });

  // 6. WORKFLOW STATE MACHINE TRANSITIONS AUDIT
  describe('6. Workflow State Machine Transitions', () => {
    test('Illegal status transition returns HTTP 400 with ILLEGAL_STATUS_TRANSITION', async () => {
      // WI-1004 is currently TRIAGED; jumping directly to RESOLVED is illegal
      const res = await makeRequest('/api/work-items/WI-1004/transition', {
        method: 'POST',
        headers: { 'X-User-Id': 'usr-admin' },
        body: {
          targetStatus: 'RESOLVED',
          resolution_summary: 'Attempting illegal bypass'
        }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'ILLEGAL_STATUS_TRANSITION');
    });

    test('Resolving item without resolution summary returns HTTP 400 MISSING_RESOLUTION_SUMMARY', async () => {
      // WI-1001 is IN_INVESTIGATION, owner is assigned
      const res = await makeRequest('/api/work-items/WI-1001/transition', {
        method: 'POST',
        headers: { 'X-User-Id': 'usr-admin' },
        body: {
          targetStatus: 'RESOLVED',
          expectedVersion: 3,
          resolution_summary: '   ' // empty
        }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'MISSING_RESOLUTION_SUMMARY');
    });

    test('Operator without Team Lead role cannot approve PENDING_APPROVAL item', async () => {
      // WI-1002 is PENDING_APPROVAL in team-pay.
      // Marcus Vance is an OPERATOR (MEMBER) in team-pay.
      const res = await makeRequest('/api/work-items/WI-1002/transition', {
        method: 'POST',
        headers: { 'X-User-Id': 'usr-marcus' },
        body: {
          targetStatus: 'RESOLVED',
          expectedVersion: 2,
          resolution_summary: 'Self-approval attempt by operator'
        }
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'INSUFFICIENT_APPROVAL_PERMISSIONS');
    });

    test('Team Lead can approve PENDING_APPROVAL item', async () => {
      // Admin approves WI-1002
      const res = await makeRequest('/api/work-items/WI-1002/transition', {
        method: 'POST',
        headers: { 'X-User-Id': 'usr-admin' },
        body: {
          targetStatus: 'RESOLVED',
          expectedVersion: 2,
          resolution_summary: 'Official Team Lead sign-off: Wire funds verified against KYC and released.'
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'RESOLVED');
      assert.strictEqual(res.body.version, 3);
    });
  });

  // 7. ACTIVITY-HISTORY & AUDIT CONSISTENCY
  describe('7. Activity-History Consistency', () => {
    test('Sequential mutations produce an ordered, immutable audit trail with diffs', async () => {
      // 1. Create item
      const createRes = await makeRequest('/api/work-items', {
        method: 'POST',
        headers: { 'X-User-Id': 'usr-admin' },
        body: {
          title: 'Activity trail audit ticket',
          description: 'Testing audit logs',
          type: 'OPERATIONAL_APPROVAL',
          priority: 'LOW',
          team_id: 'team-ops',
          reason_for_existence: 'Audit test trigger',
          business_impact: 'Audit test impact',
          next_action_required: 'Take action'
        }
      });
      assert.strictEqual(createRes.status, 201);
      const itemId = createRes.body.id;

      // 2. Claim ownership
      const claimRes = await makeRequest(`/api/work-items/${itemId}/claim`, {
        method: 'POST',
        headers: { 'X-User-Id': 'usr-admin' },
        body: { expectedVersion: 1 }
      });
      assert.strictEqual(claimRes.status, 200);

      // 3. Priority change
      const updateRes = await makeRequest(`/api/work-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'X-User-Id': 'usr-admin' },
        body: { priority: 'HIGH', expectedVersion: 2 }
      });
      assert.strictEqual(updateRes.status, 200);

      // 4. Add comment
      const commentRes = await makeRequest(`/api/work-items/${itemId}/comments`, {
        method: 'POST',
        headers: { 'X-User-Id': 'usr-admin' },
        body: { message: 'Operator collaboration note added' }
      });
      assert.strictEqual(commentRes.status, 201);

      // Fetch final item and inspect auditEvents
      const finalItemRes = await makeRequest(`/api/work-items/${itemId}`, {
        headers: { 'X-User-Id': 'usr-admin' }
      });
      assert.strictEqual(finalItemRes.status, 200);

      const events = finalItemRes.body.auditEvents;
      assert.ok(events.length >= 4, `Expected at least 4 audit events, got ${events.length}`);

      const actionTypes = events.map(e => e.action_type);
      assert.strictEqual(actionTypes[0], 'CREATED');
      assert.strictEqual(actionTypes[1], 'CLAIMED');
      assert.strictEqual(actionTypes[2], 'PRIORITY_CHANGED');
      assert.strictEqual(actionTypes[3], 'COMMENT_ADDED');

      // Check field diff on priority change
      const priorityEvent = events.find(e => e.action_type === 'PRIORITY_CHANGED');
      assert.strictEqual(priorityEvent.old_value, 'LOW');
      assert.strictEqual(priorityEvent.new_value, 'HIGH');
    });
  });
});
