import { WorkItem } from '../models/WorkItem.js';
import { Comment } from '../models/Comment.js';
import { Approval } from '../models/Approval.js';
import { auditService } from './auditService.js';
import { validateTransition } from './workflowService.js';
import mongoose from 'mongoose';

export class WorkItemService {
  /**
   * Creates a new operational work item
   */
  async createWorkItem(data, actor) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        title,
        description,
        type,
        priority = 'MEDIUM',
        teamId,
        reasonForExistence,
        businessImpact,
        nextActionRequired,
        dueDate,
        tags = [],
        assigneeId = null
      } = data;

      const item = new WorkItem({
        title: title.trim(),
        description: description.trim(),
        type,
        status: 'Open',
        priority,
        teamId,
        createdBy: actor._id,
        assigneeId,
        reasonForExistence: reasonForExistence.trim(),
        businessImpact: businessImpact.trim(),
        nextActionRequired: (nextActionRequired || 'Triage and assign responsible owner').trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        tags,
        version: 1
      });

      await item.save({ session });

      await auditService.logActivity({
        workItemId: item._id,
        actorId: actor._id,
        actionType: 'CREATED',
        comment: `Work item created by ${actor.name}`
      }, session);

      await session.commitTransaction();

      return WorkItem.findById(item._id)
        .populate('teamId', 'name code')
        .populate('createdBy', 'name email avatarColor')
        .populate('assigneeId', 'name email avatarColor');
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieves single work item with activity timeline and comments
   */
  async getWorkItemById(id) {
    const item = await WorkItem.findById(id)
      .populate('teamId', 'name code')
      .populate('createdBy', 'name email avatarColor')
      .populate('assigneeId', 'name email avatarColor');

    if (!item) return null;

    const [timeline, comments, pendingApproval] = await Promise.all([
      auditService.getActivityTimeline(id),
      Comment.find({ workItemId: id }).populate('authorId', 'name email avatarColor').sort({ createdAt: 1 }).lean(),
      Approval.findOne({ workItemId: id, status: 'PENDING' }).populate('requestedBy', 'name email').lean()
    ]);

    return {
      ...item.toObject(),
      timeline,
      comments,
      pendingApproval
    };
  }

  /**
   * Lists work items with server-side pagination, filters, and indexed search
   */
  async listWorkItems({
    page = 1,
    limit = 15,
    teamId = null,
    status = null,
    priority = null,
    type = null,
    assigneeId = null,
    search = null,
    needsAttention = false,
    currentUser
  }) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (parsedPage - 1) * parsedLimit;

    const query = { archivedAt: null };

    // Confidential items isolation
    if (!currentUser.isSystemAdmin) {
      query.$or = [
        { type: { $nin: ['COMPLIANCE_REQUEST', 'PAYMENT_INVESTIGATION'] } },
        { teamId: { $in: currentUser.teamIds } }
      ];
    }

    if (teamId && teamId !== 'ALL') {
      query.teamId = teamId;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (priority && priority !== 'ALL') {
      query.priority = priority;
    }

    if (type && type !== 'ALL') {
      query.type = type;
    }

    if (assigneeId) {
      if (assigneeId === 'UNASSIGNED') {
        query.assigneeId = null;
      } else {
        query.assigneeId = assigneeId;
      }
    }

    // "Needs Attention" filter
    if (needsAttention === true || needsAttention === 'true') {
      query.$or = [
        { status: 'In Review' },
        { status: 'Blocked' },
        { assigneeId: null, priority: { $in: ['CRITICAL', 'HIGH'] } },
        { assigneeId: currentUser._id, status: { $in: ['Open', 'In Progress'] } }
      ];
    }

    // Search query across indexed fields
    if (search && search.trim() !== '') {
      const term = search.trim();
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
          { reasonForExistence: { $regex: term, $options: 'i' } }
        ]
      });
    }

    const [items, total] = await Promise.all([
      WorkItem.find(query)
        .populate('teamId', 'name code')
        .populate('assigneeId', 'name email avatarColor')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      WorkItem.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / parsedLimit) || 1;

    return {
      items,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalItems: total,
        totalPages,
        hasMore: parsedPage < totalPages
      }
    };
  }

  /**
   * CRITICAL REQUIREMENT B: Stale-Version Rejection with OCC
   */
  async updateWorkItem(id, updates, actor, expectedVersion = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const current = await WorkItem.findById(id).session(session);
      if (!current) {
        const err = new Error('Work item not found');
        err.status = 404;
        throw err;
      }

      // Concurrency check
      if (expectedVersion !== null && expectedVersion !== undefined) {
        if (current.version !== parseInt(expectedVersion, 10)) {
          const conflictErr = new Error(`CONCURRENCY_CONFLICT: Stale update rejected. Expected v${expectedVersion}, server has v${current.version}.`);
          conflictErr.code = 'CONCURRENCY_CONFLICT';
          conflictErr.serverVersion = current.version;
          conflictErr.serverItem = current;
          throw conflictErr;
        }
      }

      const allowedFields = ['title', 'description', 'priority', 'nextActionRequired', 'businessImpact', 'reasonForExistence', 'dueDate'];
      const fieldDiffs = [];

      for (const field of allowedFields) {
        if (updates[field] !== undefined && String(updates[field]) !== String(current[field])) {
          fieldDiffs.push({
            field,
            prevValue: current[field],
            newValue: updates[field]
          });
          current[field] = updates[field];
        }
      }

      if (fieldDiffs.length === 0) {
        await session.abortTransaction();
        return this.getWorkItemById(id);
      }

      current.version += 1;
      await current.save({ session });

      for (const diff of fieldDiffs) {
        await auditService.logActivity({
          workItemId: id,
          actorId: actor._id,
          actionType: diff.field === 'priority' ? 'PRIORITY_CHANGE' : 'FIELD_UPDATE',
          field: diff.field,
          prevValue: diff.prevValue,
          newValue: diff.newValue,
          comment: updates.comment || `Updated ${diff.field}`
        }, session);
      }

      await session.commitTransaction();
      return this.getWorkItemById(id);
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Workflow State Machine transition
   */
  async transitionStatus(id, targetStatus, payload, actor, expectedVersion = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const current = await WorkItem.findById(id).session(session);
      if (!current) {
        const err = new Error('Work item not found');
        err.status = 404;
        throw err;
      }

      if (expectedVersion !== null && expectedVersion !== undefined) {
        if (current.version !== parseInt(expectedVersion, 10)) {
          const conflictErr = new Error(`CONCURRENCY_CONFLICT: Work item modified concurrently.`);
          conflictErr.code = 'CONCURRENCY_CONFLICT';
          conflictErr.serverVersion = current.version;
          conflictErr.serverItem = current;
          throw conflictErr;
        }
      }

      validateTransition(current, targetStatus, actor, payload);

      const prevStatus = current.status;
      current.status = targetStatus;
      current.version += 1;

      if (payload.resolutionSummary) {
        current.resolutionSummary = payload.resolutionSummary.trim();
      }

      if (targetStatus === 'In Review') {
        current.pendingApprovalRole = payload.pendingApprovalRole || 'TEAM_ADMIN';
      } else if (targetStatus === 'Resolved') {
        current.pendingApprovalRole = null;
      }

      await current.save({ session });

      await auditService.logActivity({
        workItemId: id,
        actorId: actor._id,
        actionType: 'STATUS_CHANGE',
        field: 'status',
        prevValue: prevStatus,
        newValue: targetStatus,
        comment: payload.comment || `Status transitioned to ${targetStatus}`
      }, session);

      await session.commitTransaction();
      return this.getWorkItemById(id);
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Collaboration comment
   */
  async addComment(id, body, actor) {
    if (!body || !body.trim()) {
      const err = new Error('Comment body cannot be empty');
      err.status = 400;
      throw err;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const comment = new Comment({
        workItemId: id,
        authorId: actor._id,
        body: body.trim()
      });
      await comment.save({ session });

      await auditService.logActivity({
        workItemId: id,
        actorId: actor._id,
        actionType: 'COMMENT_ADDED',
        comment: body.trim()
      }, session);

      await session.commitTransaction();
      return comment;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export const workItemService = new WorkItemService();
