import { WorkItem } from '../models/WorkItem.js';

export function requireSystemRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }

    if (req.user.isSystemAdmin) {
      return next();
    }

    if (!allowedRoles.includes(req.user.systemRole)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Action requires one of system roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
}

export function authorizeWorkItemAccess(action = 'read') {
  return async (req, res, next) => {
    try {
      const itemId = req.params.id;
      if (!itemId) return next();

      const item = await WorkItem.findById(itemId);
      if (!item) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: `Work item '${itemId}' not found`
        });
      }

      req.targetItem = item;

      // System Admin has universal override
      if (req.user.isSystemAdmin) {
        return next();
      }

      const teamIdStr = item.teamId.toString();
      const userMembership = req.user.memberships.find(m => m.teamId === teamIdStr);
      const isMember = Boolean(userMembership);

      // 1. Confidential item protection (Compliance and Payments)
      const isConfidential = ['COMPLIANCE_REQUEST', 'PAYMENT_INVESTIGATION'].includes(item.type);
      if (isConfidential && !isMember) {
        return res.status(403).json({
          error: 'RESOURCE_ACCESS_DENIED',
          message: `Confidential work item: Access restricted to authorized members of this team.`
        });
      }

      // 2. Read-only users cannot perform mutating actions
      if (action !== 'read') {
        if (!isMember) {
          return res.status(403).json({
            error: 'RESOURCE_ACCESS_DENIED',
            message: 'You can only modify work items belonging to your authorized teams.'
          });
        }

        if (userMembership.roleInTeam === 'READ_ONLY_VIEWER' || req.user.systemRole === 'READ_ONLY_VIEWER') {
          return res.status(403).json({
            error: 'FORBIDDEN',
            message: 'Read-only viewers cannot create, modify, or claim work items.'
          });
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
