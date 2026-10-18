const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');

// GET /api/teams - List all teams with active item counts
router.get('/', (req, res) => {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      t.id, 
      t.name, 
      t.code, 
      t.description,
      COUNT(w.id) as total_items,
      SUM(CASE WHEN w.status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) as active_items
    FROM teams t
    LEFT JOIN work_items w ON t.id = w.team_id
    GROUP BY t.id
    ORDER BY t.name ASC
  `);
  const teams = stmt.all();
  res.json(teams);
});

module.exports = router;
