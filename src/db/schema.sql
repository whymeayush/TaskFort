-- Newtonite Operations Management Schema

PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  system_role TEXT NOT NULL CHECK (system_role IN ('ADMIN', 'TEAM_LEAD', 'OPERATOR', 'AUDITOR')),
  avatar_color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Team memberships (Users can belong to multiple teams)
CREATE TABLE IF NOT EXISTS user_teams (
  user_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  team_role TEXT NOT NULL CHECK (team_role IN ('MEMBER', 'LEAD')),
  PRIMARY KEY (user_id, team_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Work Items table
CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'CUSTOMER_ISSUE',
    'ENGINEERING_PROBLEM',
    'PAYMENT_INVESTIGATION',
    'PRODUCTION_INCIDENT',
    'COMPLIANCE_REQUEST',
    'OPERATIONAL_APPROVAL'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'DRAFT',
    'TRIAGED',
    'IN_INVESTIGATION',
    'PENDING_APPROVAL',
    'RESOLVED',
    'CLOSED'
  )),
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  team_id TEXT NOT NULL,
  owner_id TEXT,
  created_by TEXT NOT NULL,
  reason_for_existence TEXT NOT NULL,
  business_impact TEXT NOT NULL,
  next_action_required TEXT NOT NULL,
  pending_approval_role TEXT,
  resolution_summary TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indexes for performance at scale
CREATE INDEX IF NOT EXISTS idx_work_items_team_status ON work_items(team_id, status);
CREATE INDEX IF NOT EXISTS idx_work_items_owner ON work_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_work_items_priority ON work_items(priority);
CREATE INDEX IF NOT EXISTS idx_work_items_updated ON work_items(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_items_created ON work_items(created_at DESC);

-- Audit Events table (immutable append-only history)
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CREATED',
    'CLAIMED',
    'REASSIGNED',
    'UNASSIGNED',
    'STATUS_TRANSITION',
    'PRIORITY_CHANGED',
    'UPDATED',
    'COMMENT_ADDED',
    'APPROVAL_SUBMITTED',
    'APPROVAL_GRANTED',
    'APPROVAL_REJECTED'
  )),
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_work_item ON audit_events(work_item_id, created_at DESC);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_comments_work_item ON comments(work_item_id, created_at ASC);

-- Idempotency Keys table (prevent accidental duplicate mutations)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_method TEXT NOT NULL,
  request_hash TEXT,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at);

-- Transactional Outbox table (reliable asynchronous secondary processing)
CREATE TABLE IF NOT EXISTS outbox_jobs (
  id TEXT PRIMARY KEY,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  scheduled_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_jobs(status, scheduled_at);
