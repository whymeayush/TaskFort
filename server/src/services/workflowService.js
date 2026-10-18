export class WorkflowValidationError extends Error {
  constructor(message, code = 'INVALID_TRANSITION') {
    super(message);
    this.name = 'WorkflowValidationError';
    this.code = code;
    this.statusCode = 400;
  }
}

export const VALID_TRANSITIONS = {
  'Open': ['In Progress', 'Closed'],
  'In Progress': ['Blocked', 'In Review', 'Resolved', 'Closed'],
  'Blocked': ['In Progress', 'Closed'],
  'In Review': ['In Progress', 'Resolved', 'Closed'],
  'Resolved': ['Closed', 'In Progress'],
  'Closed': ['In Progress']
};

/**
 * Validates requested workflow transition against state machine rules
 */
export function validateTransition(item, targetStatus, actor, payload = {}) {
  const currentStatus = item.status;

  if (currentStatus === targetStatus) {
    throw new WorkflowValidationError(
      `Work item is already in status '${targetStatus}'.`,
      'NO_OP_TRANSITION'
    );
  }

  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new WorkflowValidationError(
      `Illegal transition: Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed.join(', ') || 'None'}`,
      'ILLEGAL_STATUS_TRANSITION'
    );
  }

  // Guard: Moving from In Review to Resolved requires approval from Team Admin or System Admin
  if (currentStatus === 'In Review' && targetStatus === 'Resolved') {
    const isSysAdmin = actor.isSystemAdmin || actor.systemRole === 'SYSTEM_ADMIN';
    const teamIdStr = item.teamId.toString();
    const isTeamLead = actor.memberships && actor.memberships.some(m => m.teamId === teamIdStr && m.roleInTeam === 'TEAM_ADMIN');

    if (!isSysAdmin && !isTeamLead) {
      throw new WorkflowValidationError(
        'Approval required: Only a Team Admin or System Admin can approve and resolve items in review.',
        'INSUFFICIENT_APPROVAL_PERMISSIONS'
      );
    }
  }

  // Guard: Transition to Resolved or Closed requires meaningful resolution summary
  if (targetStatus === 'Resolved' || (targetStatus === 'Closed' && currentStatus !== 'Open')) {
    const summary = (payload.resolutionSummary || item.resolutionSummary || '').trim();
    if (summary.length < 10) {
      throw new WorkflowValidationError(
        'A meaningful resolution summary (at least 10 characters) is required before resolving or closing a work item.',
        'MISSING_RESOLUTION_SUMMARY'
      );
    }
  }

  // Guard: Critical and High items must have an assigned owner before resolution
  if (['CRITICAL', 'HIGH'].includes(item.priority) && targetStatus === 'Resolved') {
    const assignee = payload.assigneeId || item.assigneeId;
    if (!assignee) {
      throw new WorkflowValidationError(
        `Cannot resolve ${item.priority} work item without an assigned responsible owner.`,
        'OWNER_REQUIRED_FOR_RESOLUTION'
      );
    }
  }

  // Guard: Reopening a Closed item requires Team Admin or System Admin
  if (currentStatus === 'Closed' && targetStatus === 'In Progress') {
    const isSysAdmin = actor.isSystemAdmin || actor.systemRole === 'SYSTEM_ADMIN';
    const teamIdStr = item.teamId.toString();
    const isTeamLead = actor.memberships && actor.memberships.some(m => m.teamId === teamIdStr && m.roleInTeam === 'TEAM_ADMIN');

    if (!isSysAdmin && !isTeamLead) {
      throw new WorkflowValidationError(
        'Only a Team Admin or System Administrator can reopen closed work items.',
        'INSUFFICIENT_REOPEN_PERMISSIONS'
      );
    }
  }

  return true;
}
