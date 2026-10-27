# Backend — Taskfort Operations Hub

The backend is an enterprise-grade Node.js and Express.js REST API service powered by MongoDB (Mongoose ODM) with WiredTiger multi-document ACID transactions, optimistic concurrency control (OCC), idempotent mutating endpoints, and multi-team resource-level RBAC.

## Directory Structure

```text
backend/
├── api/                    # Serverless function entrypoint (Vercel deployment)
│   └── index.js
├── src/
│   ├── config/             # Environment and application configuration
│   ├── controllers/        # REST controllers (auth, work items, teams, approvals, simulation, etc.)
│   ├── db/                 # Database connection management and seeders
│   ├── middleware/         # Auth, RBAC, Idempotency, and Error handling middleware
│   ├── models/             # Mongoose schemas (User, Team, WorkItem, ActivityLog, Approval, etc.)
│   ├── routes/             # Express API route definitions
│   ├── seeds/              # Initial database seed scripts
│   ├── services/           # Business logic & services (workItemService, auditService, workflowService, etc.)
│   ├── app.js              # Express app setup and middleware pipeline
│   ├── config.js           # Re-exported config module
│   └── server.js           # HTTP server startup & graceful shutdown
├── tests/                  # Automated test suites (node --test)
├── data/                   # Embedded database storage
├── package.json            # Backend dependencies and scripts
└── .env.example            # Environment variables template
```

## Running the Backend

From the repository root:
```bash
npm run dev --workspace=backend
```

Or from the `backend/` directory:
```bash
npm install
npm run dev
```

The API server starts at `http://localhost:5000`.

## Seeding the Database

Populate realistic operational data across all core categories:
```bash
npm run seed --workspace=backend
```

## Running Backend Tests

Run all verified non-CRUD automated test suites (Auth, OCC, Idempotency, RBAC, Pagination, Workflow):
```bash
npm test --workspace=backend
```
