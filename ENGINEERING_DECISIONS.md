# Newtonite Operations Hub — Engineering Decisions & Architectural Trade-offs

This document details eight core engineering decisions made while designing and building the **Newtonite Operations Hub** on the **MERN** stack (MongoDB, Express.js, React.js, Node.js). Each decision outlines the operational context, selected approach, evaluated alternatives, concrete benefits, and recognized trade-offs.

---

## Decision 1: Stack Selection — MERN Architecture (MongoDB, Express, React, Node.js)

### Context & Operational Problem
Newtonite coordinates high-pressure operational tasks across multiple specialized departments: engineering incidents, payment discrepancy investigations, GDPR compliance disclosures, and operational sign-offs. Work items have dynamic fields (root cause analyses, telemetry payloads, approval roles, resolution summaries) that evolve across ticket categories while demanding rigid indexability, atomic transaction safety, and sub-50ms query latency.

### Selected Decision
We selected the **MERN** stack:
- **MongoDB / Mongoose**: Document model providing polymorphic work item schemas with native WiredTiger multi-document ACID transactions and rich compound indexing.
- **Express.js**: Lightweight, battle-tested REST API layer with middleware-based auth, RBAC, and centralized error handling.
- **React.js & Vite**: Component-driven SPA architecture with client-side routing (`react-router-dom`), TanStack Query server caching, and Tailwind CSS.
- **Node.js**: Asynchronous event-driven runtime ideal for concurrent I/O operations and high connection density.

### Alternatives Considered
- *Relational SQL (Postgres / MySQL)*: Excellent ACID guarantees, but complex table alterations required when expanding polymorphic operational metadata (telemetry dumps, dynamic approval chains, varied compliance tags).
- *Server-Rendered Pages (EJS/Handlebars/Next SSR)*: Faster initial page load, but high operational user interactivity (live persona switching, side-by-side OCC conflict modal reconciliation, inline claim updates) makes a React SPA significantly more responsive and ergonomic under high-pressure usage.

### Benefits
- Single-language (JavaScript/ES Modules) across frontend and backend.
- High developer velocity and shared data models.
- Native JSON serialization without ORM impedance mismatch.

### Trade-offs & Limitations
- Requires careful schema validation rules in Mongoose to prevent schema drift.
- Multi-document transactions require replica set topology (managed automatically in our environment via WiredTiger storage engine).

---

## Decision 2: Database Modeling & Entity Separation (Normalized vs. Embedded)

### Context & Operational Problem
In work-management systems, a common anti-pattern is embedding comments, audit logs, and approval histories inside a single giant work item document. As a work item evolves over days with dozens of operator updates and automated events, the document grows unbounded, risking MongoDB's 16MB document limit, causing high document fragmentation, and bloating every list query payload.

### Selected Decision
We strictly separated entities into normalized, indexed Mongoose collections:
1. `users`: Identity, bcrypt password hashes, global system roles (`SYSTEM_ADMIN`, `TEAM_MEMBER`), account status.
2. `teams`: Team metadata, operational department codes (`OPS`, `ENG`, `PAYMENTS`, `COMPLIANCE`, `SUPPORT`).
3. `team_memberships`: Compound indexed `(userId, teamId)` relationship table with role in team (`TEAM_ADMIN`, `TEAM_MEMBER`, `READ_ONLY_VIEWER`).
4. `work_items`: Core operational metadata with numeric `version` counter for OCC, SLA due date, and mandatory operational purpose fields (`reasonForExistence`, `businessImpact`, `nextActionRequired`).
5. `activity_logs`: Append-only immutable audit trail referenced by `workItemId` and timestamp.
6. `comments`: Threaded operator notes linked by `workItemId`.
7. `approvals`: Formal approval requests with required role, decision status, and audit timestamps.
8. `idempotency_keys`: Cache of mutated responses keyed by `(key, userId)`.

### Alternatives Considered
- *Fully Embedded Documents*: Embedding comments and activity logs directly inside `work_items`. Rejected due to document bloat, payload size inflation on list queries, and concurrency write collision frequency.

### Benefits
- Fast list endpoints: List queries project only core work item attributes, transferring < 3KB per page instead of megabytes of nested history.
- Immutable audit records: Operators cannot tamper with past audit entries because `activity_logs` has no update or delete routes.
- Team-level membership flexibility: Users can belong to multiple teams with distinct permissions per team.

### Trade-offs & Limitations
- Viewing a work item detail page requires querying work item, comments, and timeline (resolved efficiently via `Promise.all` parallel queries in `workItemService.getWorkItemById`).

---

## Decision 3: Authentication & Multi-Team RBAC (System Roles vs. Team Scopes)

