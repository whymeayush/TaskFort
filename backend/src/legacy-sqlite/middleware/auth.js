const { getDatabase } = require('../db/database');

/**
 * Resolves active user context and team memberships
 */
function resolveUser(req, res, next) {
  const db = getDatabase();
  
  // Public non-API routes and SSE events do not require authentication headers
  if (!req.path.startsWith('/api') || req.path === '/api/events') {
    req.user = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-alice');
    if (req.user) {
      req.user.teams = db.prepare(`
        SELECT ut.team_id, ut.team_role, t.name as team_name, t.code as team_code
        FROM user_teams ut
        JOIN teams t ON ut.team_id = t.id
        WHERE ut.user_id = ?
      `).all(req.user.id);
      req.user.teamIds = req.user.teams.map(t => t.team_id);
      req.user.isTeamLead = req.user.system_role === 'ADMIN' || req.user.teams.some(t => t.team_role === 'LEAD');
    }
    return next();
  }

  const userId = req.headers['x-user-id'] || req.query.userId;

  if (!userId) {
    return res.status(401).json({
      error: 'UNAUTHENTICATED',
      message: 'Missing required X-User-Id authentication header.'
    });
  }

  const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = userStmt.get(userId);

  if (!user) {
    return res.status(401).json({
      error: 'UNAUTHENTICATED',
      message: `Unknown user ID: ${userId}`
    });
  }

  // Load team memberships
  const teamsStmt = db.prepare(`
    SELECT ut.team_id, ut.team_role, t.name as team_name, t.code as team_code
    FROM user_teams ut
    JOIN teams t ON ut.team_id = t.id
    WHERE ut.user_id = ?
  `);
  const teams = teamsStmt.all(userId);

  req.user = {
    ...user,
    teams,
    teamIds: teams.map(t => t.team_id),
    isTeamLead: user.system_role === 'ADMIN' || teams.some(t => t.team_role === 'LEAD')
  };

  next();
}

/**
 * Enforces system-level or team-level role
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }

    if (req.user.system_role === 'ADMIN') {
      return next();
    }

    const hasRole = allowedRoles.includes(req.user.system_role);
    if (!hasRole) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Action requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.system_role}`
      });
    }

    next();
  };
}

/**
 * Enforces resource-level authorization
 * Handles confidential work items (e.g., Compliance, Payments)
 */
function authorizeResourceAccess(action = 'read') {
  return (req, res, next) => {
    const db = getDatabase();
    const itemId = req.params.id;

    if (!itemId) return next();

    const item = db.prepare('SELECT * FROM work_items WHERE id = ?').get(itemId);
    if (!item) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Work item '${itemId}' not found.`
      });
    }

    req.targetItem = item;

    // Admins have universal access
    if (req.user.system_role === 'ADMIN') {
      return next();
    }

    // Auditors have read-only access
    if (req.user.system_role === 'AUDITOR' && action !== 'read') {
      return res.status(403).json({
        error: 'RESOURCE_ACCESS_DENIED',
        message: 'Auditors have read-only access and cannot modify work items.'
      });
    }

    const isMemberOfOwningTeam = req.user.teamIds.includes(item.team_id);

    // Confidential Work Item Types: Strictly restricted to owning team
    const isConfidential = ['COMPLIANCE_REQUEST', 'PAYMENT_INVESTIGATION'].includes(item.type);

    if (isConfidential && !isMemberOfOwningTeam) {
      return res.status(403).json({
        error: 'RESOURCE_ACCESS_DENIED',
        message: `Confidential ${item.type.replace('_', ' ')}: Access restricted to members of ${item.team_id}.`
      });
    }

    // Mutating actions require owning team membership
    if (action === 'mutate' && !isMemberOfOwningTeam) {
      return res.status(403).json({
        error: 'RESOURCE_ACCESS_DENIED',
        message: 'You can only modify or claim work items assigned to your team.'
      });
    }

    next();
  };
}

module.exports = {
  resolveUser,
  requireRole,
  authorizeResourceAccess
};
