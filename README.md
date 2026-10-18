# Newtonite Operations Hub — Operational Work Management Under Pressure

> A resilient, full-stack **MERN** (MongoDB, Express.js, React.js, Node.js) internal operations platform built for fast-scaling organizations. Replaces ad-hoc chat threads, spreadsheets, and emails with an auditable workspace enforcing strict concurrency safety, team-based RBAC, append-only audit histories, and safe retry mechanics.

---

## 🌟 Key Features & Architectural Highlights

1. **Optimistic Concurrency Control (OCC)**:
   - Atomic conditional updates (`findOneAndUpdate({ _id, assigneeId: null, version })`) prevent race conditions during unassigned work claims.
   - Integer `version` counters and `If-Match: "v{version}"` headers reject stale overwrites with **HTTP 409 Conflict**.
   - Interactive client **Conflict Resolution Modal** compares unsaved edits against the fresh server state with 1-click reload and clipboard export.
2. **Idempotency Engine**:
   - Mutating endpoints accept an `Idempotency-Key` header.
   - Cached responses are replayed (`X-Cache: HIT-IDEMPOTENT`) with zero duplicate database writes or duplicate audit log entries.
3. **Workflow State Machine**:
   - Rigid state transitions (`Open` → `In Progress` → `Blocked` → `In Review` → `Resolved` → `Closed`).
   - Requires a mandatory resolution summary (min 10 characters) before resolving tickets.
   - Gated approvals for restricted operations (requiring `TEAM_ADMIN` or `SYSTEM_ADMIN` authorization).
4. **Multi-Team Resource-Level RBAC**:
   - Two-tier authorization model: System-Level Roles (`SYSTEM_ADMIN`, `TEAM_MEMBER`) and Team-Level Roles (`TEAM_ADMIN`, `TEAM_MEMBER`, `READ_ONLY_VIEWER`).
   - Confidential work items (Regulatory Compliance requests and Payment Investigations) are strictly isolated from non-team members.
5. **Append-Only Audit Trail & Transactions**:
   - Every mutation records an immutable event in the `activity_logs` collection.
   - Multi-document MongoDB transactions (`session.startTransaction()`) guarantee that state changes and audit events commit together atomically.
6. **Server-Side Scalability**:
   - Compound indexed MongoDB queries for status, priority, team, and assignee lookups.
   - Server-side pagination (`skip`/`limit`) and indexed regex text search — zero full-dataset in-memory processing.
7. **Interactive Concurrency & Idempotency Lab**:
   - Built-in simulation workbench (`/simulation-lab`) allows reviewers to trigger concurrent 2-user race conditions and idempotency key replays live in the browser.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|:---|:---|
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, TanStack Query, Lucide React |
| **Backend** | Node.js (ES Modules), Express.js, Mongoose ODM, JWT, bcryptjs, Zod, Helmet, CORS |
| **Database** | MongoDB (Replica Set with WiredTiger storage engine supporting multi-document ACID transactions) |
| **Testing** | Node.js Native Test Runner (`node --test`), Supertest / Fetch API |

---

## 🚀 Quickstart Guide (Windows / macOS / Linux)

### Prerequisites
- **Node.js**: v18.0.0 or higher (Tested and verified on Node.js v24 LTS).
- **npm**: v9.0.0 or higher.
- *Zero External DB Setup*: A managed MongoDB Replica Set with WiredTiger transactions starts automatically when no external URI is provided.

### 1. Monorepo Installation
Clone or open the repository, then install dependencies for the server and client:
```powershell
# In the repository root
npm --prefix server install
npm --prefix client install
```

### 2. Database Initialization & Seeding
Populate the database with operational scenarios across all 6 core categories (production incidents, payment discrepancies, GDPR erasure requests, customer webhooks, memory leaks, and maintenance approvals):
```powershell
npm run seed
```

### 3. Build & Run the Application
You can run the application in production mode (where Express serves the compiled React app):
```powershell
# Build client and start backend on port 5000
npm run build
npm start
```

Or run in development mode with hot-reloading:
```powershell
# Terminal 1: Backend API (port 5000)
npm run dev:server

# Terminal 2: React Frontend (port 3000)
npm run dev:client
```

Open your browser at:
- Production Unified URL: `http://localhost:5000`
- Development Frontend URL: `http://localhost:3000`

---

## 🧪 Automated Test Suite

Run the complete automated test suite covering all critical non-CRUD behaviors:
```powershell
npm test
```

### Verified Test Results (15/15 Passed — 100% Success)

```
✔ Authentication & Profile API Tests (4 tests)
  ✔ POST /api/auth/login succeeds with valid credentials
  ✔ POST /api/auth/login fails with invalid password (401)
  ✔ GET /api/work-items without token fails (401)
  ✔ GET /api/auth/profile with Bearer token returns profile context

✔ Concurrency & Optimistic Concurrency Control (OCC) Tests (2 tests)
  ✔ Simultaneous claims on unassigned item: exactly one succeeds, second gets 409 Conflict
  ✔ Updating a work item with an outdated version token triggers 409 Conflict

✔ Idempotency & Deduplication Tests (1 test)
  ✔ Repeating a request with the same Idempotency-Key returns cached response without duplicate comments

✔ Search, Filtering & Pagination Tests (2 tests)
  ✔ Server-side pagination limits output and returns pagination metadata
  ✔ Server-side search accurately filters matches without loading full collection

✔ RBAC & Resource-Level Authorization Tests (4 tests)
  ✔ Non-compliance user cannot access confidential compliance ticket (403)
  ✔ Authorized compliance lead can access confidential compliance ticket (200)
  ✔ System Administrator bypasses team confidentiality boundaries (200)
  ✔ Non-admin member cannot add member to team (403)

✔ Workflow State Machine & Lifecycle Validation Tests (2 tests)
  ✔ Illegal status jump from Open to Resolved is rejected with 400
  ✔ Transition to Resolved requires resolution summary (400)

ℹ tests 15 | suites 6 | pass 15 | fail 0 | cancelled 0 | skipped 0
```

