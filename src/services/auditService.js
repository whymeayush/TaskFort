const { v4: uuidv4 } = require('uuid');

class AuditService {
  /**
   * Records an immutable audit log entry within the active database transaction
   */
  logEvent(db, { workItemId, actorId, actionType, fieldName = null, oldValue = null, newValue = null, comment = null }) {
    const id = `aud-${uuidv4()}`;
    const stmt = db.prepare(`
      INSERT INTO audit_events (
        id, work_item_id, actor_id, action_type, field_name, old_value, new_value, comment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      id,
      workItemId,
      actorId,
      actionType,
      fieldName,
      oldValue !== null ? String(oldValue) : null,
      newValue !== null ? String(newValue) : null,
      comment
    );

    return id;
  }

  /**
   * Retrieves chronological audit history for a work item
   */
  getHistory(db, workItemId) {
    const stmt = db.prepare(`
      SELECT 
        a.id,
        a.work_item_id,
        a.actor_id,
        u.name as actor_name,
        u.email as actor_email,
        u.system_role as actor_role,
        a.action_type,
        a.field_name,
        a.old_value,
        a.new_value,
        a.comment,
        a.created_at
      FROM audit_events a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE a.work_item_id = ?
      ORDER BY a.created_at ASC, a.rowid ASC
    `);

    return stmt.all(workItemId);
  }
}

module.exports = new AuditService();
