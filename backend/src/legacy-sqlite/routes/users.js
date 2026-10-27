const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');

// GET /api/users - List users with their team memberships
router.get('/', (req, res) => {
  const db = getDatabase();
  const users = db.prepare('SELECT * FROM users ORDER BY name ASC').all();

  const userTeamsStmt = db.prepare(`
    SELECT ut.user_id, ut.team_id, ut.team_role, t.name as team_name, t.code as team_code
    FROM user_teams ut
    JOIN teams t ON ut.team_id = t.id
  `);
  const memberships = userTeamsStmt.all();

  const result = users.map(user => {
    const teams = memberships.filter(m => m.user_id === user.id);
    return {
      ...user,
      teams
    };
  });

  res.json(result);
});

// GET /api/users/me - Returns current user context
router.get('/me', (req, res) => {
  res.json(req.user);
});

module.exports = router;
