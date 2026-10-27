const { getDatabase } = require('../db/database');
const auditService = require('./auditService');
const outboxService = require('./outboxService');
const eventStream = require('./eventStream');
const { validateTransition } = require('./workflowStateMachine');
const { v4: uuidv4 } = require('uuid');

class WorkItemService {
  /**
   * Lists work items with server-side pagination, search, and filtering
   * Never loads full dataset into memory
   */
  listWorkItems({
    page = 1,
    limit = 15,
    teamId = null,
    status = null,
    priority = null,
    type = null,
    ownerId = null,
    search = null,
    needsAttention = false,
    currentUser
  }) {
    const db = getDatabase();
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (parsedPage - 1) * parsedLimit;

    const conditions = [];
    const params = [];

    // Resource-level security filter for confidential items
    if (currentUser.system_role !== 'ADMIN') {
      const allowedTeamPlaceholders = currentUser.teamIds.map(() => '?').join(',');
      if (currentUser.teamIds.length > 0) {
        conditions.push(`(
          w.type NOT IN ('COMPLIANCE_REQUEST', 'PAYMENT_INVESTIGATION')
          OR w.team_id IN (${allowedTeamPlaceholders})
        )`);
        params.push(...currentUser.teamIds);
      } else {
        conditions.push(`w.type NOT IN ('COMPLIANCE_REQUEST', 'PAYMENT_INVESTIGATION')`);
      }
    }

    // Dynamic Filter Clauses
    if (teamId && teamId !== 'ALL') {
      conditions.push('w.team_id = ?');
      params.push(teamId);
    }

    if (status && status !== 'ALL') {
      conditions.push('w.status = ?');
      params.push(status);
    }

    if (priority && priority !== 'ALL') {
      conditions.push('w.priority = ?');
      params.push(priority);
    }

    if (type && type !== 'ALL') {
      conditions.push('w.type = ?');
      params.push(type);
    }

    if (ownerId) {
      if (ownerId === 'UNASSIGNED') {
        conditions.push('w.owner_id IS NULL');
      } else {
        conditions.push('w.owner_id = ?');
        params.push(ownerId);
      }
    }

    // "Needs Attention" Queue filter:
    // Items that are PENDING_APPROVAL, or unassigned CRITICAL/HIGH, or assigned to current user in active states
    if (needsAttention === true || needsAttention === 'true') {
      conditions.push(`(
        w.status = 'PENDING_APPROVAL' 
        OR (w.owner_id IS NULL AND w.status IN ('TRIAGED', 'IN_INVESTIGATION'))
        OR (w.owner_id = ? AND w.status IN ('IN_INVESTIGATION', 'TRIAGED'))
      )`);
      params.push(currentUser.id);
    }

    // Search filter across title, description, reason_for_existence
    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(`(
        w.title LIKE ? OR w.description LIKE ? OR w.reason_for_existence LIKE ? OR w.id LIKE ?
      )`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count Query
    const countSql = `SELECT COUNT(*) as total FROM work_items w ${whereClause}`;
    const totalCount = db.prepare(countSql).get(...params).total;

    // Paginated Items Query with joined owner and team details
    const selectSql = `
      SELECT 
        w.id,
        w.title,
        w.description,
        w.type,
        w.status,
        w.priority,
        w.team_id,
        t.name as team_name,
        t.code as team_code,
        w.owner_id,
        u.name as owner_name,
        u.email as owner_email,
        u.avatar_color as owner_avatar_color,
        w.created_by,
        c.name as creator_name,
        w.reason_for_existence,
        w.business_impact,
        w.next_action_required,
        w.pending_approval_role,
        w.resolution_summary,
        w.version,
        w.created_at,
        w.updated_at
      FROM work_items w
      JOIN teams t ON w.team_id = t.id
      LEFT JOIN users u ON w.owner_id = u.id
      JOIN users c ON w.created_by = c.id
      ${whereClause}
      ORDER BY 
        CASE w.priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          WHEN 'LOW' THEN 4 
          ELSE 5 
        END ASC,
        w.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const items = db.prepare(selectSql).all(...params, parsedLimit, offset);
    const totalPages = Math.ceil(totalCount / parsedLimit) || 1;

    return {
      items,
      pagination: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        hasMore: parsedPage < totalPages
      }
    };
  }

  /**
   * Retrieves single work item with timeline and comments
   */
  getWorkItemById(id, currentUser) {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT 
        w.*,
        t.name as team_name,
        t.code as team_code,
        u.name as owner_name,
        u.email as owner_email,
        u.avatar_color as owner_avatar_color,
        c.name as creator_name
      FROM work_items w
      JOIN teams t ON w.team_id = t.id
      LEFT JOIN users u ON w.owner_id = u.id
      JOIN users c ON w.created_by = c.id
      WHERE w.id = ?
    `);

    const item = stmt.get(id);
    if (!item) return null;

    // Load audit history
    const auditEvents = auditService.getHistory(db, id);

    // Load comments
    const commentsStmt = db.prepare(`
      SELECT 
        cm.id,
        cm.work_item_id,
        cm.author_id,
        u.name as author_name,
        u.email as author_email,
        u.avatar_color as author_avatar_color,
        cm.message,
        cm.created_at
      FROM comments cm
      JOIN users u ON cm.author_id = u.id
      WHERE cm.work_item_id = ?
      ORDER BY cm.created_at ASC
    `);
    const comments = commentsStmt.all(id);

    return {
      ...item,
      auditEvents,
      comments
    };
  }

