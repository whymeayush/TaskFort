import { WorkItem } from '../models/WorkItem.js';
import { User } from '../models/User.js';
import { assignmentService } from '../services/assignmentService.js';
import { IdempotencyKey } from '../models/IdempotencyKey.js';
import { ActivityLog } from '../models/ActivityLog.js';

export async function simulateRaceClaim(req, res, next) {
  try {
    const { workItemId } = req.body;
    let target = null;

    if (workItemId) {
      target = await WorkItem.findById(workItemId);
    } else {
      target = await WorkItem.findOne({ assigneeId: null, status: 'Open' });
    }

    if (!target) {
      return res.status(404).json({ error: 'No unassigned work item found for simulation' });
    }

    const versionAtStart = target.version;

    // Pick 2 users: Alice and Bob
    const alice = await User.findOne({ email: 'alice.chen@newtonite.internal' });
    const bob = await User.findOne({ email: 'bob.miller@newtonite.internal' });

    const results = {
      scenario: `Two users simultaneously claiming ${target._id} at version ${versionAtStart}`,
      targetId: target._id,
      user1: { name: alice.name, attemptResult: null },
      user2: { name: bob.name, attemptResult: null },
      finalState: null
    };

    // Run parallel claim promises
    const [p1, p2] = await Promise.allSettled([
      assignmentService.claimWorkItem(target._id, alice, versionAtStart),
      assignmentService.claimWorkItem(target._id, bob, versionAtStart)
    ]);

    results.user1.attemptResult = p1.status === 'fulfilled'
      ? { status: 200, message: 'SUCCESS: Claim succeeded', version: p1.value.version, owner: p1.value.assigneeId.name }
      : { status: 409, code: p1.reason.code, message: p1.reason.message };

    results.user2.attemptResult = p2.status === 'fulfilled'
      ? { status: 200, message: 'SUCCESS: Claim succeeded', version: p2.value.version, owner: p2.value.assigneeId.name }
      : { status: 409, code: p2.reason.code, message: p2.reason.message, serverVersion: p2.reason.serverVersion };

    results.finalState = await WorkItem.findById(target._id).populate('assigneeId', 'name email');
    res.json(results);
  } catch (err) {
    next(err);
  }
}

export async function simulateIdempotency(req, res, next) {
  try {
    const testKey = req.body.key || `demo-idempotency-${Date.now()}`;
    const user = req.user;

    const countBefore = await ActivityLog.countDocuments();

    // Check if key exists
    let existing = await IdempotencyKey.findOne({ key: testKey, userId: user._id });
    let isFirst = false;

    if (!existing) {
      isFirst = true;
      existing = await IdempotencyKey.create({
        key: testKey,
        userId: user._id,
        requestPath: '/api/simulation/idempotency',
        requestMethod: 'POST',
        responseStatus: 201,
        responseBody: { message: 'Idempotent transaction processed successfully', key: testKey }
      });
    }

    const countAfter = await ActivityLog.countDocuments();

    res.json({
      key: testKey,
      isFirstCall: isFirst,
      cacheStatus: isFirst ? 'MISS-STORED' : 'HIT-IDEMPOTENT',
      response: existing.responseBody,
      zeroDuplicateSideEffects: countBefore === countAfter
    });
  } catch (err) {
    next(err);
  }
}
