# Known Limitations & Boundaries — Newtonite Operations Hub

This document transparently records known limitations, architectural trade-offs, and future scaling milestones for the Newtonite Operations Hub platform, in accordance with the Candidate Brief requirements.

---

## 1. Concurrency & Locking Trade-Offs

- **Optimistic Concurrency Control vs Pessimistic Document Locks**:
  - *Current State*: The platform uses monotonic version checking (`$inc: { version: 1 }`). If two users submit edits concurrently, the second write receives HTTP 409 Conflict and must review server diffs.
  - *Trade-off*: When concurrent updates occur frequently on the same ticket, one user experience requires resolving a conflict. Pessimistic locks were intentionally avoided because holding document locks during operator think-time causes cascading timeouts and deadlock risks.
  - *Future Milestone*: Field-level three-way merge (Operational Transformation or CRDTs) for simultaneous comment editing.

## 2. In-App Notifications vs Distributed Push

- **Single-Cluster In-App Notification Center**:
  - *Current State*: Notifications are stored in MongoDB with read receipts and queried via polling / SSE endpoints.
  - *Trade-off*: Designed to avoid heavy external broker dependencies (such as Apache Kafka, RabbitMQ, or AWS SNS) during single-server deployment.
  - *Future Milestone*: External Redis Pub/Sub cluster backplane to broadcast WebSockets across multiple auto-scaling container replicas.

## 3. Large File Attachments & Binary Blobs

- **Investigation Notes vs Large File Storage**:
  - *Current State*: Investigation evidence, logs, stack traces, and discrepancy details are stored as structured text/JSON fields in MongoDB.
  - *Trade-off*: To maintain high database performance and keep documents well below MongoDB's 16MB document limit, binary dumps and multi-gigabyte log bundles are not accepted directly into MongoDB collections.
  - *Future Milestone*: Presigned S3/GCS multipart upload URLs storing pointers and checksums in `WorkItem.attachments`.

## 4. Idempotency Key Retention

- **Memory/Table Retention**:
  - *Current State*: Idempotency records are persisted with a TTL index expiring after 24 hours.
  - *Trade-off*: Retried requests older than 24 hours are treated as new requests rather than replays. For operational ticketing, 24 hours is more than sufficient to absorb network re-transmissions and client timeouts.

## 5. Replica Set Multi-Document Transactions

- **Transaction Scope**:
  - *Current State*: Multi-document transactions are used specifically where atomic cross-collection consistency is required (e.g., status mutations combined with immutable activity log entries).
  - *Trade-off*: Transactions incur higher write latency than single-document atomic updates. Single-document operations (such as unassigned ticket claims) utilize conditional atomic queries (`findOneAndUpdate`) rather than full sessions for maximum throughput.
