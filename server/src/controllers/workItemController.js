import { workItemService } from '../services/workItemService.js';
import { assignmentService } from '../services/assignmentService.js';
import { auditService } from '../services/auditService.js';

export async function listWorkItems(req, res, next) {
  try {
    const { page, limit, teamId, status, priority, type, assigneeId, search, needsAttention } = req.query;

    const result = await workItemService.listWorkItems({
      page,
      limit,
      teamId,
      status,
      priority,
      type,
      assigneeId,
      search,
      needsAttention,
      currentUser: req.user
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getWorkItem(req, res, next) {
  try {
    const item = await workItemService.getWorkItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Work item not found' });
    }
    res.setHeader('ETag', `"v${item.version}"`);
    res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function createWorkItem(req, res, next) {
  try {
    const item = await workItemService.createWorkItem(req.body, req.user);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

export async function updateWorkItem(req, res, next) {
  try {
    const ifMatch = req.headers['if-match'];
    let expectedVersion = req.body.expectedVersion;
    if (ifMatch) {
      expectedVersion = parseInt(ifMatch.replace(/"/g, '').replace(/^v/, ''), 10);
    }

    const updated = await workItemService.updateWorkItem(
      req.params.id,
      req.body,
      req.user,
      expectedVersion
    );

    res.setHeader('ETag', `"v${updated.version}"`);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function claimWorkItem(req, res, next) {
  try {
    const ifMatch = req.headers['if-match'];
    let expectedVersion = req.body.expectedVersion;
    if (ifMatch) {
      expectedVersion = parseInt(ifMatch.replace(/"/g, '').replace(/^v/, ''), 10);
    }

    const updated = await assignmentService.claimWorkItem(
      req.params.id,
      req.user,
      expectedVersion
    );

    res.setHeader('ETag', `"v${updated.version}"`);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function reassignWorkItem(req, res, next) {
  try {
    const { assigneeId } = req.body;
    let expectedVersion = req.body.expectedVersion;

    const updated = await assignmentService.reassignWorkItem(
      req.params.id,
      assigneeId,
      req.user,
      expectedVersion
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function transitionWorkItemStatus(req, res, next) {
  try {
    const { targetStatus, resolutionSummary, pendingApprovalRole, comment } = req.body;
    const ifMatch = req.headers['if-match'];
    let expectedVersion = req.body.expectedVersion;
    if (ifMatch) {
      expectedVersion = parseInt(ifMatch.replace(/"/g, '').replace(/^v/, ''), 10);
    }

    const updated = await workItemService.transitionStatus(
      req.params.id,
      targetStatus,
      { resolutionSummary, pendingApprovalRole, comment },
      req.user,
      expectedVersion
    );

    res.setHeader('ETag', `"v${updated.version}"`);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    const comment = await workItemService.addComment(
      req.params.id,
      req.body.body,
      req.user
    );
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

export async function getActivityTimeline(req, res, next) {
  try {
    const timeline = await auditService.getActivityTimeline(req.params.id);
    res.json(timeline);
  } catch (err) {
    next(err);
  }
}