  /**
   * Creates a new work item with initial audit event and outbox notification
   */
  createWorkItem(data, actorUser) {
    const db = getDatabase();

    const {
      title,
      description,
      type,
      priority = 'MEDIUM',
      team_id,
      reason_for_existence,
      business_impact,
      next_action_required,
      owner_id = null
    } = data;

    if (!title || !description || !type || !team_id || !reason_for_existence || !business_impact) {
      throw new Error('Missing required fields for work item creation.');
    }

    // Generate readable ID
    const count = db.prepare('SELECT COUNT(*) as count FROM work_items').get().count;
    const newId = `WI-${1000 + count + 1}`;

    return db.transaction(() => {
      const insertStmt = db.prepare(`
        INSERT INTO work_items (
          id, title, description, type, status, priority, team_id, owner_id,
          created_by, reason_for_existence, business_impact, next_action_required,
          pending_approval_role, resolution_summary, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'TRIAGED', ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 1, datetime('now'), datetime('now'))
      `);

      insertStmt.run(
        newId,
        title.trim(),
        description.trim(),
        type,
        priority,
        team_id,
        owner_id,
        actorUser.id,
        reason_for_existence.trim(),
        business_impact.trim(),
        (next_action_required || 'Triage and assign responsible owner').trim()
      );

      // Audit entry
      auditService.logEvent(db, {
        workItemId: newId,
        actorId: actorUser.id,
        actionType: 'CREATED',
        comment: `Work item created by ${actorUser.name}`
      });

      // Outbox job for notification dispatch
      outboxService.enqueue(db, newId, 'NOTIFICATION_DISPATCH', {
        type: 'WORK_ITEM_CREATED',
        title,
        priority,
        team_id
      });

      const createdItem = this.getWorkItemById(newId, actorUser);

      // Real-time SSE broadcast
      eventStream.broadcast('work_item_created', {
        id: newId,
        version: 1,
        actor: actorUser.name,
        item: createdItem
      });

      return createdItem;
    });
  }

