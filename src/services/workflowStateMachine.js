// Workflow State Machine: Enforces valid state transitions and guard conditions

const VALID_TRANSITIONS = {
  DRAFT: ['TRIAGED', 'CLOSED'],
  TRIAGED: ['IN_INVESTIGATION', 'CLOSED'],
  IN_INVESTIGATION: ['PENDING_APPROVAL', 'RESOLVED', 'CLOSED'],
  PENDING_APPROVAL: ['IN_INVESTIGATION', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_INVESTIGATION'],
  CLOSED: ['IN_INVESTIGATION']
};

class WorkflowValidationError extends Error {
  constructor(message, code = 'INVALID_TRANSITION') {
    super(message);
    this.name = 'WorkflowValidationError';
    this.code = code;
    this.statusCode = 400;
  }
}

/**
 * Validates a requested status transition
 * @param {Object} item Current work item
 * @param {string} targetStatus Proposed status
 * @param {Object} actor Current user executing transition
 * @param {Object} payload Additional transition payload (e.g. resolution_summary, pending_approval_role)
 */
function validateTransition(item, targetStatus, actor, payload = {}) {
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
      `Invalid state transition: Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowed.join(', ') || 'None'}`,
      'ILLEGAL_STATUS_TRANSITION'
    );
  }

  // Guard: Moving to PENDING_APPROVAL requires assigning an approval role
  if (targetStatus === 'PENDING_APPROVAL') {
    const role = payload.pending_approval_role || item.pending_approval_role || 'TEAM_LEAD';
    if (!['TEAM_LEAD', 'ADMIN', 'COMPLIANCE_LEAD'].includes(role)) {
      throw new WorkflowValidationError(
        `Invalid approval role: '${role}'. Must be TEAM_LEAD, ADMIN, or COMPLIANCE_LEAD.`,
        'INVALID_APPROVAL_ROLE'
      );
    }
  }

  // Guard: Approving an item from PENDING_APPROVAL to RESOLVED requires appropriate authority
  if (currentStatus === 'PENDING_APPROVAL' && targetStatus === 'RESOLVED') {
    const requiredRole = item.pending_approval_role || 'TEAM_LEAD';
    const isSystemAdmin = actor.system_role === 'ADMIN';
    const isTeamLead = actor.team_role === 'LEAD' ||
      actor.system_role === 'TEAM_LEAD' ||
      (actor.teams && actor.teams.some(t => t.team_id === item.team_id && t.team_role === 'LEAD'));

    if (!isSystemAdmin && !isTeamLead) {
      throw new WorkflowValidationError(
        `Unauthorized approval: Only a Team Lead or Admin can approve this item (required role: ${requiredRole}).`,
        'INSUFFICIENT_APPROVAL_PERMISSIONS'
      );
    }
  }

  // Guard: Transition to RESOLVED or CLOSED requires resolution summary
  if (targetStatus === 'RESOLVED' || (targetStatus === 'CLOSED' && currentStatus !== 'DRAFT')) {
    const summary = (payload.resolution_summary || item.resolution_summary || '').trim();
    if (summary.length < 10) {
      throw new WorkflowValidationError(
        'A meaningful resolution summary (at least 10 characters) is required before resolving or closing a work item.',
        'MISSING_RESOLUTION_SUMMARY'
      );
    }
  }

  // Guard: High and Critical priority items must have an assigned owner before resolution
  if (['CRITICAL', 'HIGH'].includes(item.priority) && targetStatus === 'RESOLVED') {
    const owner = payload.owner_id || item.owner_id;
    if (!owner) {
      throw new WorkflowValidationError(
        `Cannot resolve ${item.priority} work item without an assigned responsible owner.`,
        'OWNER_REQUIRED_FOR_RESOLUTION'
      );
    }
  }

  // Guard: Reopening a CLOSED item requires LEAD or ADMIN role
  if (currentStatus === 'CLOSED' && targetStatus === 'IN_INVESTIGATION') {
    const isLeadOrAdmin = actor.system_role === 'ADMIN' ||
      actor.system_role === 'TEAM_LEAD' ||
      actor.team_role === 'LEAD' ||
      (actor.teams && actor.teams.some(t => t.team_id === item.team_id && t.team_role === 'LEAD'));

    if (!isLeadOrAdmin) {
      throw new WorkflowValidationError(
        'Only a Team Lead or System Administrator can reopen a closed work item.',
        'INSUFFICIENT_REOPEN_PERMISSIONS'
      );
    }
  }

  return true;
}

module.exports = {
  VALID_TRANSITIONS,
  WorkflowValidationError,
  validateTransition
};
