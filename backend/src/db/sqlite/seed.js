const { getDatabase } = require('./database');
const { v4: uuidv4 } = require('uuid');

function seedDatabase(db = null) {
  const database = db || getDatabase();

  database.transaction(() => {
    // Clear existing data for fresh seed if needed
    database.exec(`
      DELETE FROM comments;
      DELETE FROM audit_events;
      DELETE FROM outbox_jobs;
      DELETE FROM idempotency_keys;
      DELETE FROM work_items;
      DELETE FROM user_teams;
      DELETE FROM users;
      DELETE FROM teams;
    `);

    // Insert Teams
    const insertTeam = database.prepare(`
      INSERT INTO teams (id, name, code, description) VALUES (?, ?, ?, ?)
    `);

    insertTeam.run('team-ops', 'Operations Team', 'OPS', 'Central operational workflows, escalations and daily task management');
    insertTeam.run('team-eng', 'Core Engineering', 'ENG', 'Infrastructure, production incident response, and service reliability');
    insertTeam.run('team-pay', 'Payment Operations', 'PAYMENTS', 'Payment gateway anomalies, reconciliation, wire clearance, and fraud investigations');
    insertTeam.run('team-comp', 'Regulatory Compliance', 'COMPLIANCE', 'Statutory filings, GDPR/CCPA requests, AML investigations, and audit approvals');
    insertTeam.run('team-sup', 'Tier-3 Support', 'SUPPORT', 'High-priority VIP customer escalations and enterprise issue resolution');

    // Insert Users
    const insertUser = database.prepare(`
      INSERT INTO users (id, name, email, system_role, avatar_color) VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run('usr-alice', 'Alice Chen', 'alice.chen@newtonite.internal', 'TEAM_LEAD', '#8b5cf6');
    insertUser.run('usr-bob', 'Bob Miller', 'bob.miller@newtonite.internal', 'OPERATOR', '#3b82f6');
    insertUser.run('usr-elena', 'Elena Rostova', 'elena.rostova@newtonite.internal', 'TEAM_LEAD', '#ec4899');
    insertUser.run('usr-marcus', 'Marcus Vance', 'marcus.vance@newtonite.internal', 'OPERATOR', '#10b981');
    insertUser.run('usr-david', 'David Kim', 'david.kim@newtonite.internal', 'TEAM_LEAD', '#f59e0b');
    insertUser.run('usr-sarah', 'Sarah Connor', 'sarah.connor@newtonite.internal', 'OPERATOR', '#06b6d4');
    insertUser.run('usr-admin', 'System Administrator', 'admin@newtonite.internal', 'ADMIN', '#64748b');

    // Insert User-Team Memberships
    const insertUserTeam = database.prepare(`
      INSERT INTO user_teams (user_id, team_id, team_role) VALUES (?, ?, ?)
    `);

    insertUserTeam.run('usr-alice', 'team-ops', 'LEAD');
    insertUserTeam.run('usr-bob', 'team-ops', 'MEMBER');
    insertUserTeam.run('usr-elena', 'team-comp', 'LEAD');
    insertUserTeam.run('usr-marcus', 'team-pay', 'MEMBER');
    insertUserTeam.run('usr-david', 'team-eng', 'LEAD');
    insertUserTeam.run('usr-sarah', 'team-sup', 'MEMBER');
    insertUserTeam.run('usr-admin', 'team-ops', 'LEAD');
    insertUserTeam.run('usr-admin', 'team-eng', 'LEAD');
    insertUserTeam.run('usr-admin', 'team-comp', 'LEAD');
    insertUserTeam.run('usr-admin', 'team-pay', 'LEAD');

    // Work items seed helper
    const insertItem = database.prepare(`
      INSERT INTO work_items (
        id, title, description, type, status, priority, team_id, owner_id,
        created_by, reason_for_existence, business_impact, next_action_required,
        pending_approval_role, resolution_summary, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAudit = database.prepare(`
      INSERT INTO audit_events (
        id, work_item_id, actor_id, action_type, field_name, old_value, new_value, comment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertComment = database.prepare(`
      INSERT INTO comments (id, work_item_id, author_id, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const now = new Date();
    const subHours = (h) => new Date(now.getTime() - h * 3600 * 1000).toISOString();

    // 1. Production Incident
    insertItem.run(
      'WI-1001',
      'Database connection pool exhaustion on payment gateway router',
      'Telemetry alert triggered: Payment processing ingress nodes report 100% pool saturation. 42 transactions received HTTP 504 gateway timeout.',
      'PRODUCTION_INCIDENT',
      'IN_INVESTIGATION',
      'CRITICAL',
      'team-eng',
      'usr-david',
      'usr-bob',
      'Automated health probe failed 3 consecutive checks under peak load',
      'Direct revenue impact: $38,000/minute during checkout failures',
      'Determine root cause of connection leak in microservice v2.14.0 and deploy hotfix',
      null,
      null,
      3,
      subHours(4),
      subHours(1)
    );

    insertAudit.run('aud-101', 'WI-1001', 'usr-bob', 'CREATED', null, null, null, 'Reported incident after monitoring alert tripped', subHours(4));
    insertAudit.run('aud-102', 'WI-1001', 'usr-bob', 'PRIORITY_CHANGED', 'priority', 'HIGH', 'CRITICAL', 'Upgraded to CRITICAL due to revenue risk', subHours(3.5));
    insertAudit.run('aud-103', 'WI-1001', 'usr-david', 'CLAIMED', 'owner_id', null, 'usr-david', 'David Kim claimed ownership as Eng Lead', subHours(3));
    insertAudit.run('aud-104', 'WI-1001', 'usr-david', 'STATUS_TRANSITION', 'status', 'TRIAGED', 'IN_INVESTIGATION', 'Beginning memory dump and trace inspection', subHours(1));

    insertComment.run('cmt-101', 'WI-1001', 'usr-david', 'Isolated the leak to the deadlocked connection pool in query batcher. Preparing PR #842.', subHours(1.5));
    insertComment.run('cmt-102', 'WI-1001', 'usr-alice', 'Ops has temporarily re-routed 30% of traffic to standby secondary cluster.', subHours(1));

    // 2. Payment Investigation (Requires Lead Approval)
    insertItem.run(
      'WI-1002',
      'Wire transfer discrepancy #TRX-9482 for enterprise client ($145,000 pending clearance)',
      'Reconciliation job detected unmatched Fedwire message ID 9948210. Beneficiary account mismatch flagged by compliance rules.',
      'PAYMENT_INVESTIGATION',
      'PENDING_APPROVAL',
      'HIGH',
      'team-pay',
      'usr-marcus',
      'usr-marcus',
      'Automated SWIFT/Fedwire settlement ledger discrepancy flag',
      'Funds withheld; client relations risk and potential settlement penalty',
      'Requires Team Lead or Compliance sign-off before manual release or reversal',
      'TEAM_LEAD',
      null,
      2,
      subHours(6),
      subHours(2)
    );

    insertAudit.run('aud-201', 'WI-1002', 'usr-marcus', 'CREATED', null, null, null, 'Initiated discrepancy investigation file', subHours(6));
    insertAudit.run('aud-202', 'WI-1002', 'usr-marcus', 'STATUS_TRANSITION', 'status', 'IN_INVESTIGATION', 'PENDING_APPROVAL', 'Completed beneficiary KYC re-check; submitted for Lead approval', subHours(2));

    insertComment.run('cmt-201', 'WI-1002', 'usr-marcus', 'Verified client signed authorization form. Need Elena or Alice to sign off on the override.', subHours(2));

    // 3. Compliance Request
    insertItem.run(
      'WI-1003',
      'GDPR Article 17 Right to Erasure request for account ACCT-49102',
      'European citizen request received via DPO channel. Requires scrubbing PII across primary storage, backups, and analytical warehouses within 30-day statutory window.',
      'COMPLIANCE_REQUEST',
      'IN_INVESTIGATION',
      'HIGH',
      'team-comp',
      'usr-elena',
      'usr-elena',
      'Statutory legal mandate with mandatory regulatory deadline',
      'Risk of GDPR sanction up to 4% of global annual turnover if missed',
      'Audit secondary data lakes and confirm retention exclusions before purge execution',
      null,
      null,
      2,
      subHours(24),
      subHours(8)
    );

    insertAudit.run('aud-301', 'WI-1003', 'usr-elena', 'CREATED', null, null, null, 'Formal compliance docket opened', subHours(24));
    insertAudit.run('aud-302', 'WI-1003', 'usr-elena', 'CLAIMED', 'owner_id', null, 'usr-elena', 'Elena Rostova assigned to lead statutory compliance', subHours(20));

    // 4. Customer Issue (Needs Triage)
    insertItem.run(
      'WI-1004',
      'Enterprise customer Acme Corp reporting webhook delivery failures',
      'Acme Corp integration engineers report intermittent 410 Gone and 502 Bad Gateway responses when receiving order sync webhooks.',
      'CUSTOMER_ISSUE',
      'TRIAGED',
      'MEDIUM',
      'team-sup',
      null,
      'usr-sarah',
      'Customer ticket escalation #CS-88910',
      'Key account renewal at risk if webhook drops trigger missing fulfillment orders',
      'Assign an operator to check retry logs and inspect target webhook endpoint latency',
      null,
      null,
      1,
      subHours(12),
      subHours(5)
    );

    insertAudit.run('aud-401', 'WI-1004', 'usr-sarah', 'CREATED', null, null, null, 'Escalated from Zendesk ticket by Sarah Connor', subHours(12));
    insertAudit.run('aud-402', 'WI-1004', 'usr-sarah', 'STATUS_TRANSITION', 'status', 'DRAFT', 'TRIAGED', 'Validated reproduction steps and moved to triage queue', subHours(5));

    // 5. Engineering Problem
    insertItem.run(
      'WI-1005',
      'Memory leak in WebSocket event distributor daemon',
      'Resident memory size climbs from 250MB to 1.8GB over a 48-hour window on internal dispatch nodes, causing OS OOM kills.',
      'ENGINEERING_PROBLEM',
      'IN_INVESTIGATION',
      'MEDIUM',
      'team-eng',
      null,
      'usr-david',
      'Grafana node memory alert notification',
      'Periodic service restart causes brief 3-5 second disconnects for connected dashboard clients',
      'Take heap snapshot before next scheduled recycle and identify uncollected event listeners',
      null,
      null,
      1,
      subHours(36),
      subHours(18)
    );

    insertAudit.run('aud-501', 'WI-1005', 'usr-david', 'CREATED', null, null, null, 'Engineering task created from monitoring trend', subHours(36));

    // 6. Operational Approval
    insertItem.run(
      'WI-1006',
      'Quarterly database index reorganization and maintenance window',
      'Scheduled maintenance window to rebuild fragmented B-tree indexes on transactional audit tables during Sunday low-traffic window (02:00 UTC).',
      'OPERATIONAL_APPROVAL',
      'PENDING_APPROVAL',
      'LOW',
      'team-ops',
      'usr-bob',
      'usr-bob',
      'Routine infrastructure maintenance procedure #MNT-2026-Q4',
      'Read lock on audit logs for approximately 4 minutes during index swap',
      'Requires Ops Lead sign-off on change window communication',
      'TEAM_LEAD',
      null,
      2,
      subHours(48),
      subHours(24)
    );

    insertAudit.run('aud-601', 'WI-1006', 'usr-bob', 'CREATED', null, null, null, 'Change request drafted by Bob Miller', subHours(48));
    insertAudit.run('aud-602', 'WI-1006', 'usr-bob', 'STATUS_TRANSITION', 'status', 'DRAFT', 'PENDING_APPROVAL', 'Submitted for leadership approval', subHours(24));

    // 7. Resolved Item
    insertItem.run(
      'WI-1007',
      'Billing statement missing transaction lines for EMEA accounts',
      'PDF generation service omitted currency formatting on multi-currency sub-ledgers.',
      'CUSTOMER_ISSUE',
      'RESOLVED',
      'LOW',
      'team-pay',
      'usr-marcus',
      'usr-alice',
      'Customer billing inquiry ticket',
      'Minor customer confusion regarding net VAT subtotals',
      'None - patch deployed and verified in release 2.13.9',
      null,
      'Deployed template fix in commit e3a8b2. Re-generated and sent corrected PDF statements to 14 affected accounts.',
      4,
      subHours(72),
      subHours(12)
    );

    insertAudit.run('aud-701', 'WI-1007', 'usr-alice', 'CREATED', null, null, null, 'Created from billing queue', subHours(72));
    insertAudit.run('aud-702', 'WI-1007', 'usr-marcus', 'CLAIMED', 'owner_id', null, 'usr-marcus', 'Marcus claimed ticket', subHours(60));
    insertAudit.run('aud-703', 'WI-1007', 'usr-marcus', 'STATUS_TRANSITION', 'status', 'IN_INVESTIGATION', 'RESOLVED', 'Deployed template fix in commit e3a8b2', subHours(12));

    // Insert an initial outbox job to verify background worker processing
    const insertOutbox = database.prepare(`
      INSERT INTO outbox_jobs (
        id, aggregate_id, event_type, payload, status, retry_count, max_retries, scheduled_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    insertOutbox.run(
      'job-init-1',
      'WI-1001',
      'NOTIFICATION_DISPATCH',
      JSON.stringify({
        channel: 'slack-ops-critical',
        message: 'Critical incident WI-1001 claimed by David Kim'
      }),
      'PENDING',
      0,
      3
    );
  });

  return { success: true };
}

if (require.main === module) {
  console.log('Seeding database with operational work items...');
  seedDatabase();
  console.log('Database seeded successfully!');
}

module.exports = { seedDatabase };