  /**
   * CRITICAL SITUATION 1: Concurrency Conflict Resolution on Claiming Responsibility
   * Uses Optimistic Concurrency Control (OCC) to ensure atomic ownership claims
   */
  claimWorkItem(id, actorUser, expectedVersion) {
    const db = getDatabase();

    return db.transaction(() => {
      const currentItem = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
      if (!currentItem) {
        throw new Error(`Work item '${id}' not found.`);
      }

      if (expectedVersion !== undefined && expectedVersion !== null) {
        if (currentItem.version !== parseInt(expectedVersion, 10)) {
          const conflictErr = new Error('CONCURRENCY_CONFLICT: Another user has updated or claimed this item.');
          conflictErr.code = 'CONCURRENCY_CONFLICT';
          conflictErr.serverVersion = currentItem.version;
          conflictErr.serverItem = this.getWorkItemById(id, actorUser);
          throw conflictErr;
        }
      }

      // Atomic update with version lock
      const updateStmt = db.prepare(`
        UPDATE work_items 
        SET owner_id = ?, 
            version = version + 1, 
            updated_at = datetime('now')
        WHERE id = ? AND version = ?
      `);

      const result = updateStmt.run(actorUser.id, id, currentItem.version);

      if (result.changes === 0) {
        const freshItem = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
        const conflictErr = new Error('CONCURRENCY_CONFLICT: Race condition detected. Another user claimed this work item simultaneously.');
        conflictErr.code = 'CONCURRENCY_CONFLICT';
        conflictErr.serverVersion = freshItem.version;
        conflictErr.serverItem = this.getWorkItemById(id, actorUser);
        throw conflictErr;
      }

      // Log audit
      auditService.logEvent(db, {
        workItemId: id,
        actorId: actorUser.id,
        actionType: 'CLAIMED',
        fieldName: 'owner_id',
        oldValue: currentItem.owner_id,
        newValue: actorUser.id,
        comment: `${actorUser.name} claimed responsibility for this work item`
      });

      // Outbox secondary notification
      outboxService.enqueue(db, id, 'NOTIFICATION_DISPATCH', {
        type: 'OWNERSHIP_CLAIMED',
        workItemId: id,
        newOwner: actorUser.name
      });

      const updated = this.getWorkItemById(id, actorUser);

      // SSE broadcast
      eventStream.broadcast('work_item_updated', {
        id,
        version: updated.version,
        action: 'CLAIMED',
        actor: actorUser.name,
        item: updated
      });

      return updated;
    });
  }

