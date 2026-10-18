import { approvalService } from '../services/approvalService.js';
import { Approval } from '../models/Approval.js';

export async function requestApproval(req, res, next) {
  try {
    const { approverRole = 'TEAM_ADMIN', note, expectedVersion } = req.body;
    const result = await approvalService.requestApproval(
      req.params.id,
      approverRole,
      note,
      req.user,
      expectedVersion
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function decideApproval(req, res, next) {
  try {
    const { decision, decisionNote } = req.body;
    const result = await approvalService.decideApproval(
      req.params.id,
      decision,
      decisionNote,
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listPendingApprovals(req, res, next) {
  try {
    const userTeamIds = req.user.teamIds;
    const approvals = await Approval.find({ status: 'PENDING' })
      .populate({
        path: 'workItemId',
        select: 'title type priority status teamId',
        populate: { path: 'teamId', select: 'name code' }
      })
      .populate('requestedBy', 'name email avatarColor')
      .sort({ createdAt: -1 })
      .lean();

    // Filter to user's authorized teams unless System Admin
    const authorizedApprovals = req.user.isSystemAdmin
      ? approvals
      : approvals.filter(a => a.workItemId && userTeamIds.includes(a.workItemId.teamId._id.toString()));

    res.json(authorizedApprovals);
  } catch (err) {
    next(err);
  }
}
