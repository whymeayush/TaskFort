import { WorkItem } from '../models/WorkItem.js';
import { auditService } from './auditService.js';
import { notificationService } from './notificationService.js';
import mongoose from 'mongoose';

export class AssignmentService {
  /**
   * CRITICAL REQUIREMENT A: Atomic Concurrent Claim
   * Uses conditional atomic update to guarantee exactly one claim succeeds
   */
  async claimWorkItem(workItemId, actor, expectedVersion = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const current = await WorkItem.findById(workItemId).session(session);
      if (!current) {
        const err = new Error(`Work item '${workItemId}' not found`);
        err.status = 404;
        throw err;
      }

      // Check version if provided
      if (expectedVersion !== null && expectedVersion !== undefined) {
        if (current.version !== parseInt(expectedVersion, 10)) {
          const conflictErr = new Error('CONCURRENCY_CONFLICT: Your view of this work item is stale.');
          conflictErr.code = 'CONCURRENCY_CONFLICT';
          conflictErr.serverVersion = current.version;
          conflictErr.serverItem = current;
          throw conflictErr;
        }
      }

      // Check if already claimed
      if (current.assigneeId) {
        const conflictErr = new Error('CONCURRENCY_CONFLICT: This work item has already been claimed by another operator.');
        conflictErr.code = 'CONCURRENCY_CONFLICT';
        conflictErr.serverVersion = current.version;
        conflictErr.serverItem = current;
        throw conflictErr;
      }

      // Atomic conditional update
      const updated = await WorkItem.findOneAndUpdate(
        {
          _id: workItemId,
          assigneeId: null,
          version: current.version
        },
        {
          $set: {
            assigneeId: actor._id,
            status: current.status === 'Open' ? 'In Progress' : current.status
          },
          $inc: { version: 1 }
        },
        { new: true, session }
      ).populate('assigneeId', 'name email avatarColor')
       .populate('teamId', 'name code')
       .populate('createdBy', 'name email');

      if (!updated) {
        const fresh = await WorkItem.findById(workItemId);
        const conflictErr = new Error('CONCURRENCY_CONFLICT: Race condition detected. Another user claimed this work item simultaneously.');
        conflictErr.code = 'CONCURRENCY_CONFLICT';
        conflictErr.serverVersion = fresh ? fresh.version : current.version;
        conflictErr.serverItem = fresh;
        throw conflictErr;
      }

      // Record immutable audit log
      await auditService.logActivity({
        workItemId: updated._id,
        actorId: actor._id,
        actionType: 'ASSIGNED',
        field: 'assigneeId',
        prevValue: null,
        newValue: actor.name,
        comment: `${actor.name} claimed responsibility for this work item`
      }, session);

      await session.commitTransaction();

      // Trigger secondary notification (outside transaction)
      notificationService.createNotification({
        recipientId: actor._id,
        type: 'ASSIGNMENT',
        workItemId: updated._id,
        message: `You successfully claimed responsibility for: ${updated.title}`
      }).catch(() => {});

      return updated;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reassign work item to an authorized team member
   */
  async reassignWorkItem(workItemId, targetAssigneeId, actor, expectedVersion = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const current = await WorkItem.findById(workItemId).session(session);
      if (!current) {
        const err = new Error(`Work item '${workItemId}' not found`);
        err.status = 404;
        throw err;
      }

      if (expectedVersion !== null && expectedVersion !== undefined) {
        if (current.version !== parseInt(expectedVersion, 10)) {
          const conflictErr = new Error('CONCURRENCY_CONFLICT: Record was modified by another operator.');
          conflictErr.code = 'CONCURRENCY_CONFLICT';
          conflictErr.serverVersion = current.version;
          conflictErr.serverItem = current;
          throw conflictErr;
        }
      }

      const prevAssignee = current.assigneeId;

      const updated = await WorkItem.findOneAndUpdate(
        {
          _id: workItemId,
          version: current.version
        },
        {
          $set: { assigneeId: targetAssigneeId },
          $inc: { version: 1 }
        },
        { new: true, session }
      ).populate('assigneeId', 'name email avatarColor')
       .populate('teamId', 'name code');

      if (!updated) {
        const fresh = await WorkItem.findById(workItemId);
        const conflictErr = new Error('CONCURRENCY_CONFLICT: Assignment conflict detected.');
        conflictErr.code = 'CONCURRENCY_CONFLICT';
        conflictErr.serverVersion = fresh.version;
        conflictErr.serverItem = fresh;
        throw conflictErr;
      }

      await auditService.logActivity({
        workItemId: updated._id,
        actorId: actor._id,
        actionType: 'REASSIGNED',
        field: 'assigneeId',
        prevValue: prevAssignee ? prevAssignee.toString() : 'Unassigned',
        newValue: targetAssigneeId ? targetAssigneeId.toString() : 'Unassigned',
        comment: `Reassigned by ${actor.name}`
      }, session);

      await session.commitTransaction();
      return updated;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export const assignmentService = new AssignmentService();
