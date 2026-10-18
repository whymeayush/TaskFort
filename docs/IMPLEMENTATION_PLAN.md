# Newtonite Operations Hub — Implementation Plan

## 1. Executive Summary & Goals
Newtonite Operations Hub is an internal operations management platform built on the **MERN** stack (MongoDB, Express.js, React.js, Node.js). It replaces ad-hoc spreadsheets, chat threads, and emails with a resilient, concurrent-safe operational coordination workspace designed for high-stress operational environments.

---

## 2. Architecture & Monorepo Structure

```
newtonite-operations-hub/
├── docs/
│   ├── REQUIREMENTS_TRACEABILITY.md # Explicit mapping across all PDF requirements
│   ├── IMPLEMENTATION_PLAN.md       # Phased technical roadmap
│   ├── ARCHITECTURE.md              # Diagrams & data flows
│   ├── KNOWN_LIMITATIONS.md         # Documented trade-offs & boundaries
│   └── DEMO_SCRIPT.md               # Evaluator demonstration walkthrough
├── server/
│   ├── src/
│   │   ├── config/                  # Environment & database config
│   │   ├── db/                      # Mongoose connection & managed Replica Set
│   │   ├── models/                  # User, Team, TeamMembership, WorkItem, ActivityLog, Comment, Approval, Notification, IdempotencyKey
│   │   ├── middleware/              # JWT auth, team RBAC, idempotency, rate limiting, error handling, correlation IDs
│   │   ├── services/                # WorkItem, Assignment, Workflow, Audit, Approval, Notification, Idempotency
│   │   ├── controllers/             # REST API controllers
│   │   ├── routes/                  # Modular Express routes
│   │   ├── validation/              # Zod input schemas
│   │   ├── app.js                   # Express application setup
│   │   └── server.js                # Server entry point
│   ├── tests/                       # Automated Vitest / Supertest test suites
│   ├── seeds/                       # Seed dataset with 6 operational scenarios
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/                     # Axios client with interceptors, JWT, Idempotency headers, ETag/version support
│   │   ├── components/              # Navigation, Sidebar, MetricCards, ActivityTimeline, ConflictModal, Pagination, UrgencyBadge
│   │   ├── context/                 # AuthContext (JWT, active user, persona switcher), NotificationContext
│   │   ├── pages/                   # 16 required views (Dashboard, WorkItems, Detail, Teams, Approvals, Profile, etc.)
│   │   ├── App.jsx                  # React Router configuration
│   │   └── index.css                # Tailwind CSS styling & design system
│   ├── public/                      # Static assets
│   ├── index.html                   # HTML5 shell
│   ├── vite.config.js               # Vite config with API proxy
│   └── package.json
├── ENGINEERING_DECISIONS.md         # Deep trade-off analysis (5-8 core architectural choices)
├── README.md                        # Master project guide, setup & verification instructions
└── package.json                     # Monorepo root scripts (start, dev, seed, test)
```

---

## 3. Phased Implementation Roadmap

### Phase 1: Planning, Documentation & Traceability
- Create `docs/REQUIREMENTS_TRACEABILITY.md` covering all 6 pages.
- Create `docs/IMPLEMENTATION_PLAN.md` with detailed phase milestones.
- Create `docs/ARCHITECTURE.md` with Mermaid diagrams.
- Create `docs/KNOWN_LIMITATIONS.md`.

### Phase 2: Mongoose Database Design & Schemas
- Define models with strict validation, enums, indexes, and timestamps:
  - `User`: Email normalized, bcrypt `passwordHash`, system role (`ADMIN`, `OPERATOR`, `AUDITOR`).
  - `Team`: Name, description, active status.
  - `TeamMembership`: Unique compound index `(userId, teamId)`, role (`TEAM_ADMIN`, `TEAM_MEMBER`, `READ_ONLY`).
  - `WorkItem`: Core operational types, status enum (`Open`, `In Progress`, `Blocked`, `In Review`, `Resolved`, `Closed`), priority enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `version` counter, `nextActionRequired`, `reasonForExistence`, `businessImpact`.
  - `ActivityLog`: Append-only audit records with `actorId`, `actionType`, `field`, `prevValue`, `newValue`, `correlationId`.
  - `Comment`: Collaborative updates tied to work items.
  - `Approval`: Approval requests with approver roles, decisions, timestamps, and comments.
  - `Notification`: In-app notification center with read status and deduplication keys.
  - `IdempotencyKey`: Cached response bodies, status codes, and request hashes.

### Phase 3: Authentication & Multi-Team RBAC
- JWT authentication with secure password hashing (`bcrypt`).
- Authorization middleware:
  - System-level roles (`ADMIN` universal override).
  - Team-level roles (`TEAM_ADMIN`, `TEAM_MEMBER`, `READ_ONLY`).
  - Confidentiality filtering for sensitive compliance and payment items.

### Phase 4 & 5: Work Item Lifecycle & Collaboration Timeline
- Complete lifecycle: creation, validation, assignment, transitions, resolution with mandatory summary.
- Multi-document MongoDB transactions (`session.withTransaction`) to guarantee that work item updates and append-only activity logs succeed or fail together.

### Phase 6: Concurrency Controls & Idempotency
- Atomic conditional assignment (`findOneAndUpdate({ _id, assigneeId: null, version })`).
- Stale update detection (`version === expectedVersion`), returning HTTP 409 Conflict.
- `Idempotency-Key` middleware to prevent duplicate operations and replay cached results.

### Phase 7: Dashboard, Search, Filtering & Scale
- Server-side compound indexed queries:
  - Compound indexes on `(teamId, status)`, `(assigneeId, status)`, `(priority, status)`.
  - Server-side aggregation for dashboard counts (Attention Queue, Urgent, Overdue).
  - Server-side cursor/offset pagination.

### Phase 8 & 9: Teams, Approvals & Notifications
- Team management endpoints (add/remove members, assign roles).
- Dedicated approval workflow with role requirements and audit records.
- In-app notification generation for assignments and approvals.

### Phase 10: React Frontend with Vite & Tailwind CSS
- Professional enterprise SaaS interface with 16 functional pages/views.
- Interactive Persona Switcher for demonstration.
- Real-time conflict resolution modal showing side-by-side server vs client diffs.
- Interactive Simulator Lab for testing concurrency collisions, idempotency cache hits, and approval gates.

### Phase 11-14: Testing, Security & Quality Assurance
- Automated Vitest & Supertest test suites covering Auth, RBAC, Concurrency, Idempotency, Workflow, and Search.
- Security review against OWASP Top 10 (Injection, Broken Auth, IDOR, Mass Assignment, CSRF/CORS).

### Phase 15-17: Documentation, Verification & Demonstration
- `ENGINEERING_DECISIONS.md`, `README.md`, `docs/DEMO_SCRIPT.md`.
- End-to-end runtime verification of frontend and backend.