  /**
   * CRITICAL SITUATION 2: General OCC Update with Field Diffs
   */
  updateWorkItem(id, updates, actorUser, expectedVersion) {
    const db = getDatabase();

    return db.transaction(() => {
      const currentItem = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
      if (!currentItem) {
        throw new Error(`Work item '${id}' not found.`);
      }

      if (expectedVersion !== undefined && expectedVersion !== null) {
        if (currentItem.version !== parseInt(expectedVersion, 10)) {
          const conflictErr = new Error(`CONCURRENCY_CONFLICT: Your view (v${expectedVersion}) is stale. Server has version v${currentItem.version}.`);
          conflictErr.code = 'CONCURRENCY_CONFLICT';
          conflictErr.serverVersion = currentItem.version;
          conflictErr.serverItem = this.getWorkItemById(id, actorUser);
          throw conflictErr;
        }
      }

      const fieldsToUpdate = [];
      const params = [];

      // Check fields and track diffs for audit
      const allowedFields = ['title', 'description', 'priority', 'next_action_required', 'business_impact', 'reason_for_existence', 'owner_id'];
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined && updates[field] !== currentItem[field]) {
          fieldsToUpdate.push(`${field} = ?`);
          params.push(updates[field]);

          auditService.logEvent(db, {
            workItemId: id,
            actorId: actorUser.id,
            actionType: field === 'priority' ? 'PRIORITY_CHANGED' : 'UPDATED',
            fieldName: field,
            oldValue: currentItem[field],
            newValue: updates[field],
            comment: updates.comment || `Updated ${field}`
          });
        }
      }

      if (fieldsToUpdate.length === 0) {
        return this.getWorkItemById(id, actorUser);
      }

      fieldsToUpdate.push('version = version + 1');
      fieldsToUpdate.push("updated_at = datetime('now')");

      const updateSql = `
        UPDATE work_items 
        SET ${fieldsToUpdate.join(', ')} 
        WHERE id = ? AND version = ?
      `;
      params.push(id, currentItem.version);

      const result = db.prepare(updateSql).run(...params);

      if (result.changes === 0) {
        const freshItem = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
        const conflictErr = new Error('CONCURRENCY_CONFLICT: Another user updated this item concurrently.');
        conflictErr.code = 'CONCURRENCY_CONFLICT';
        conflictErr.serverVersion = freshItem.version;
        conflictErr.serverItem = this.getWorkItemById(id, actorUser);
        throw conflictErr;
      }

      const updated = this.getWorkItemById(id, actorUser);

      eventStream.broadcast('work_item_updated', {
        id,
        version: updated.version,
        action: 'UPDATED',
        actor: actorUser.name,
        item: updated
      });

      return updated;
    });
  }

  /**
   * CRITICAL SITUATION 3: State Machine Status Transition with Rule Enforcement
   */
  transitionStatus(id, targetStatus, payload, actorUser, expectedVersion) {
    const db = getDatabase();

    return db.transaction(() => {
      const currentItem = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
      if (!currentItem) {
        throw new Error(`Work item '${id}' not found.`);
      }

      if (expectedVersion !== undefined && expectedVersion !== null) {
        if (currentItem.version !== parseInt(expectedVersion, 10)) {
          const conflictErr = new Error(`CONCURRENCY_CONFLICT: Item was changed while you were reviewing. Current version is v${currentItem.version}.`);
          conflictErr.code = 'CONCURRENCY_CONFLICT';
          conflictErr.serverVersion = currentItem.version;
          conflictErr.serverItem = this.getWorkItemById(id, actorUser);
          throw conflictErr;
        }
      }

      // State machine validation
      validateTransition(currentItem, targetStatus, actorUser, payload);

      const resolutionSummary = payload.resolution_summary || currentItem.resolution_summary;
      const pendingApprovalRole = targetStatus === 'PENDING_APPROVAL' 
        ? (payload.pending_approval_role || 'TEAM_LEAD')
        : (targetStatus === 'RESOLVED' ? null : currentItem.pending_approval_role);

      const updateStmt = db.prepare(`
        UPDATE work_items 
        SET status = ?,
            resolution_summary = ?,
            pending_approval_role = ?,
            version = version + 1,
            updated_at = datetime('now')
        WHERE id = ? AND version = ?
      `);

      const result = updateStmt.run(
        targetStatus,
        resolutionSummary,
        pendingApprovalRole,
        id,
        currentItem.version
      );

      if (result.changes === 0) {
        const fresh = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
        const conflictErr = new Error('CONCURRENCY_CONFLICT: Status was changed by another user simultaneously.');
        conflictErr.code = 'CONCURRENCY_CONFLICT';
        conflictErr.serverVersion = fresh.version;
        conflictErr.serverItem = this.getWorkItemById(id, actorUser);
        throw conflictErr;
      }

      let actionType = 'STATUS_TRANSITION';
      if (currentItem.status === 'PENDING_APPROVAL' && targetStatus === 'RESOLVED') {
        actionType = 'APPROVAL_GRANTED';
      } else if (targetStatus === 'PENDING_APPROVAL') {
        actionType = 'APPROVAL_SUBMITTED';
      }

      auditService.logEvent(db, {
        workItemId: id,
        actorId: actorUser.id,
        actionType,
        fieldName: 'status',
        oldValue: currentItem.status,
        newValue: targetStatus,
        comment: payload.comment || `Transitioned status to ${targetStatus}`
      });

      outboxService.enqueue(db, id, 'NOTIFICATION_DISPATCH', {
        type: 'STATUS_CHANGED',
        workItemId: id,
        fromStatus: currentItem.status,
        toStatus: targetStatus,
        actor: actorUser.name
      });

      const updated = this.getWorkItemById(id, actorUser);

      eventStream.broadcast('work_item_updated', {
        id,
        version: updated.version,
        action: actionType,
        actor: actorUser.name,
        item: updated
      });

      return updated;
    });
  }

  /**
   * Appends collaborative comment to work item
   */
  addComment(id, message, actorUser) {
    const db = getDatabase();

    if (!message || message.trim() === '') {
      throw new Error('Comment message cannot be empty.');
    }

    return db.transaction(() => {
      const commentId = `cmt-${uuidv4()}`;

      db.prepare(`
        INSERT INTO comments (id, work_item_id, author_id, message, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(commentId, id, actorUser.id, message.trim());

      auditService.logEvent(db, {
        workItemId: id,
        actorId: actorUser.id,
        actionType: 'COMMENT_ADDED',
        comment: message.trim()
      });

      const updated = this.getWorkItemById(id, actorUser);

      eventStream.broadcast('comment_added', {
        workItemId: id,
        commentId,
        author: actorUser.name,
        message: message.trim()
      });

      return updated;
    });
  }
}

module.exports = new WorkItemService();