---

## 👥 Demo Personas (1-Click Switcher)

The application includes an interactive **Live Persona Switcher** in the top navigation bar and on the login page:

| Persona | Email | Operational Role | Team | Password |
|:---|:---|:---|:---|:---|
| **Alice Chen** | `alice.chen@newtonite.internal` | Central Operations Team Lead | `OPS` | `Password123!` |
| **Bob Miller** | `bob.miller@newtonite.internal` | Operations Operator | `OPS` | `Password123!` |
| **David Kim** | `david.kim@newtonite.internal` | Core Engineering Lead | `ENG` | `Password123!` |
| **Elena Rostova** | `elena.rostova@newtonite.internal` | Regulatory Compliance Lead | `COMPLIANCE` | `Password123!` |
| **Marcus Vance** | `marcus.vance@newtonite.internal` | Payment Operations Analyst | `PAYMENTS` | `Password123!` |
| **System Administrator** | `admin@newtonite.internal` | Universal Platform Override | `ALL` | `AdminSecret2026!` |

---

## 📁 Repository Directory Structure

```
newtonite-operations-hub/
├── client/                          # React 18 + Vite + Tailwind CSS SPA
│   ├── src/
│   │   ├── api/client.js            # Axios client with JWT & Idempotency interceptors
│   │   ├── context/AuthContext.jsx  # Multi-user session & persona switcher
│   │   ├── components/              # MetricCards, StatusBadges, ActivityTimeline, ConflictModal
│   │   ├── pages/                   # 16 views (Dashboard, WorkItems, Detail, Create, Teams, Lab, etc.)
│   │   ├── App.jsx                  # Protected layout & React Router v6 configuration
│   │   └── main.jsx                 # QueryClientProvider & React DOM mount
│   ├── vite.config.js               # Proxy to backend port 5000
│   └── package.json
├── server/                          # Node.js + Express.js + Mongoose Backend
│   ├── src/
│   │   ├── config/index.js          # Environment configuration
│   │   ├── db/connection.js         # Managed MongoDB Replica Set with WiredTiger transactions
│   │   ├── models/                  # User, Team, TeamMembership, WorkItem, ActivityLog, etc.
│   │   ├── middleware/              # auth.js, rbac.js, idempotency.js, errorHandler.js
│   │   ├── services/                # workItemService, assignmentService, workflowService, auditService
│   │   ├── controllers/             # REST API controllers
│   │   ├── routes/                  # Modular route declarations
│   │   ├── seeds/seed.js            # Pre-configured operational scenarios
│   │   ├── app.js                   # Express application setup & static SPA serving
│   │   └── server.js                # Server entry point & graceful shutdown
│   ├── tests/                       # Automated test suites (Auth, RBAC, OCC, Idempotency, etc.)
│   └── package.json
├── docs/
│   ├── REQUIREMENTS_TRACEABILITY.md # Exhaustive mapping across all 6 pages of the brief
│   ├── IMPLEMENTATION_PLAN.md       # Technical milestone roadmap
│   ├── ARCHITECTURE.md              # Mermaid architecture and ER diagrams
│   ├── KNOWN_LIMITATIONS.md         # Transparent trade-offs & scaling boundaries
│   └── DEMO_SCRIPT.md               # Evaluator walkthrough guide
├── ENGINEERING_DECISIONS.md         # In-depth analysis of 8 architectural choices
├── .env.example                     # Environment template
├── README.md                        # Master setup & documentation guide
└── package.json                     # Monorepo root scripts
```

---

## 📑 Core REST API Endpoints

- `POST /api/auth/login`: Authenticate and receive JWT token.
- `GET /api/auth/profile`: Active user profile, system role, and team scopes.
- `GET /api/dashboard/summary`: Server-aggregated metrics, urgent queue, and assigned work.
- `GET /api/work-items`: List work items with server-side search, filtering, and pagination.
- `POST /api/work-items`: Create work item with mandatory purpose fields (Idempotent).
- `GET /api/work-items/:id`: Work item detail with ETag, comments, and audit timeline.
- `PUT /api/work-items/:id`: Update work item with OCC version verification (`If-Match`).
- `POST /api/work-items/:id/claim`: Atomic concurrent claim (`assigneeId: null`).
- `POST /api/work-items/:id/transition`: Workflow status transition with state machine validation.
- `POST /api/work-items/:id/comments`: Add comment with idempotency protection.
- `GET /api/teams`: List teams with member counts and active workload.
- `POST /api/simulation/race-claim`: Concurrency lab endpoint demonstrating 2-user claim collision.
- `POST /api/simulation/idempotency`: Idempotency lab endpoint demonstrating deduplication.
