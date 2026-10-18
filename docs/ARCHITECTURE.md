# Newtonite Operations Hub — Architecture & System Design

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    Client["React.js SPA (Vite + Tailwind CSS)"] -->|HTTP / JSON (JWT, Idempotency-Key, If-Match)| API["Express.js REST API Server"]
    API --> Auth["Authentication & JWT Middleware"]
    API --> RBAC["Team & Resource-Level RBAC Middleware"]
    API --> Idem["Idempotency Cache Middleware"]
    API --> Controllers["Domain Controllers (WorkItem, Team, Approval)"]
    Controllers --> Services["Core Business Services & State Machine"]
    Services --> Mongoose["Mongoose ODM Models"]
    Mongoose --> Mongo["MongoDB Database (Replica Set / WiredTiger)"]
    Services --> Audit["Append-Only ActivityLog Engine"]
    Services --> Notif["In-App Notification Dispatcher"]
    Mongo --> Tx["Multi-Document ACID Transactions"]
```

---

## 2. Relational Entity-Relationship Diagram (Mongoose Models)

```mermaid
erDiagram
    User ||--o{ TeamMembership : "belongs to"
    Team ||--o{ TeamMembership : "has members"
    Team ||--o{ WorkItem : "owns"
    User ||--o{ WorkItem : "assignee"
    User ||--o{ WorkItem : "createdBy"
    WorkItem ||--o{ ActivityLog : "chronological events"
    WorkItem ||--o{ Comment : "collaboration"
    WorkItem ||--o{ Approval : "sign-offs"
    User ||--o{ Notification : "recipient"
    User ||--o{ IdempotencyKey : "originator"

    User {
        ObjectId _id
        string name
        string email
        string passwordHash
        string systemRole
        date createdAt
    }

    Team {
        ObjectId _id
        string name
        string code
        string description
    }

    TeamMembership {
        ObjectId userId
        ObjectId teamId
        string roleInTeam
    }

    WorkItem {
        ObjectId _id
        string title
        string description
        string type
        string status
        string priority
        ObjectId teamId
        ObjectId assigneeId
        ObjectId createdBy
        string reasonForExistence
        string businessImpact
        string nextActionRequired
        string resolutionSummary
        number version
        date dueDate
    }

    ActivityLog {
        ObjectId _id
        ObjectId workItemId
        ObjectId actorId
        string actionType
        string field
        string prevValue
        string newValue
        string correlationId
        date timestamp
    }
```

---

## 3. Workflow State Machine & Guardrails

```mermaid
stateDiagram-v2
    [*] --> Open: Item Created
    Open --> InProgress: Assigned / Claimed
    Open --> Closed: Discarded / Duplicate
    InProgress --> Blocked: Blocker Encountered
    Blocked --> InProgress: Blocker Resolved
    InProgress --> InReview: Work Complete / Requires Lead Review
    InReview --> InProgress: Changes Requested
    InReview --> Resolved: Approval Granted (Lead/Admin)
    InProgress --> Resolved: Direct Fix (Standard Item)
    Resolved --> Closed: Verification Complete
    Resolved --> InProgress: Reopened (Defect Regressed)
    Closed --> InProgress: Reopened (Requires Lead/Admin Role)
```

---

## 4. Concurrent Update & Optimistic Concurrency Control Flow

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Operator Alice (v1)
    actor Bob as Operator Bob (v1)
    participant API as Express API Server
    participant DB as MongoDB (WiredTiger)

    Note over Alice, Bob: Both operators open the same incident at version 1
    Alice->>API: POST /api/work-items/:id/claim (expectedVersion: 1)
    API->>DB: findOneAndUpdate({ _id, assigneeId: null, version: 1 }, { $set: { assigneeId: Alice }, $inc: { version: 1 } })
    DB-->>API: Success (Document Updated, version -> 2)
    API-->>Alice: HTTP 200 OK (Item claimed, version: 2)

    Bob->>API: POST /api/work-items/:id/claim (expectedVersion: 1)
    API->>DB: findOneAndUpdate({ _id, assigneeId: null, version: 1 }, ...)
    DB-->>API: null (Condition not met! version is already 2)
    API-->>Bob: HTTP 409 Conflict ({ error: 'CONCURRENCY_CONFLICT', serverVersion: 2, serverItem })
    Note over Bob: Client displays Conflict Resolution Modal with server diff!
```
