const express = require('express');
const router = express.Router();
const workItemService = require('../services/workItemService');
const { authorizeResourceAccess } = require('../middleware/auth');

// GET /api/work-items - Paginated list with filtering and search
router.get('/', (req, res, next) => {
  try {
    const { page, limit, teamId, status, priority, type, ownerId, search, needsAttention } = req.query;

    const result = workItemService.listWorkItems({
      page,
      limit,
      teamId,
      status,
      priority,
      type,
      ownerId,
      search,
      needsAttention,
      currentUser: req.user
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/work-items/:id - Fetch details, timeline, comments
router.get('/:id', authorizeResourceAccess('read'), (req, res, next) => {
  try {
    const item = workItemService.getWorkItemById(req.params.id, req.user);
    if (!item) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Work item not found' });
    }
    // Set ETag header for client caching / validation
    res.setHeader('ETag', `"v${item.version}"`);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// POST /api/work-items - Create new work item
router.post('/', (req, res, next) => {
  try {
    const item = workItemService.createWorkItem(req.body, req.user);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/work-items/:id - Update item with OCC check
router.patch('/:id', authorizeResourceAccess('mutate'), (req, res, next) => {
  try {
    // Check version from If-Match header (e.g. '"v2"' or '2') or body
    const ifMatch = req.headers['if-match'];
    let expectedVersion = req.body.expectedVersion;
    if (ifMatch) {
      const match = ifMatch.replace(/"/g, '').replace(/^v/, '');
      expectedVersion = parseInt(match, 10);
    }

    const updated = workItemService.updateWorkItem(
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
});

// POST /api/work-items/:id/claim - Claim ownership with OCC
router.post('/:id/claim', authorizeResourceAccess('mutate'), (req, res, next) => {
  try {
    let expectedVersion = req.body.expectedVersion;
    const ifMatch = req.headers['if-match'];
    if (ifMatch) {
      expectedVersion = parseInt(ifMatch.replace(/"/g, '').replace(/^v/, ''), 10);
    }

    const updated = workItemService.claimWorkItem(
      req.params.id,
      req.user,
      expectedVersion
    );

    res.setHeader('ETag', `"v${updated.version}"`);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/work-items/:id/transition - Workflow state machine transition
router.post('/:id/transition', authorizeResourceAccess('mutate'), (req, res, next) => {
  try {
    const { targetStatus, resolution_summary, pending_approval_role, comment } = req.body;
    let expectedVersion = req.body.expectedVersion;
    const ifMatch = req.headers['if-match'];
    if (ifMatch) {
      expectedVersion = parseInt(ifMatch.replace(/"/g, '').replace(/^v/, ''), 10);
    }

    const updated = workItemService.transitionStatus(
      req.params.id,
      targetStatus,
      { resolution_summary, pending_approval_role, comment },
      req.user,
      expectedVersion
    );

    res.setHeader('ETag', `"v${updated.version}"`);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/work-items/:id/comments - Add collaboration comment
router.post('/:id/comments', authorizeResourceAccess('read'), (req, res, next) => {
  try {
    const updated = workItemService.addComment(
      req.params.id,
      req.body.message,
      req.user
    );
    res.status(201).json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
