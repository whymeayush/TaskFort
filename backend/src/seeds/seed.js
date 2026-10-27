import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { TeamMembership } from '../models/TeamMembership.js';
import { WorkItem } from '../models/WorkItem.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Comment } from '../models/Comment.js';
import { Approval } from '../models/Approval.js';
import { connectDB, disconnectDB } from '../db/connection.js';

export async function seedDatabase() {
  console.log('[Seed] Starting database seed...');

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    TeamMembership.deleteMany({}),
    WorkItem.deleteMany({}),
    ActivityLog.deleteMany({}),
    Comment.deleteMany({}),
    Approval.deleteMany({})
  ]);

  const defaultPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);
  const adminPasswordHash = await bcrypt.hash('AdminSecret2026!', salt);

  // 1. Create Users
  const users = await User.create([
    {
      name: 'Alice Chen',
      email: 'alice.chen@newtonite.internal',
      passwordHash,
      systemRole: 'TEAM_MEMBER',
      accountStatus: 'ACTIVE',
      avatarColor: '#8b5cf6'
    },
    {
      name: 'Bob Miller',
      email: 'bob.miller@newtonite.internal',
      passwordHash,
      systemRole: 'TEAM_MEMBER',
      accountStatus: 'ACTIVE',
      avatarColor: '#3b82f6'
    },
    {
      name: 'Elena Rostova',
      email: 'elena.rostova@newtonite.internal',
      passwordHash,
      systemRole: 'TEAM_MEMBER',
      accountStatus: 'ACTIVE',
      avatarColor: '#ec4899'
    },
    {
      name: 'Marcus Vance',
      email: 'marcus.vance@newtonite.internal',
      passwordHash,
      systemRole: 'TEAM_MEMBER',
      accountStatus: 'ACTIVE',
      avatarColor: '#10b981'
    },
    {
      name: 'David Kim',
      email: 'david.kim@newtonite.internal',
      passwordHash,
      systemRole: 'TEAM_MEMBER',
      accountStatus: 'ACTIVE',
      avatarColor: '#f59e0b'
    },
    {
      name: 'Sarah Connor',
      email: 'sarah.connor@newtonite.internal',
      passwordHash,
      systemRole: 'TEAM_MEMBER',
      accountStatus: 'ACTIVE',
      avatarColor: '#06b6d4'
    },
    {
      name: 'System Administrator',
      email: 'admin@newtonite.internal',
      passwordHash: adminPasswordHash,
      systemRole: 'SYSTEM_ADMIN',
      accountStatus: 'ACTIVE',
      avatarColor: '#64748b'
    }
  ]);

  const userMap = {};
  users.forEach(u => { userMap[u.email] = u; });

  // 2. Create Teams
  const teams = await Team.create([
    {
      name: 'Central Operations',
      code: 'OPS',
      description: 'Daily operational coordination, cross-team triage, escalations, and SLA management',
      status: 'ACTIVE',
      createdBy: userMap['admin@newtonite.internal']._id
    },
    {
      name: 'Core Engineering',
      code: 'ENG',
      description: 'Production infrastructure, backend services, incident mitigation, and platform reliability',
      status: 'ACTIVE',
      createdBy: userMap['admin@newtonite.internal']._id
    },
    {
      name: 'Payment Operations',
      code: 'PAYMENTS',
      description: 'Payment settlement anomalies, chargeback investigations, reconciliation, and payment rails',
      status: 'ACTIVE',
      createdBy: userMap['admin@newtonite.internal']._id
    },
    {
      name: 'Regulatory Compliance',
      code: 'COMPLIANCE',
      description: 'Statutory filings, privacy audits, AML compliance, and access authorization oversight',
      status: 'ACTIVE',
      createdBy: userMap['admin@newtonite.internal']._id
    },
    {
      name: 'Tier-3 Support',
      code: 'SUPPORT',
      description: 'VIP client incidents, partner escalations, and technical service resolutions',
      status: 'ACTIVE',
      createdBy: userMap['admin@newtonite.internal']._id
    }
  ]);

  const teamMap = {};
  teams.forEach(t => { teamMap[t.code] = t; });

  // 3. Create Team Memberships
  await TeamMembership.create([
    // Operations Team
    { userId: userMap['alice.chen@newtonite.internal']._id, teamId: teamMap['OPS']._id, roleInTeam: 'TEAM_ADMIN' },
    { userId: userMap['bob.miller@newtonite.internal']._id, teamId: teamMap['OPS']._id, roleInTeam: 'TEAM_MEMBER' },
    // Engineering Team
    { userId: userMap['david.kim@newtonite.internal']._id, teamId: teamMap['ENG']._id, roleInTeam: 'TEAM_ADMIN' },
    // Payment Team
    { userId: userMap['marcus.vance@newtonite.internal']._id, teamId: teamMap['PAYMENTS']._id, roleInTeam: 'TEAM_MEMBER' },
    // Compliance Team
    { userId: userMap['elena.rostova@newtonite.internal']._id, teamId: teamMap['COMPLIANCE']._id, roleInTeam: 'TEAM_ADMIN' },
    // Support Team
    { userId: userMap['sarah.connor@newtonite.internal']._id, teamId: teamMap['SUPPORT']._id, roleInTeam: 'TEAM_MEMBER' },
    // Admin in all teams
    { userId: userMap['admin@newtonite.internal']._id, teamId: teamMap['OPS']._id, roleInTeam: 'TEAM_ADMIN' },
    { userId: userMap['admin@newtonite.internal']._id, teamId: teamMap['ENG']._id, roleInTeam: 'TEAM_ADMIN' },
    { userId: userMap['admin@newtonite.internal']._id, teamId: teamMap['PAYMENTS']._id, roleInTeam: 'TEAM_ADMIN' },
    { userId: userMap['admin@newtonite.internal']._id, teamId: teamMap['COMPLIANCE']._id, roleInTeam: 'TEAM_ADMIN' },
    { userId: userMap['admin@newtonite.internal']._id, teamId: teamMap['SUPPORT']._id, roleInTeam: 'TEAM_ADMIN' }
  ]);

  const now = new Date();
  const subHours = (h) => new Date(now.getTime() - h * 3600 * 1000);
  const addHours = (h) => new Date(now.getTime() + h * 3600 * 1000);

  // 4. Create Work Items
  const items = await WorkItem.create([
    {
      title: 'Database connection pool saturation on payment ingress router',
      description: 'Telemetry alerts triggered: Ingress router nodes report 100% pool saturation. 42 transactions received HTTP 504 timeouts.',
      type: 'PRODUCTION_INCIDENT',
      status: 'In Progress',
      priority: 'CRITICAL',
      teamId: teamMap['ENG']._id,
      createdBy: userMap['bob.miller@newtonite.internal']._id,
      assigneeId: userMap['david.kim@newtonite.internal']._id,
      reasonForExistence: 'Automated health probe failed 3 consecutive checks under peak transaction load',
      businessImpact: 'Direct revenue impact: ~$38,000/min during gateway checkout failures',
      nextActionRequired: 'Deploy patched connection-pool recycling policy in microservice v2.14.1',
      dueDate: addHours(4),
      tags: ['incident', 'database', 'payments-gateway'],
      version: 2
    },
    {
      title: '$420,000 wire settlement variance on Apex Clearing account',
      description: 'Nightly batch settlement reconciliation flagged a variance of $420,000 between clearinghouse files and ledger entries.',
      type: 'PAYMENT_INVESTIGATION',
      status: 'In Review',
      priority: 'CRITICAL',
      teamId: teamMap['PAYMENTS']._id,
      createdBy: userMap['marcus.vance@newtonite.internal']._id,
      assigneeId: userMap['marcus.vance@newtonite.internal']._id,
      reasonForExistence: 'Daily clearing batch balance mismatch detected by automated reconciliation engine',
      businessImpact: 'Regulatory reporting breach risk and potential liquidity settlement delay',
      nextActionRequired: 'Pending Treasury Officer sign-off on manual reversal ledger adjustment',
      pendingApprovalRole: 'TEAM_ADMIN',
      dueDate: subHours(2), // Overdue!
      tags: ['reconciliation', 'treasury', 'high-risk'],
      version: 3
    },
    {
      title: 'GDPR Article 17 Erasure for Enterprise Customer #8812',
      description: 'Legal counsel delivered verified statutory data erasure request for European enterprise account and all 340 associated identities.',
      type: 'COMPLIANCE_REQUEST',
      status: 'Open',
      priority: 'HIGH',
      teamId: teamMap['COMPLIANCE']._id,
      createdBy: userMap['elena.rostova@newtonite.internal']._id,
      assigneeId: null, // Unassigned!
      reasonForExistence: 'Mandatory statutory compliance under GDPR Article 17 with strict 30-day legal deadline',
      businessImpact: 'Statutory fine risk up to 4% of annual global turnover for non-compliance',
      nextActionRequired: 'Assign compliance officer to run anonymization script against customer datastores',
      dueDate: addHours(48),
      tags: ['gdpr', 'compliance', 'privacy'],
      version: 1
    },
    {
      title: 'Zero-downtime MongoDB replica set migration to WiredTiger multi-node',
      description: 'Cluster maintenance request to migrate legacy standalone replica set to distributed multi-node architecture for high-availability.',
      type: 'OPERATIONAL_APPROVAL',
      status: 'In Review',
      priority: 'HIGH',
      teamId: teamMap['ENG']._id,
      createdBy: userMap['david.kim@newtonite.internal']._id,
      assigneeId: userMap['david.kim@newtonite.internal']._id,
      reasonForExistence: 'Preparation for planned Q4 enterprise load expansion',
      businessImpact: 'Production downtime if rollover failover is improperly sequenced',
      nextActionRequired: 'System Administrator approval required prior to executing production maintenance',
      pendingApprovalRole: 'SYSTEM_ADMIN',
      dueDate: addHours(24),
      tags: ['infrastructure', 'approval-required', 'maintenance'],
      version: 2
    },
    {
      title: 'Acme Corp VIP SSO federation authentication loop',
      description: 'Acme Corp identity provider SAML assertions failing assertion signature verification after their cert rotation.',
      type: 'CUSTOMER_ISSUE',
      status: 'Open',
      priority: 'HIGH',
      teamId: teamMap['SUPPORT']._id,
      createdBy: userMap['sarah.connor@newtonite.internal']._id,
      assigneeId: null, // Unassigned!
      reasonForExistence: 'VIP customer blocked from operational dashboard access',
      businessImpact: 'Client executives unable to approve batch payroll operations',
      nextActionRequired: 'Claim ticket and update Acme IdP public cert fingerprint in auth tenant config',
      dueDate: addHours(6),
      tags: ['support', 'vip', 'sso'],
      version: 1
    },
    {
      title: 'Memory leak in session invalidation background worker',
      description: 'Worker memory graph shows steady ramp over 72 hours until OOM kill. Need profiling and memory dump analysis.',
      type: 'ENGINEERING_PROBLEM',
      status: 'Blocked',
      priority: 'MEDIUM',
      teamId: teamMap['ENG']._id,
      createdBy: userMap['alice.chen@newtonite.internal']._id,
      assigneeId: userMap['david.kim@newtonite.internal']._id,
      reasonForExistence: 'Kubernetes pods restarting periodically due to memory threshold breach',
      businessImpact: 'Temporary latency spikes for authenticated user sessions during container recycling',
      nextActionRequired: 'Waiting for staging cluster memory profiler access from DevOps',
      dueDate: addHours(72),
      tags: ['bug', 'performance', 'worker'],
      version: 2
    },
    {
      title: 'Quarterly access audit: Revoke dormant external contractor tokens',
      description: 'Security policy requires quarterly review of dormant service accounts and API tokens unused for > 90 days.',
      type: 'COMPLIANCE_REQUEST',
      status: 'Resolved',
      priority: 'LOW',
      teamId: teamMap['COMPLIANCE']._id,
      createdBy: userMap['elena.rostova@newtonite.internal']._id,
      assigneeId: userMap['elena.rostova@newtonite.internal']._id,
      reasonForExistence: 'Quarterly ISO-27001 access control audit requirements',
      businessImpact: 'Zero operational disruption; improves credential hygiene',
      nextActionRequired: 'None. Verification completed and attested.',
      resolutionSummary: 'Identified 14 dormant contractor API keys. All credentials successfully revoked and rotated.',
      dueDate: subHours(12),
      tags: ['audit', 'security'],
      version: 3
    }
  ]);

  // 5. Create Activity Logs
  await ActivityLog.create([
    {
      workItemId: items[0]._id,
      actorId: userMap['bob.miller@newtonite.internal']._id,
      actionType: 'CREATED',
      field: 'status',
      prevValue: null,
      newValue: 'Open',
      comment: 'Initial incident opened from automated telemetry alert',
      createdAt: subHours(5)
    },
    {
      workItemId: items[0]._id,
      actorId: userMap['david.kim@newtonite.internal']._id,
      actionType: 'ASSIGNED',
      field: 'assigneeId',
      prevValue: null,
      newValue: 'David Kim',
      comment: 'Claimed incident ownership for rapid triage',
      createdAt: subHours(4)
    },
    {
      workItemId: items[0]._id,
      actorId: userMap['david.kim@newtonite.internal']._id,
      actionType: 'STATUS_CHANGE',
      field: 'status',
      prevValue: 'Open',
      newValue: 'In Progress',
      comment: 'Diagnosed leak in connection pool pool-recycle timeout',
      createdAt: subHours(3)
    },
    {
      workItemId: items[1]._id,
      actorId: userMap['marcus.vance@newtonite.internal']._id,
      actionType: 'APPROVAL_REQUESTED',
      field: 'pendingApprovalRole',
      prevValue: null,
      newValue: 'TEAM_ADMIN',
      comment: 'Submitted $420,000 ledger variance correction for Team Admin signoff',
      createdAt: subHours(2)
    }
  ]);

  // 6. Create Comments
  await Comment.create([
    {
      workItemId: items[0]._id,
      authorId: userMap['david.kim@newtonite.internal']._id,
      body: 'Identified root cause: TCP keep-alive sockets lingering on gateway egress. Preparing patch v2.14.1 with 30s socket timeout.',
      createdAt: subHours(2)
    },
    {
      workItemId: items[0]._id,
      authorId: userMap['alice.chen@newtonite.internal']._id,
      body: 'Standing by in Operations bridge. Please notify when ready for canary roll out.',
      createdAt: subHours(1)
    },
    {
      workItemId: items[1]._id,
      authorId: userMap['marcus.vance@newtonite.internal']._id,
      body: 'Detailed ledger reconciliation breakdown attached in audit notes. Awaiting Elena or Admin sign-off.',
      createdAt: subHours(2)
    }
  ]);

  // 7. Create Approvals
  await Approval.create([
    {
      workItemId: items[1]._id,
      requestedBy: userMap['marcus.vance@newtonite.internal']._id,
      requiredRole: 'TEAM_ADMIN',
      status: 'PENDING',
      comments: 'Variance adjustment of $420,000 exceeds standard operator discretion threshold ($50k).'
    },
    {
      workItemId: items[3]._id,
      requestedBy: userMap['david.kim@newtonite.internal']._id,
      requiredRole: 'SYSTEM_ADMIN',
      status: 'PENDING',
      comments: 'Requires System Admin maintenance window approval for replica set failover.'
    }
  ]);

  console.log(`[Seed] Seed finished successfully:`);
  console.log(`  - ${users.length} Users`);
  console.log(`  - ${teams.length} Teams`);
  console.log(`  - ${items.length} Work Items`);
  console.log(`  - Demo user passwords:`);
  console.log(`      Operators/Leads: Password123!`);
  console.log(`      System Admin:    AdminSecret2026!`);
}

// Standalone execution support
if (process.argv[1]?.endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (e) {
      console.error('[Seed] Error seeding database:', e);
      process.exit(1);
    }
  })();
}
