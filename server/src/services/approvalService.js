import { Approval } from '../models/Approval.js';
import { WorkItem } from '../models/WorkItem.js';
import { auditService } from './auditService.js';
import { notificationService } from './notificationService.js';
import mongoose from 'mongoose';

export class ApprovalService {
  /**
   * Submits a work item for review/approval
   */
  async requestApproval(workItemId, approverRole, note, actor, expectedVersion = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const item = await WorkItem.findById(workItemId).session(session);
      if (!item) {
        const err = new Error('Work item not found');
        err.status = 404;
        throw err;
      }

      if (expectedVersion !== null && expectedVersion !== undefined) {
        if (item.version !== parseInt(expectedVersion, 10)) {
          const conflictErr = new Error('CONCURRENCY_CONFLICT: Item was changed concurrently.');
          conflictErr.code = 'CONCURRENCY_CONFLICT';
          conflictErr.serverVersion = item.version;
          conflictErr.serverItem = item;
          throw conflictErr;
        }
      }

      // Check for active pending approval
      const existing = await Approval.findOne({ workItemId, status: 'PENDING' }).session(session);
      if (existing) {
        const err = new Error('An approval request is already pending for this work item');
        err.status = 400;
        throw err;
      }

      const approval = new Approval({
        workItemId,
        requestedBy: actor._id,
        approverRole: approverRole || 'TEAM_ADMIN',
        status: 'PENDING',
        decisionNote: note || null
      });
      await approval.save({ session });

      const updatedItem = await WorkItem.findByIdAndUpdate(
        workItemId,
        {
          $set: {
            status: 'In Review',
            pendingApprovalRole: approverRole || 'TEAM_ADMIN'
          },
          $inc: { version: 1 }
        },
        { new: true, session }
      );

      await auditService.logActivity({
        workItemId,
        actorId: actor._id,
        actionType: 'APPROVAL_REQUESTED',
        field: 'status',
        prevValue: item.status,
        newValue: 'In Review',
        comment: `Submitted for ${approverRole} approval: ${note || 'No notes'}`
      }, session);

      await session.commitTransaction();
      return { approval, workItem: updatedItem };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Approves or Rejects an approval request
   */
  async decideApproval(approvalId, decision, decisionNote, actor) {
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      const err = new Error("Decision must be 'APPROVED' or 'REJECTED'");
      err.status = 400;
      throw err;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const approval = await Approval.findById(approvalId).session(session);
      if (!approval || approval.status !== 'PENDING') {
        const err = new Error('Approval request is no longer pending or does not exist');
        err.status = 400;
        throw err;
      }

      const item = await WorkItem.findById(approval.workItemId).session(session);
      if (!item) {
        const err = new Error('Work item not found');
        err.status = 404;
        throw err;
      }

      // Authorize approver
      const teamIdStr = item.teamId.toString();
      const isLead = actor.isSystemAdmin || (actor.memberships && actor.memberships.some(m => m.teamId === teamIdStr && m.roleInTeam === 'TEAM_ADMIN'));

      if (!isLead) {
        const err = new Error('Only a Team Admin or System Administrator can decide this approval.');
        err.status = 403;
        throw err;
      }

      approval.status = decision;
      approval.decidedBy = actor._id;
      approval.decisionNote = decisionNote || null;
      approval.decidedAt = new Date();
      await approval.save({ session });

      const newStatus = decision === 'APPROVED' ? 'Resolved' : 'In Progress';
      const updatedItem = await WorkItem.findByIdAndUpdate(
        item._id,
        {
          $set: {
            status: newStatus,
            pendingApprovalRole: null,
            resolutionSummary: decision === 'APPROVED' ? (decisionNote || 'Approved by leadership') : item.resolutionSummary
          },
          $inc: { version: 1 }
        },
        { new: true, session }
      );

      await auditService.logActivity({
        workItemId: item._id,
        actorId: actor._id,
        actionType: decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
        field: 'status',
        prevValue: item.status,
        newValue: newStatus,
        comment: `Decision: ${decision} by ${actor.name}. Note: ${decisionNote || 'None'}`
      }, session);

      await session.commitTransaction();

      // Notify requester
      notificationService.createNotification({
        recipientId: approval.requestedBy,
        type: 'APPROVAL_DECISION',
        workItemId: item._id,
        message: `Your approval request for '${item.title}' was ${decision.toLowerCase()} by ${actor.name}`
      }).catch(() => {});

      return { approval, workItem: updatedItem };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export const approvalService = new ApprovalService();