### Context & Operational Problem
Newtonite operates sensitive departments: Payment Operations investigates financial discrepancies; Regulatory Compliance handles legal audits and GDPR Article 17 requests. An operator in Support or Central Ops must not be able to view confidential compliance tickets simply by guessing or tampering with an ID in the URL. Hiding buttons on the client is insufficient; authorization must be verified on every server request.

### Selected Decision
We implemented a two-tier authorization model:
1. **System-Level Roles**:
   - `SYSTEM_ADMIN`: Universal operational override across all teams and confidentiality boundaries.
   - `TEAM_MEMBER`: Standard employee identity.
2. **Team-Level Roles & Scopes**:
   - `TEAM_ADMIN`: Can manage team membership, add/remove members, and approve restricted workflow transitions.
   - `TEAM_MEMBER`: Can create, view, claim, and mutate work items belonging to their enrolled teams.
   - `READ_ONLY_VIEWER`: Can view team items, but mutating requests (create, claim, edit, transition) are blocked with HTTP 403.
3. **Resource-Level Confidentiality Guards**:
   - Work items of type `COMPLIANCE_REQUEST` and `PAYMENT_INVESTIGATION` are isolated. Server queries automatically filter them out for non-team users, and direct ID lookups return `HTTP 403 RESOURCE_ACCESS_DENIED`.

### Alternatives Considered
- *Global Role Only (Admin vs User)*: Too coarse; fails to protect confidential payment records from non-finance staff.
- *Attribute-Based Access Control (ABAC) with Policy Engines*: Unnecessary complexity for a 5-team operations hub.

### Benefits
- Defeats Insecure Direct Object References (IDOR).
- Tested and verified: non-team users receive HTTP 403 on confidential items; System Admin has universal override.

### Trade-offs & Limitations
- Requires resolving user team memberships on authenticated requests (cached in `req.user.memberships` from the token/session).

---

## Decision 4: Concurrency Safety — Optimistic Concurrency Control (OCC) & Atomic Claims

### Context & Operational Problem
During incidents or high-stress operational spikes, multiple operators frequently view the same urgent unassigned ticket and attempt to take responsibility, or two operators submit edits simultaneously based on the same older view. Silently overwriting another user's update is unacceptable in an enterprise operations platform.

### Selected Decision
1. **Atomic Conditional Claims**:
   - Unassigned ticket claims execute an atomic conditional query:
     ```javascript
     WorkItem.findOneAndUpdate(
       { _id: workItemId, assigneeId: null, version: current.version },
       { $set: { assigneeId: actor._id, status: 'In Progress' }, $inc: { version: 1 } },
       { returnDocument: 'after', session }
     )
     ```
   - If two operators click "Claim" simultaneously, exactly one succeeds (HTTP 200). The losing request fails the condition and receives **HTTP 409 Conflict** with `CONCURRENCY_CONFLICT`.
2. **Monotonic Version Tokens**:
   - Every work item stores an integer `version` field.
   - API endpoints emit `ETag: "v{version}"`.
   - Update requests send `If-Match: "v{version}"` or `expectedVersion` in the body.
   - Stale updates targeting older versions are rejected with HTTP 409 Conflict.
3. **Interactive Frontend Reconciliation**:
   - The React client captures 409 conflicts and renders an interactive **Conflict Resolution Modal**, displaying the operator's unsaved edits alongside the fresh server state and offering a 1-click reload and clipboard export.

### Alternatives Considered
- *Pessimistic Locking (`SELECT FOR UPDATE` or mutexes)*: Tying up database records while operators read tickets causes lock contention and deadlocks.
- *Last-Write-Wins (Blind Overwrite)*: Dangerous in operations; silently erases coworker investigations.

### Benefits
- Zero data loss from race conditions.
- Verified by automated tests simulating concurrent promises.

### Trade-offs & Limitations
- If an update is rejected, the user must reload or copy their changes.

---

## Decision 5: Idempotency & Safe Retry Mechanics

### Context & Operational Problem
Under poor network conditions or timeout uncertainty, users frequently click "Submit", "Approve", or "Claim" repeatedly. In financial operations, retries can duplicate ledger approval actions or flood activity logs.

### Selected Decision
We implemented first-class idempotency middleware (`server/src/middleware/idempotency.js`):
- All mutating requests accept an `Idempotency-Key` header.
- The middleware checks `IdempotencyKey.findOne({ key, userId })`:
  - **Cache Hit**: Immediately returns the stored HTTP status and response body with `X-Cache: HIT-IDEMPOTENT`, completely bypassing business logic and database writes.
  - **Cache Miss**: Executes the handler, intercepts `res.send`, and persists the successful response (status 200-299) in MongoDB.
- Reusing the same key with different payloads or parameters is rejected.

### Alternatives Considered
- *Client-side button disabling only*: Insufficient; does not protect against network retries, script loops, or browser refreshes.
- *Distributed Redis Locks*: Added external infrastructure dependency without significant benefit for our single-cluster requirements.

