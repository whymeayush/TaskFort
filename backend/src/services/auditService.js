import { ActivityLog } from '../models/ActivityLog.js';

export class AuditService {
  /**
   * Logs an immutable activity record within an active session
   */
  async logActivity({ workItemId, actorId, actionType, field = null, prevValue = null, newValue = null, comment = null, correlationId = null }, session = null) {
    const opts = session ? { session } : {};
    const log = new ActivityLog({
      workItemId,
      actorId,
      actionType,
      field,
      prevValue: prevValue !== null ? String(prevValue) : null,
      newValue: newValue !== null ? String(newValue) : null,
      comment,
      correlationId
    });

    await log.save(opts);
    return log;
  }

  /**
   * Retrieves chronological activity timeline for a work item
   */
  async getActivityTimeline(workItemId) {
    return ActivityLog.find({ workItemId })
      .populate('actorId', 'name email systemRole avatarColor')
      .sort({ timestamp: 1, _id: 1 })
      .lean();
  }
}

export const auditService = new AuditService();
