import { WorkItem } from '../models/WorkItem.js';
import { Approval } from '../models/Approval.js';
import { ActivityLog } from '../models/ActivityLog.js';

export async function getDashboardSummary(req, res, next) {
  try {
    const user = req.user;
    const baseQuery = { archivedAt: null };

    // Confidentiality isolation
    if (!user.isSystemAdmin) {
      baseQuery.$or = [
        { type: { $nin: ['COMPLIANCE_REQUEST', 'PAYMENT_INVESTIGATION'] } },
        { teamId: { $in: user.teamIds } }
      ];
    }

    const now = new Date();

    const [
      totalOpen,
      inProgress,
      highPriority,
      overdue,
      unassigned,
      pendingApprovalsCount,
      assignedToMeCount,
      myAssigned,
      recentUrgent,
      needsAttention,
      activityLogs
    ] = await Promise.all([
      // Total Open items
      WorkItem.countDocuments({ ...baseQuery, status: 'Open' }),
      // In-progress items
      WorkItem.countDocuments({ ...baseQuery, status: 'In Progress' }),
      // High & Critical items
      WorkItem.countDocuments({ ...baseQuery, priority: { $in: ['HIGH', 'CRITICAL'] }, status: { $nin: ['Resolved', 'Closed'] } }),
      // Overdue items
      WorkItem.countDocuments({ ...baseQuery, dueDate: { $lt: now }, status: { $nin: ['Resolved', 'Closed'] } }),
      // Unassigned items
      WorkItem.countDocuments({ ...baseQuery, assigneeId: null, status: { $nin: ['Resolved', 'Closed'] } }),
      // Pending Approvals
      Approval.countDocuments({ status: 'PENDING' }),
      // Assigned to me count
      WorkItem.countDocuments({ ...baseQuery, assigneeId: user._id, status: { $nin: ['Resolved', 'Closed'] } }),
      // My Assigned Work (limit 5)
      WorkItem.find({ ...baseQuery, assigneeId: user._id, status: { $nin: ['Resolved', 'Closed'] } })
        .populate('teamId', 'name code')
        .sort({ priority: 1, updatedAt: -1 })
        .limit(6)
        .lean(),
      // Urgent items (limit 5)
      WorkItem.find({ ...baseQuery, priority: { $in: ['CRITICAL', 'HIGH'] }, status: { $nin: ['Resolved', 'Closed'] } })
        .populate('teamId', 'name code')
        .populate('assigneeId', 'name avatarColor')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
      // Needs Attention items
      WorkItem.find({
        ...baseQuery,
        status: { $nin: ['Resolved', 'Closed'] },
        $or: [
          { dueDate: { $lt: now } },
          { assigneeId: null, priority: { $in: ['CRITICAL', 'HIGH'] } },
          { status: 'Blocked' },
          { status: 'In Review' }
        ]
      })
        .populate('teamId', 'name code')
        .populate('assigneeId', 'name avatarColor')
        .limit(6)
        .lean(),
      // Real Recent Activity Logs
      ActivityLog.find()
        .populate('actorId', 'name avatarColor email')
        .populate('workItemId', 'title')
        .sort({ timestamp: -1 })
        .limit(6)
        .lean()
    ]);

    res.json({
      metrics: {
        totalOpen,
        inProgress,
        highPriority,
        overdue,
        unassigned,
        assignedToMe: assignedToMeCount,
        pendingApprovals: pendingApprovalsCount
      },
      myAssigned,
      urgentItems: recentUrgent,
      needsAttention,
      activityLogs: (activityLogs || []).filter(log => log.actorId && log.workItemId)
    });
  } catch (err) {
    next(err);
  }
}