### Benefits
- Safe at-least-once HTTP retry semantics.
- Verified by automated tests: duplicate requests return cached results with zero duplicate comment or audit log entries.

### Trade-offs & Limitations
- Idempotency records require TTL cleanup (indexed with `createdAt` expiration).

---

## Decision 6: Append-Only Audit History & Multi-Document Transactions

### Context & Operational Problem
Auditing who changed what, when, and why is critical for compliance and incident post-mortems. If a work item update succeeds but the audit log write fails (or vice versa), the operational history becomes corrupt.

### Selected Decision
1. **Append-Only Immutability**:
   - Activity records are write-only. Normal users and API routes have no permissions to update or delete audit logs.
2. **MongoDB ACID Transactions**:
   - State-changing operations (status transitions, claims, reassignments) run inside a MongoDB transaction session (`session.startTransaction()`).
   - The work item mutation and corresponding `ActivityLog` record are committed together atomically:
     ```javascript
     await session.commitTransaction();
     ```
   - If an error occurs, `session.abortTransaction()` rolls back all changes, guaranteeing zero orphan states.

### Alternatives Considered
- *Uncoordinated Dual Writes*: Modifying the work item and writing an activity log in separate queries. Rejected because partial failures corrupt the audit history.

### Benefits
- Guaranteed consistency between resource state and historical timeline.

### Trade-offs & Limitations
- Multi-document transactions require a MongoDB Replica Set topology (handled automatically in our local dev environment using WiredTiger storage).

---

## Decision 7: Synchronous vs. Asynchronous Operation Boundaries

### Context & Operational Problem
Deciding what work happens synchronously in the request-response cycle versus asynchronously in background workers affects user perceived latency and failure isolation.

### Selected Decision
- **Synchronous Operations (Critical Path)**:
  - Input validation (Zod / Mongoose).
  - Authentication and RBAC authorization check.
  - Concurrency version verification (OCC).
  - State mutation and append-only activity log write (in transaction).
  - Returning the updated record with new ETag to the client.
- **Asynchronous Operations (Secondary Work)**:
  - In-app notification creation (executed via asynchronous promise outside the transaction so notification failure never blocks the core operation).
  - Background cleanup of expired idempotency keys.

### Alternatives Considered
- *Kafka / RabbitMQ Queue*: Overkill for the one-day scope; adds unnecessary infrastructure friction without concrete requirements.

### Benefits
- Fast API response times (< 30ms).
- Secondary failures cannot abort critical work item operations.

---

## Decision 8: Deliberate Scope Boundaries & Intentional Exclusions

### Context & Operational Problem
The Newtonite engineering challenge emphasizes sound engineering judgment, reliable behavior, testing, and documentation over building an overwhelming number of superficial, half-finished features.

### Selected Decision (What Was Intentionally Excluded)
1. **Complex Distributed Message Brokers (Kafka / RabbitMQ)**:
   - *Rationale*: A single operational cluster running MongoDB transactions easily handles thousands of daily operations without the operational overhead of managing ZooKeeper/Kafka brokers.
2. **External Email / SMS Integrations**:
   - *Rationale*: Replaced with a reliable, auditable in-app notification center that requires zero external third-party API keys or spam filter configurations.
3. **Heavy WebSockets / Socket.io**:
   - *Rationale*: Replaced with RESTful polling, clean TanStack Query caching, and deterministic user-driven reload actions, preventing connection state synchronization issues across server restarts.
4. **Third-Party OAuth / SAML SSO Integration**:
   - *Rationale*: Implemented native JWT authentication with bcrypt password hashing and an interactive Persona Switcher, allowing reviewers to instantly test multi-user journeys without external IdP accounts.

---

## Summary Matrix of Architectural Trade-offs

| Engineering Concern | Chosen Mechanism | Primary Alternative Considered | Core Reason for Decision |
|:---|:---|:---|:---|
| **Stack** | MERN (MongoDB + Express + React + Node) | Postgres + Spring Boot / Next.js SSR | Polymorphic work items, native JSON, single language |
| **Concurrency** | OCC with integer `version` + `If-Match` | Pessimistic DB Row Locking | Avoids long-lived lock contention and deadlocks |
| **Idempotency** | Express middleware + `IdempotencyKey` collection | Distributed Redis Key Cache | Native MongoDB persistence, zero extra infrastructure |
| **Data Integrity** | MongoDB Multi-Document ACID Transactions | Two-phase commit / dual-write promises | Work item and audit log must commit atomically |
| **Audit Trail** | Append-only `activity_logs` collection | Embedded array inside WorkItem document | Prevents document bloat and 16MB BSON limit |
| **Authorization** | Two-tier (System Role + Team Membership) | Flat role system / complex ABAC | Enforces team confidentiality without over-engineering |
