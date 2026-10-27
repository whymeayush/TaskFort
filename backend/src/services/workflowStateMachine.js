// Workflow State Machine: Enforces valid state transitions and guard conditions

export const VALID_TRANSITIONS = {
  DRAFT: ['TRIAGED', 'CLOSED'],
  TRIAGED: ['IN_INVESTIGATION', 'CLOSED'],
  IN_INVESTIGATION: ['PENDING_APPROVAL', 'RESOLVED', 'CLOSED'],
  PENDING_APPROVAL: ['IN_INVESTIGATION', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_INVESTIGATION'],
  CLOSED: ['IN_INVESTIGATION']
};

export class WorkflowValidationError extends Error {
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

    if (!isSystemAdmin) {
      if (requiredRole === 'COMPLIANCE_LEAD' && actor.email !== 'elena.rostova@newtonite.internal') {
        throw new WorkflowValidationError(
          'Approval authority required: Only the Regulatory Compliance Lead can resolve compliance review tickets.',
          'INSUFFICIENT_APPROVAL_PERMISSIONS'
        );
      }
      if (requiredRole === 'ADMIN' && !isSystemAdmin) {
        throw new WorkflowValidationError(
          'Approval authority required: Only a System Administrator can resolve this ticket.',
          'INSUFFICIENT_APPROVAL_PERMISSIONS'
        );
      }
    }
  }

  // Guard: Transition to RESOLVED or CLOSED requires meaningful resolution summary
  if (targetStatus === 'RESOLVED' || (targetStatus === 'CLOSED' && currentStatus !== 'DRAFT')) {
    const summary = (payload.resolution_summary || item.resolution_summary || '').trim();
    if (summary.length < 10) {
      throw new WorkflowValidationError(
        'A meaningful resolution summary (at least 10 characters) is required before resolving or closing a work item.',
        'MISSING_RESOLUTION_SUMMARY'
      );
    }
  }

  // Guard: Confidential compliance and payment items require assigned ownership before investigation
  if (targetStatus === 'IN_INVESTIGATION' && (item.type === 'REGULATORY_COMPLIANCE' || item.type === 'PAYMENT_DISCREPANCY')) {
    const ownerId = item.owner_id || payload.owner_id;
    if (!ownerId) {
      throw new WorkflowValidationError(
        'Ownership assignment required: High-sensitivity items cannot enter investigation without an assigned operator.',
        'UNASSIGNED_SENSITIVE_ITEM'
      );
    }
  }

  return true;
}

export default {
  VALID_TRANSITIONS,
  WorkflowValidationError,
  validateTransition
};
