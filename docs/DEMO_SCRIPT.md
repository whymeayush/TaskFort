# Newtonite Operations Hub — Reviewer Demonstration Walkthrough

This demonstration script provides an evaluator with an end-to-end, reproducible verification sequence covering all operational requirements, concurrency safety controls, and multi-team authorization boundaries.

---

## Prerequisites & Launch

1. **Start the Application**:
   ```powershell
   # In workspace root
   npm start
   ```
2. **Access in Browser**:
   Open `http://localhost:5000` (or `http://localhost:3000` if running `npm run dev:client`).

---

## 1. Authentication & Multi-Persona Switching

1. Navigate to the login page: `http://localhost:5000/login`.
2. Notice the **Fast Reviewer 1-Click Login** buttons for pre-configured personas:
   - **Alice Chen**: Central Operations Team Lead (`alice.chen@newtonite.internal`, `Password123!`)
   - **Bob Miller**: Central Operations Operator (`bob.miller@newtonite.internal`, `Password123!`)
   - **David Kim**: Core Engineering Lead (`david.kim@newtonite.internal`, `Password123!`)
   - **Elena Rostova**: Regulatory Compliance Lead (`elena.rostova@newtonite.internal`, `Password123!`)
   - **Marcus Vance**: Payment Operations Analyst (`marcus.vance@newtonite.internal`, `Password123!`)
   - **System Administrator**: Universal Operational Override (`admin@newtonite.internal`, `AdminSecret2026!`)
3. Click on **Alice Chen**. You are logged in and redirected to the **Operational Command Center** dashboard.
4. Notice the header's **Live Persona Switcher**: you can toggle between personas on any screen to test cross-role permissions instantly.

---

## 2. Operational Dashboard & Summary Metrics

1. On the Dashboard (`/`), observe the 6 server-computed metric cards:
   - **Open Items**
   - **In Progress**
   - **Critical / High Priority**
   - **Overdue SLA**
   - **Unassigned Pool**
   - **Pending Approvals**
2. Click on **Critical / High** to filter directly to critical incidents.
3. Review the **High-Priority Attention Queue** and **My Assigned Operations** sections.

---

## 3. Creating an Operational Work Item

1. Click **+ New Item** in the top navigation bar.
2. Observe the mandatory operational mandate fields required by Newtonite engineering rules:
   - **Title**: `Ingress webhook drops on checkout partner v3`
   - **Category Type**: Select `PRODUCTION_INCIDENT`
   - **Priority**: Select `CRITICAL`
   - **Responsible Team**: Select `Core Engineering (ENG)`
   - **Why does this item exist?**: `Third consecutive probe failure on webhook ingress endpoint`
   - **Operational & Business Impact**: `~$12,000/min in delayed checkout settlements`
   - **Next Required Action**: `Hotfix SSL cipher suite mismatch on proxy gateway`
   - **Technical Description**: `Detailed stack traces from node-04 ingress gateway`
3. Click **Create Work Item**. The item is created atomically, an initial audit log is committed in MongoDB, and you are redirected to the work item detail view.

---

## 4. Atomic OCC Claim & Assignment

1. Notice that the new work item is currently **Unassigned** with OCC revision `v1`.
2. Click **Claim Responsibility**:
   - The server atomically executes conditional query: `{ _id, assigneeId: null, version: 1 }`.
   - The work item status transitions to `In Progress`, ownership assigns to Alice Chen, and the version increments to `v2`.
   - An immutable event `[ASSIGNED]` appears instantly in the **Append-Only Audit Timeline**.

---

## 5. Workflow State Machine & Mandatory Resolution Summary

1. In the **Status** dropdown, select `Resolved`.
2. Notice that the system prompts for a **Mandatory Resolution Summary** modal.
   - Enter: `Re-keyed SSL certificate on proxy ingress and verified zero dropped webhooks over 15 minutes.`
3. Click **Confirm Resolution**:
   - The status transitions to `Resolved`.
   - The resolution summary is saved.
   - An event `[STATUS_CHANGE]` from `In Progress` → `Resolved` is appended to the audit timeline.
4. Try transitioning an item directly from `Open` to `Resolved` without investigation:
   - The workflow state machine blocks the invalid transition with `ILLEGAL_STATUS_TRANSITION`.

---

## 6. Team-Level Confidentiality & Resource Authorization

1. Switch active persona in the header dropdown to **Bob Miller** (Central Operations).
2. Attempt to view the confidential **GDPR Article 17 Erasure** ticket belonging to Regulatory Compliance:
   - Direct API / page navigation is blocked with **HTTP 403 RESOURCE_ACCESS_DENIED**.
   - Non-compliance operators cannot access confidential compliance or payment tickets.
3. Switch persona to **Elena Rostova** (Regulatory Compliance Lead):
   - Elena can view and manage the GDPR compliance request without restriction.
4. Switch persona to **System Administrator**:
   - The System Admin possesses universal operational oversight across all team boundaries.

---

## 7. Interactive Concurrency Lab (Testing 2-User Race & Idempotency)

1. Click **Concurrency Lab** in the navigation sidebar (`/simulation-lab`).
2. **Test 1: Simultaneous Assignment Race**:
   - Click **Trigger Race**.
   - The server executes two parallel async promises with Alice and Bob simultaneously attempting to claim the unassigned ticket at version 1.
   - Observe the live result:
     - **User 1**: `HTTP 200 SUCCESS: Claim succeeded` (version updated to v2)
     - **User 2**: `HTTP 409 CONCURRENCY_CONFLICT` (stale claim rejected)
     - Exactly one operator claims the item; zero double claims or lost ownership.
3. **Test 2: Idempotency Key Deduplication**:
   - Click **Test Replay**.
   - Two sequential requests are sent with identical `Idempotency-Key` headers.
   - Observe the live verification:
     - First Call: `MISS-STORED` (transaction executed)
     - Second Call: `HIT-IDEMPOTENT` (cached response replayed)
     - Database count confirms: `Zero Duplicate Side Effects Confirmed`.

---

## 8. Stale Update Detection & Conflict Modal

1. Open a work item detail page in two browser tabs (or test via the Edit page).
2. Submit an update from Tab 1 (incrementing the version from `v2` to `v3`).
3. In Tab 2, attempt to submit edits based on `v2`.
4. The server rejects the stale update with **HTTP 409 Conflict**.
5. The **Conflict Resolution Modal** opens automatically, displaying:
   - Your unsaved edits
   - Current server version and state
   - 1-click **Reload Latest Server Version** and **Copy Edits to Clipboard** actions.

---

## 9. Approvals & In-App Notifications

1. Switch to **Marcus Vance** (Payment Operations).
2. Open ticket `$420,000 wire settlement variance on Apex Clearing account`.
3. Notice that resolving this ticket requires managerial approval (`pendingApprovalRole: TEAM_ADMIN`).
4. Switch to **Elena Rostova** or **System Administrator** and navigate to `/approvals`.
5. Click **Authorize & Approve**:
   - The approval decision is recorded in MongoDB.
   - The activity log records the authorization timestamp and approver name.
6. Check the **Notifications** bell icon in the top right:
   - An in-app alert is generated for the team, with 1-click navigation to the approved work item.
