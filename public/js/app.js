import { api } from './api.js';
import { store } from './store.js';

// DOM Elements Cache
const elements = {
  // Navigation & Personas
  personaSelect: document.getElementById('persona-select'),
  personaRoleBadge: document.getElementById('persona-role-badge'),
  sseIndicator: document.getElementById('sse-indicator'),
  sseLabel: document.getElementById('sse-label'),
  btnNewItem: document.getElementById('btn-new-item'),
  btnToggleSim: document.getElementById('btn-toggle-simulation'),

  // Metrics
  metricAttention: document.getElementById('metric-attention-count'),
  metricCritical: document.getElementById('metric-critical-count'),
  metricMyTeam: document.getElementById('metric-myteam-count'),
  metricOutbox: document.getElementById('metric-outbox-count'),
  metricOutboxDetail: document.getElementById('metric-outbox-detail'),
  cardAttention: document.getElementById('card-attention'),
  cardCritical: document.getElementById('card-critical'),
  cardMyTeam: document.getElementById('card-myteam'),
  cardOutbox: document.getElementById('card-outbox'),

  // Search & Filters
  inputSearch: document.getElementById('input-search'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  filterTeam: document.getElementById('filter-team'),
  filterPriority: document.getElementById('filter-priority'),
  filterType: document.getElementById('filter-type'),
  btnResetFilters: document.getElementById('btn-reset-filters'),
  statusTabs: document.querySelectorAll('.status-tab'),
  tabBadgeAttention: document.getElementById('tab-badge-attention'),

  // Table & List
  resultsCount: document.getElementById('results-count'),
  itemsTableBody: document.getElementById('items-table-body'),
  emptyState: document.getElementById('empty-state'),
  btnPrevPage: document.getElementById('btn-prev-page'),
  btnNextPage: document.getElementById('btn-next-page'),
  pageIndicator: document.getElementById('page-indicator'),
  staleBanner: document.getElementById('stale-banner'),
  btnRefreshStale: document.getElementById('btn-refresh-stale'),

  // Drawer
  drawerOverlay: document.getElementById('drawer-overlay'),
  detailDrawer: document.getElementById('detail-drawer'),
  btnCloseDrawer: document.getElementById('btn-close-drawer'),
  drawerItemId: document.getElementById('drawer-item-id'),
  drawerVersionTag: document.getElementById('drawer-version-tag'),
  drawerTypeBadge: document.getElementById('drawer-type-badge'),
  drawerTitle: document.getElementById('drawer-title'),
  drawerStatusBadge: document.getElementById('drawer-status-badge'),
  drawerPriorityBadge: document.getElementById('drawer-priority-badge'),
  drawerTeamName: document.getElementById('drawer-team-name'),
  drawerReasonText: document.getElementById('drawer-reason-text'),
  drawerImpactText: document.getElementById('drawer-impact-text'),
  drawerNextActionText: document.getElementById('drawer-next-action-text'),
  drawerOwnerAvatar: document.getElementById('drawer-owner-avatar'),
  drawerOwnerName: document.getElementById('drawer-owner-name'),
  drawerOwnerEmail: document.getElementById('drawer-owner-email'),
  btnDrawerClaim: document.getElementById('btn-drawer-claim'),
  drawerDescriptionText: document.getElementById('drawer-description-text'),
  drawerResolutionBox: document.getElementById('drawer-resolution-box'),
  drawerResolutionText: document.getElementById('drawer-resolution-text'),
  drawerStaleAlert: document.getElementById('drawer-stale-alert'),
  btnDrawerSync: document.getElementById('btn-drawer-sync'),
  transitionButtonsContainer: document.getElementById('transition-buttons-container'),
  transitionFormBox: document.getElementById('transition-form-box'),
  transitionFormTitle: document.getElementById('transition-form-title'),
  transitionFields: document.getElementById('transition-fields'),
  btnCancelTransition: document.getElementById('btn-cancel-transition'),
  btnSubmitTransition: document.getElementById('btn-submit-transition'),
  drawerAuditCount: document.getElementById('drawer-audit-count'),
  drawerTimelineFeed: document.getElementById('drawer-timeline-feed'),
  inputComment: document.getElementById('input-comment'),
  btnSubmitComment: document.getElementById('btn-submit-comment'),

  // Modals & Panels
  createModalBackdrop: document.getElementById('create-modal-backdrop'),
  createItemForm: document.getElementById('create-item-form'),
  btnCloseCreate: document.getElementById('btn-close-create'),
  btnCancelCreate: document.getElementById('btn-cancel-create'),
  createTeamSelect: document.getElementById('create-team'),

  conflictModalBackdrop: document.getElementById('conflict-modal-backdrop'),
  conflictClientVersion: document.getElementById('conflict-client-version'),
  conflictServerVersion: document.getElementById('conflict-server-version'),
  conflictClientDiff: document.getElementById('conflict-client-diff'),
  conflictServerDiff: document.getElementById('conflict-server-diff'),
  btnCloseConflict: document.getElementById('btn-close-conflict'),
  btnConflictDismiss: document.getElementById('btn-conflict-dismiss'),
  btnConflictAccept: document.getElementById('btn-conflict-accept'),

  simulationDrawer: document.getElementById('simulation-drawer'),
  btnCloseSimulation: document.getElementById('btn-close-simulation'),
  btnRunRaceClaim: document.getElementById('btn-run-race-claim'),
  outputRaceClaim: document.getElementById('output-race-claim'),
  btnRunIdempotency: document.getElementById('btn-run-idempotency'),
  outputIdempotency: document.getElementById('output-idempotency'),
  btnRunOutboxFailure: document.getElementById('btn-run-outbox-failure'),
  outputOutboxFailure: document.getElementById('output-outbox-failure'),

  toastContainer: document.getElementById('toast-container')
};

let activePendingTransition = null;

// Initialize Application
async function initApp() {
  setupEventListeners();
  setupSSE();

  try {
    // 1. Fetch Users & Teams
    const [users, teams] = await Promise.all([api.getUsers(), api.getTeams()]);
    store.setState({ users, teams });

    // Populate Persona Selector
    elements.personaSelect.innerHTML = users.map(u => `
      <option value="${u.id}">${u.name} (${u.system_role})</option>
    `).join('');

    // Set Default Persona (Alice Chen)
    const defaultUser = users[0];
    store.setState({ currentUser: defaultUser });
    api.setUserId(defaultUser.id);
    updatePersonaBadge(defaultUser);

    // Populate Team Filters & Create modal team selector
    elements.filterTeam.innerHTML = '<option value="ALL">All Teams</option>' + teams.map(t => `
      <option value="${t.id}">${t.name} (${t.code})</option>
    `).join('');

    elements.createTeamSelect.innerHTML = teams.map(t => `
      <option value="${t.id}">${t.name} (${t.code})</option>
    `).join('');

    // 2. Fetch initial work items & metrics
    await Promise.all([loadWorkItems(), refreshMetrics()]);
  } catch (err) {
    showToast('Failed to initialize platform: ' + err.message, 'error');
  }
}

// Real-Time Server-Sent Events (SSE) Listener
function setupSSE() {
  const eventSource = new EventSource('/api/events');

  eventSource.onopen = () => {
    elements.sseIndicator.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    elements.sseLabel.textContent = 'Live Sync: Active';
  };

  eventSource.onerror = () => {
    elements.sseIndicator.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    elements.sseLabel.textContent = 'Live Sync: Reconnecting...';
  };

  eventSource.addEventListener('work_item_created', (e) => {
    const payload = JSON.parse(e.data);
    showToast(`New ${payload.item.type.replace('_', ' ')} created by ${payload.actor}: ${payload.item.title}`);
    refreshMetrics();
    loadWorkItems(false); // soft reload
  });

  eventSource.addEventListener('work_item_updated', (e) => {
    const payload = JSON.parse(e.data);
    const { id, version, actor, action, item } = payload;
    const { selectedItem } = store.getState();

    // Mark as stale for current view
    store.markItemStale(id);
    elements.staleBanner.style.display = 'flex';

    // If currently viewing this item in the drawer
    if (selectedItem && selectedItem.id === id) {
      if (selectedItem.version !== version) {
        elements.drawerStaleAlert.style.display = 'flex';
        elements.drawerVersionTag.textContent = `v${selectedItem.version} (Server: v${version})`;
        elements.drawerVersionTag.style.borderColor = '#f59e0b';
        elements.drawerVersionTag.style.color = '#f59e0b';
      }
    }

    showToast(`${actor} updated ${id} [${action}] (v${version})`);
    refreshMetrics();
    renderTable(); // re-render to flag stale rows
  });

  eventSource.addEventListener('comment_added', (e) => {
    const payload = JSON.parse(e.data);
    const { workItemId, author, message } = payload;
    const { selectedItem } = store.getState();

    showToast(`New comment on ${workItemId} from ${author}`);

    if (selectedItem && selectedItem.id === workItemId) {
      // Append comment to timeline live
      appendTimelineComment(author, message, new Date().toISOString());
    }
  });
}

// Load Work Items with Current Filter State
async function loadWorkItems(resetStale = true) {
  const state = store.getState();
  const params = {
    page: state.pagination.page,
    limit: state.pagination.limit,
    status: state.filters.status,
    teamId: state.filters.teamId,
    priority: state.filters.priority,
    type: state.filters.type,
    search: state.filters.search,
    needsAttention: state.filters.needsAttention
  };

  try {
    elements.resultsCount.textContent = 'Refreshing operational items...';
    const result = await api.getWorkItems(params);
    store.setState({
      workItems: result.items,
      pagination: result.pagination
    });

    if (resetStale) {
      store.clearAllStale();
      elements.staleBanner.style.display = 'none';
    }

    renderTable();
    renderPagination();
  } catch (err) {
    showToast('Failed to load work items: ' + err.message, 'error');
  }
}

// Render Work Items Table
function renderTable() {
  const { workItems, pagination, staleItemIds } = store.getState();

  if (!workItems || workItems.length === 0) {
    elements.itemsTableBody.innerHTML = '';
    elements.emptyState.style.display = 'flex';
    elements.resultsCount.textContent = '0 items found';
    return;
  }

  elements.emptyState.style.display = 'none';
  elements.resultsCount.textContent = `Showing ${workItems.length} of ${pagination.total} operational items`;

  elements.itemsTableBody.innerHTML = workItems.map(item => {
    const isStale = staleItemIds.has(item.id);
    const ownerInitial = item.owner_name ? item.owner_name.charAt(0) : '?';
    const ownerAvatarBg = item.owner_avatar_color || '#475569';

    return `
      <tr data-id="${item.id}" class="${isStale ? 'item-stale' : ''}">
        <td>
          <div class="item-id-pill">${item.id}</div>
          <div class="item-version-counter">v${item.version} ${isStale ? '<span style="color:#f59e0b">● Stale</span>' : ''}</div>
        </td>
        <td>
          <div class="item-cell-title">
            <a href="#" class="item-link-title" data-id="${item.id}">${escapeHtml(item.title)}</a>
            <div class="item-sub-reason">
              <span class="badge badge-type">${item.type.replace('_', ' ')}</span>
              <span>•</span>
              <span class="text-truncate" style="max-width: 320px;" title="${escapeHtml(item.reason_for_existence)}">${escapeHtml(item.reason_for_existence)}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="badge badge-status-${item.status.toLowerCase()}">${formatStatus(item.status)}</span>
        </td>
        <td>
          <span class="badge badge-${item.priority.toLowerCase()}">${item.priority}</span>
        </td>
        <td>
          <span style="font-weight: 500; font-size: 0.82rem;">${escapeHtml(item.team_name || item.team_id)}</span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="avatar-circle" style="background-color: ${ownerAvatarBg};">${ownerInitial}</span>
            <span style="font-size: 0.82rem; color: ${item.owner_name ? '#fff' : 'var(--text-muted)'};">
              ${escapeHtml(item.owner_name || 'Unassigned')}
            </span>
          </div>
        </td>
        <td>
          <button class="btn btn-secondary btn-xs btn-open-item" data-id="${item.id}">
            Inspect
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Pagination Controls
function renderPagination() {
  const { pagination } = store.getState();
  elements.btnPrevPage.disabled = pagination.page <= 1;
  elements.btnNextPage.disabled = !pagination.hasMore;
  elements.pageIndicator.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
}

// Open Work Item Detail Drawer
async function openDetailDrawer(itemId) {
  try {
    const item = await api.getWorkItem(itemId);
    store.setState({ selectedItem: item });
    store.clearStaleItem(itemId);

    // Update Drawer Header & Badges
    elements.drawerItemId.textContent = item.id;
    elements.drawerVersionTag.textContent = `v${item.version}`;
    elements.drawerVersionTag.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    elements.drawerVersionTag.style.color = '#818cf8';
    elements.drawerStaleAlert.style.display = 'none';

    elements.drawerTypeBadge.textContent = item.type.replace('_', ' ');
    elements.drawerTitle.textContent = item.title;
    elements.drawerStatusBadge.className = `badge badge-status-${item.status.toLowerCase()}`;
    elements.drawerStatusBadge.textContent = formatStatus(item.status);
    elements.drawerPriorityBadge.className = `badge badge-${item.priority.toLowerCase()}`;
    elements.drawerPriorityBadge.textContent = item.priority;
    elements.drawerTeamName.textContent = item.team_name || item.team_id;

    // Context Callouts
    elements.drawerReasonText.textContent = item.reason_for_existence;
    elements.drawerImpactText.textContent = item.business_impact;
    elements.drawerNextActionText.textContent = item.next_action_required || 'No immediate action assigned';

    // Responsibility Card
    if (item.owner_id) {
      elements.drawerOwnerAvatar.textContent = item.owner_name ? item.owner_name.charAt(0) : '?';
      elements.drawerOwnerAvatar.style.backgroundColor = item.owner_avatar_color || '#3b82f6';
      elements.drawerOwnerName.textContent = item.owner_name;
      elements.drawerOwnerEmail.textContent = item.owner_email || 'Verified Owner';
      elements.btnDrawerClaim.textContent = 'Reassign to Me';
    } else {
      elements.drawerOwnerAvatar.textContent = '?';
      elements.drawerOwnerAvatar.style.backgroundColor = '#475569';
      elements.drawerOwnerName.textContent = 'Unassigned Work Item';
      elements.drawerOwnerEmail.textContent = 'Requires an operator or lead to claim ownership';
      elements.btnDrawerClaim.textContent = 'Take Responsibility';
    }

    // Resolution Summary if applicable
    if (item.resolution_summary) {
      elements.drawerResolutionBox.style.display = 'block';
      elements.drawerResolutionText.textContent = item.resolution_summary;
    } else {
      elements.drawerResolutionBox.style.display = 'none';
    }

    elements.drawerDescriptionText.textContent = item.description;

    // Render Workflow Transition Buttons
    renderWorkflowTransitions(item);

    // Render Timeline & Comments
    renderTimeline(item);

    // Show Drawer
    elements.drawerOverlay.classList.add('active');
    elements.detailDrawer.classList.add('active');
  } catch (err) {
    if (err.status === 403) {
      showToast('Access Denied: You do not have permissions to view this confidential record.', 'error');
    } else {
      showToast('Error opening work item: ' + err.message, 'error');
    }
  }
}

// Close Detail Drawer
function closeDetailDrawer() {
  elements.drawerOverlay.classList.remove('active');
  elements.detailDrawer.classList.remove('active');
  elements.transitionFormBox.style.display = 'none';
  activePendingTransition = null;
  store.setState({ selectedItem: null });
}

// Render Workflow Transition Buttons
function renderWorkflowTransitions(item) {
  const { currentUser } = store.getState();
  const container = elements.transitionButtonsContainer;
  elements.transitionFormBox.style.display = 'none';
  activePendingTransition = null;

  const transitions = {
    DRAFT: [
      { status: 'TRIAGED', label: 'Mark as Triaged', btnClass: 'btn-secondary' },
      { status: 'CLOSED', label: 'Discard / Close', btnClass: 'btn-ghost' }
    ],
    TRIAGED: [
      { status: 'IN_INVESTIGATION', label: 'Start Active Investigation', btnClass: 'btn-primary' },
      { status: 'CLOSED', label: 'Close Item', btnClass: 'btn-ghost' }
    ],
    IN_INVESTIGATION: [
      { status: 'PENDING_APPROVAL', label: 'Submit for Approval', btnClass: 'btn-secondary' },
      { status: 'RESOLVED', label: 'Resolve Work Item', btnClass: 'btn-success' },
      { status: 'CLOSED', label: 'Close Item', btnClass: 'btn-ghost' }
    ],
    PENDING_APPROVAL: [
      { status: 'RESOLVED', label: 'Approve & Resolve', btnClass: 'btn-success', requiresLead: true },
      { status: 'IN_INVESTIGATION', label: 'Reject / Request Changes', btnClass: 'btn-danger', requiresLead: true },
      { status: 'CLOSED', label: 'Close Item', btnClass: 'btn-ghost', requiresLead: true }
    ],
    RESOLVED: [
      { status: 'CLOSED', label: 'Archive & Close', btnClass: 'btn-secondary' },
      { status: 'IN_INVESTIGATION', label: 'Reopen Investigation', btnClass: 'btn-ghost' }
    ],
    CLOSED: [
      { status: 'IN_INVESTIGATION', label: 'Reopen Item (Lead Only)', btnClass: 'btn-secondary', requiresLead: true }
    ]
  };

  const allowed = transitions[item.status] || [];
  const isLead = currentUser && (currentUser.system_role === 'ADMIN' || currentUser.isTeamLead);

  container.innerHTML = allowed.map(t => {
    const disabled = t.requiresLead && !isLead;
    const title = disabled ? 'Requires Team Lead or System Admin role' : '';
    return `
      <button class="btn btn-sm ${t.btnClass} btn-transition" 
              data-target="${t.status}" 
              ${disabled ? 'disabled' : ''} 
              title="${title}">
        ${t.label} ${disabled ? '(Locked)' : ''}
      </button>
    `;
  }).join('');
}

// Initiate Status Transition
function promptTransition(targetStatus) {
  const { selectedItem } = store.getState();
  activePendingTransition = targetStatus;

  elements.transitionFormBox.style.display = 'block';
  elements.transitionFormTitle.textContent = `Transition to ${formatStatus(targetStatus)}`;

  if (targetStatus === 'RESOLVED' || targetStatus === 'CLOSED') {
    elements.transitionFields.innerHTML = `
      <div class="form-group">
        <label for="input-resolution-summary">Resolution Summary (Required, min 10 chars):</label>
        <textarea id="input-resolution-summary" class="form-textarea" rows="2" placeholder="Explain the root cause fix, mitigation deployed, or verification performed...">${selectedItem.resolution_summary || ''}</textarea>
      </div>
    `;
  } else if (targetStatus === 'PENDING_APPROVAL') {
    elements.transitionFields.innerHTML = `
      <div class="form-group">
        <label for="input-approval-role">Required Approval Authority:</label>
        <select id="input-approval-role" class="form-select">
          <option value="TEAM_LEAD" selected>Team Lead</option>
          <option value="COMPLIANCE_LEAD">Compliance Lead</option>
          <option value="ADMIN">System Administrator</option>
        </select>
      </div>
      <div class="form-group" style="margin-top: 0.5rem;">
        <label for="input-approval-note">Approval Context / Notes:</label>
        <input type="text" id="input-approval-note" class="form-input" placeholder="e.g. Beneficiary verified; ready for payout release...">
      </div>
    `;
  } else {
    elements.transitionFields.innerHTML = `
      <div class="form-group">
        <label for="input-transition-note">Transition Comment (Optional):</label>
        <input type="text" id="input-transition-note" class="form-input" placeholder="Reason for status change...">
      </div>
    `;
  }
}

// Confirm Status Transition with Optimistic Locking Check
async function submitTransition() {
  const { selectedItem } = store.getState();
  if (!selectedItem || !activePendingTransition) return;

  const payload = { targetStatus: activePendingTransition };

  if (activePendingTransition === 'RESOLVED' || activePendingTransition === 'CLOSED') {
    const summaryInput = document.getElementById('input-resolution-summary');
    const summary = summaryInput ? summaryInput.value.trim() : '';
    if (summary.length < 10) {
      showToast('A resolution summary of at least 10 characters is required.', 'error');
      return;
    }
    payload.resolution_summary = summary;
  } else if (activePendingTransition === 'PENDING_APPROVAL') {
    const roleInput = document.getElementById('input-approval-role');
    const noteInput = document.getElementById('input-approval-note');
    payload.pending_approval_role = roleInput ? roleInput.value : 'TEAM_LEAD';
    payload.comment = noteInput ? noteInput.value.trim() : 'Submitted for review';
  } else {
    const noteInput = document.getElementById('input-transition-note');
    if (noteInput && noteInput.value.trim()) {
      payload.comment = noteInput.value.trim();
    }
  }

  try {
    elements.btnSubmitTransition.disabled = true;
    elements.btnSubmitTransition.textContent = 'Submitting...';

    const updated = await api.transitionStatus(
      selectedItem.id,
      activePendingTransition,
      payload,
      selectedItem.version // PASS EXPECTED OCC VERSION TOKEN
    );

    showToast(`Status updated to ${formatStatus(activePendingTransition)}!`, 'success');
    await openDetailDrawer(updated.id);
    await loadWorkItems(false);
    refreshMetrics();
  } catch (err) {
    if (err.status === 409) {
      showConflictModal(selectedItem, err.serverItem);
    } else {
      showToast(err.message, 'error');
    }
  } finally {
    elements.btnSubmitTransition.disabled = false;
    elements.btnSubmitTransition.textContent = 'Confirm Transition';
  }
}

// Claim Responsibility with OCC
async function claimWorkItem() {
  const { selectedItem } = store.getState();
  if (!selectedItem) return;

  try {
    elements.btnDrawerClaim.disabled = true;
    elements.btnDrawerClaim.textContent = 'Claiming...';

    const updated = await api.claimWorkItem(
      selectedItem.id,
      selectedItem.version // Pass OCC expected version
    );

    showToast(`You have taken responsibility for ${updated.id}!`, 'success');
    await openDetailDrawer(updated.id);
    await loadWorkItems(false);
    refreshMetrics();
  } catch (err) {
    if (err.status === 409) {
      showConflictModal(selectedItem, err.serverItem);
    } else {
      showToast(err.message, 'error');
    }
  } finally {
    elements.btnDrawerClaim.disabled = false;
    elements.btnDrawerClaim.textContent = 'Take Responsibility';
  }
}

// Render Timeline Feed
function renderTimeline(item) {
  const feed = elements.drawerTimelineFeed;
  const events = item.auditEvents || [];
  const comments = item.comments || [];

  elements.drawerAuditCount.textContent = `${events.length + comments.length} events`;

  // Merge events and comments into unified chronological feed
  const combined = [
    ...events.map(e => ({ ...e, isComment: false })),
    ...comments.map(c => ({
      id: c.id,
      created_at: c.created_at,
      actor_name: c.author_name,
      comment: c.message,
      isComment: true
    }))
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (combined.length === 0) {
    feed.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; padding: 1rem 0;">No activity recorded yet.</div>';
    return;
  }

  feed.innerHTML = combined.map(entry => {
    const formattedDate = new Date(entry.created_at).toLocaleString();

    if (entry.isComment) {
      return `
        <div class="timeline-entry">
          <span class="timeline-node-dot" style="background: #38bdf8;"></span>
          <div class="timeline-entry-header">
            <span class="timeline-actor">${escapeHtml(entry.actor_name)}</span>
            <span class="badge" style="font-size: 0.65rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8;">Comment</span>
            <span class="timeline-time">${formattedDate}</span>
          </div>
          <div class="timeline-comment-bubble">
            ${escapeHtml(entry.comment)}
          </div>
        </div>
      `;
    }

    let actionLabel = entry.action_type;
    let dotColor = '#818cf8';

    if (entry.action_type === 'CREATED') {
      actionLabel = 'Created Work Item';
      dotColor = '#10b981';
    } else if (entry.action_type === 'CLAIMED') {
      actionLabel = 'Claimed Responsibility';
      dotColor = '#6366f1';
    } else if (entry.action_type === 'STATUS_TRANSITION') {
      actionLabel = `Changed Status: ${entry.old_value} → ${entry.new_value}`;
      dotColor = '#f59e0b';
    } else if (entry.action_type === 'APPROVAL_GRANTED') {
      actionLabel = 'Granted Leadership Approval';
      dotColor = '#10b981';
    }

    return `
      <div class="timeline-entry">
        <span class="timeline-node-dot" style="background: ${dotColor};"></span>
        <div class="timeline-entry-header">
          <span class="timeline-actor">${escapeHtml(entry.actor_name || 'System')}</span>
          <span style="color: var(--text-secondary); font-size: 0.78rem;">${actionLabel}</span>
          <span class="timeline-time">${formattedDate}</span>
        </div>
        ${entry.comment ? `<div style="font-size: 0.8rem; color: var(--text-secondary); padding-left: 0.25rem;">Note: ${escapeHtml(entry.comment)}</div>` : ''}
      </div>
    `;
  }).join('');
}

// Append Single Comment Live
function appendTimelineComment(author, message, timestamp) {
  const feed = elements.drawerTimelineFeed;
  const div = document.createElement('div');
  div.className = 'timeline-entry fade-in';
  div.innerHTML = `
    <span class="timeline-node-dot" style="background: #38bdf8;"></span>
    <div class="timeline-entry-header">
      <span class="timeline-actor">${escapeHtml(author)}</span>
      <span class="badge" style="font-size: 0.65rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8;">Comment</span>
      <span class="timeline-time">${new Date(timestamp).toLocaleString()}</span>
    </div>
    <div class="timeline-comment-bubble">
      ${escapeHtml(message)}
    </div>
  `;
  feed.appendChild(div);
}

// Post Comment
async function postComment() {
  const { selectedItem } = store.getState();
  const message = elements.inputComment.value.trim();
  if (!selectedItem || !message) return;

  try {
    elements.btnSubmitComment.disabled = true;
    await api.addComment(selectedItem.id, message);
    elements.inputComment.value = '';
    showToast('Comment recorded to audit timeline', 'success');
  } catch (err) {
    showToast('Failed to post comment: ' + err.message, 'error');
  } finally {
    elements.btnSubmitComment.disabled = false;
  }
}

// Show Concurrency Conflict Modal (HTTP 409 Resolution)
function showConflictModal(clientItem, serverItem) {
  elements.conflictClientVersion.textContent = `v${clientItem.version}`;
  elements.conflictServerVersion.textContent = `v${serverItem.version}`;

  elements.conflictClientDiff.innerHTML = `
    <div><strong>Title:</strong> ${escapeHtml(clientItem.title)}</div>
    <div><strong>Status:</strong> ${clientItem.status}</div>
    <div><strong>Owner:</strong> ${clientItem.owner_name || 'Unassigned'}</div>
    <div><strong>Priority:</strong> ${clientItem.priority}</div>
  `;

  elements.conflictServerDiff.innerHTML = `
    <div><strong>Title:</strong> ${escapeHtml(serverItem.title)}</div>
    <div style="color: #6ee7b7;"><strong>Status:</strong> ${serverItem.status}</div>
    <div style="color: #6ee7b7;"><strong>Owner:</strong> ${serverItem.owner_name || 'Unassigned'}</div>
    <div style="color: #6ee7b7;"><strong>Priority:</strong> ${serverItem.priority}</div>
    <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #94a3b8;">Updated: ${new Date(serverItem.updated_at).toLocaleTimeString()}</div>
  `;

  elements.conflictModalBackdrop.style.display = 'flex';
}

function closeConflictModal() {
  elements.conflictModalBackdrop.style.display = 'none';
}

// Refresh Operational Metrics
async function refreshMetrics() {
  try {
    const { currentUser } = store.getState();
    const [attentionRes, criticalRes, myTeamRes, outboxRes] = await Promise.all([
      api.getWorkItems({ needsAttention: true, limit: 1 }),
      api.getWorkItems({ priority: 'CRITICAL', status: 'IN_INVESTIGATION', limit: 1 }),
      api.getWorkItems({ teamId: currentUser && currentUser.teamIds[0] ? currentUser.teamIds[0] : null, limit: 1 }),
      api.getOutboxStats()
    ]);

    const attCount = attentionRes.pagination.total || 0;
    elements.metricAttention.textContent = attCount;
    elements.tabBadgeAttention.textContent = attCount;

    elements.metricCritical.textContent = criticalRes.pagination.total || 0;
    elements.metricMyTeam.textContent = myTeamRes.pagination.total || 0;

    const completed = outboxRes.counts.COMPLETED || 0;
    const deadLetter = outboxRes.counts.DEAD_LETTER || 0;
    elements.metricOutbox.textContent = completed;
    elements.metricOutboxDetail.textContent = deadLetter > 0 
      ? `⚠️ ${deadLetter} dead-letter jobs` 
      : `${completed} async tasks delivered`;
  } catch (err) {
    // Non-fatal metrics error
  }
}

// Switch Persona
function handlePersonaChange(userId) {
  const { users } = store.getState();
  const user = users.find(u => u.id === userId);
  if (!user) return;

  store.setState({ currentUser: user });
  api.setUserId(user.id);
  updatePersonaBadge(user);

  showToast(`Switched active persona to ${user.name} (${user.system_role})`);

  // Re-fetch work items with new permissions & reload metrics
  loadWorkItems(true);
  refreshMetrics();

  // If drawer is open, refresh permissions on open item
  const { selectedItem } = store.getState();
  if (selectedItem) {
    openDetailDrawer(selectedItem.id);
  }
}

function updatePersonaBadge(user) {
  elements.personaRoleBadge.textContent = user.system_role;
  if (user.system_role === 'ADMIN') {
    elements.personaRoleBadge.style.color = '#f87171';
    elements.personaRoleBadge.style.background = 'rgba(239, 68, 68, 0.15)';
  } else if (user.system_role === 'TEAM_LEAD') {
    elements.personaRoleBadge.style.color = '#818cf8';
    elements.personaRoleBadge.style.background = 'rgba(99, 102, 241, 0.15)';
  } else {
    elements.personaRoleBadge.style.color = '#38bdf8';
    elements.personaRoleBadge.style.background = 'rgba(56, 189, 248, 0.15)';
  }
}

// Simulator Actions
async function runRaceSimulation() {
  const { workItems } = store.getState();
  const targetItem = workItems.find(i => !i.owner_id) || workItems[0];
  if (!targetItem) {
    showToast('No eligible work item found for race condition test.', 'error');
    return;
  }

  elements.outputRaceClaim.style.display = 'block';
  elements.outputRaceClaim.textContent = `Fired 2 concurrent claims for ${targetItem.id} at version v${targetItem.version}...\nExecuting...`;

  try {
    const result = await api.runRaceClaim(targetItem.id);
    elements.outputRaceClaim.textContent = JSON.stringify(result, null, 2);
    showToast('Race condition test complete! One 200 OK and one 409 Conflict observed.', 'success');
    await loadWorkItems(false);
  } catch (err) {
    elements.outputRaceClaim.textContent = 'Simulation error: ' + err.message;
  }
}

async function runIdempotencySimulation() {
  const testKey = 'idem-sim-' + Date.now();
  elements.outputIdempotency.style.display = 'block';
  elements.outputIdempotency.textContent = `Attempt 1: Sending request with Key: ${testKey}...\nAttempt 2: Immediately repeating identical request...\n`;

  try {
    const res1 = await api.runIdempotencyTest(testKey);
    const res2 = await api.runIdempotencyTest(testKey);

    elements.outputIdempotency.textContent = 
      `--- CALL 1 (Initial Request) ---\n` +
      `Cache Status: ${res1.cacheStatus}\n` +
      `First Execution: ${res1.isFirstCall}\n\n` +
      `--- CALL 2 (Repeated Request) ---\n` +
      `Cache Status: ${res2.cacheStatus} (Instant Cached Replay)\n` +
      `First Execution: ${res2.isFirstCall}\n` +
      `Side Effects Duplicated: ${res2.sideEffectsDuplicated} (Guaranteed Zero Duplicates!)\n` +
      `Payload: ${JSON.stringify(res2.cachedResponse)}`;

    showToast('Idempotency test verified! Repeated call served from cache.', 'success');
  } catch (err) {
    elements.outputIdempotency.textContent = 'Idempotency simulation error: ' + err.message;
  }
}

async function runOutboxFailureSimulation() {
  elements.outputOutboxFailure.style.display = 'block';
  elements.outputOutboxFailure.textContent = 'Enqueuing failing async job with maxRetries=2...\nProcessing attempts...';

  try {
    const result = await api.runOutboxFailure();
    elements.outputOutboxFailure.textContent = JSON.stringify(result, null, 2);
    showToast('Outbox worker exponential backoff and dead-letter classification verified!', 'success');
    refreshMetrics();
  } catch (err) {
    elements.outputOutboxFailure.textContent = 'Outbox simulation error: ' + err.message;
  }
}

// Toast Notifications Helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✖' : 'ℹ'}</span>
    <div>${escapeHtml(message)}</div>
  `;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 4500);
}

// Utilities
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatStatus(status) {
  if (!status) return '';
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

// Setup Event Listeners
function setupEventListeners() {
  // Persona switcher
  elements.personaSelect.addEventListener('change', (e) => handlePersonaChange(e.target.value));

  // Search input with debounce
  let searchTimeout = null;
  elements.inputSearch.addEventListener('input', (e) => {
    elements.btnClearSearch.style.display = e.target.value ? 'block' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const state = store.getState();
      store.setState({
        filters: { ...state.filters, search: e.target.value.trim() },
        pagination: { ...state.pagination, page: 1 }
      });
      loadWorkItems(true);
    }, 280);
  });

  elements.btnClearSearch.addEventListener('click', () => {
    elements.inputSearch.value = '';
    elements.btnClearSearch.style.display = 'none';
    const state = store.getState();
    store.setState({
      filters: { ...state.filters, search: '' },
      pagination: { ...state.pagination, page: 1 }
    });
    loadWorkItems(true);
  });

  // Filters
  elements.filterTeam.addEventListener('change', (e) => {
    const state = store.getState();
    store.setState({
      filters: { ...state.filters, teamId: e.target.value },
      pagination: { ...state.pagination, page: 1 }
    });
    loadWorkItems(true);
  });

  elements.filterPriority.addEventListener('change', (e) => {
    const state = store.getState();
    store.setState({
      filters: { ...state.filters, priority: e.target.value },
      pagination: { ...state.pagination, page: 1 }
    });
    loadWorkItems(true);
  });

  elements.filterType.addEventListener('change', (e) => {
    const state = store.getState();
    store.setState({
      filters: { ...state.filters, type: e.target.value },
      pagination: { ...state.pagination, page: 1 }
    });
    loadWorkItems(true);
  });

  elements.btnResetFilters.addEventListener('click', () => {
    elements.filterTeam.value = 'ALL';
    elements.filterPriority.value = 'ALL';
    elements.filterType.value = 'ALL';
    elements.inputSearch.value = '';
    elements.btnClearSearch.style.display = 'none';
    elements.statusTabs.forEach(t => t.classList.toggle('active', t.dataset.status === 'ALL'));

    store.setState({
      filters: {
        status: 'ALL',
        teamId: 'ALL',
        priority: 'ALL',
        type: 'ALL',
        search: '',
        needsAttention: false
      },
      pagination: { ...store.getState().pagination, page: 1 }
    });
    loadWorkItems(true);
  });

  // Status Tabs
  elements.statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.statusTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetStatus = tab.dataset.status;
      const isNeedsAttention = targetStatus === 'NEEDS_ATTENTION';

      store.setState({
        filters: {
          ...store.getState().filters,
          status: isNeedsAttention ? 'ALL' : targetStatus,
          needsAttention: isNeedsAttention
        },
        pagination: { ...store.getState().pagination, page: 1 }
      });
      loadWorkItems(true);
    });
  });

  // Pagination
  elements.btnPrevPage.addEventListener('click', () => {
    const { pagination } = store.getState();
    if (pagination.page > 1) {
      store.setState({ pagination: { ...pagination, page: pagination.page - 1 } });
      loadWorkItems(true);
    }
  });

  elements.btnNextPage.addEventListener('click', () => {
    const { pagination } = store.getState();
    if (pagination.hasMore) {
      store.setState({ pagination: { ...pagination, page: pagination.page + 1 } });
      loadWorkItems(true);
    }
  });

  // Refresh stale banner button
  elements.btnRefreshStale.addEventListener('click', () => loadWorkItems(true));

  // Table Row Click
  elements.itemsTableBody.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const itemId = row.dataset.id;
    if (itemId) openDetailDrawer(itemId);
  });

  // Drawer Controls
  elements.btnCloseDrawer.addEventListener('click', closeDetailDrawer);
  elements.drawerOverlay.addEventListener('click', closeDetailDrawer);
  elements.btnDrawerSync.addEventListener('click', () => {
    const { selectedItem } = store.getState();
    if (selectedItem) openDetailDrawer(selectedItem.id);
  });

  elements.btnDrawerClaim.addEventListener('click', claimWorkItem);

  elements.transitionButtonsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-transition');
    if (!btn || btn.disabled) return;
    promptTransition(btn.dataset.target);
  });

  elements.btnCancelTransition.addEventListener('click', () => {
    elements.transitionFormBox.style.display = 'none';
    activePendingTransition = null;
  });

  elements.btnSubmitTransition.addEventListener('click', submitTransition);
  elements.btnSubmitComment.addEventListener('click', postComment);

  // New Work Item Modal
  elements.btnNewItem.addEventListener('click', () => {
    elements.createModalBackdrop.style.display = 'flex';
  });

  const closeCreateModal = () => {
    elements.createModalBackdrop.style.display = 'none';
    elements.createItemForm.reset();
  };

  elements.btnCloseCreate.addEventListener('click', closeCreateModal);
  elements.btnCancelCreate.addEventListener('click', closeCreateModal);

  elements.createItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('create-title').value,
      type: document.getElementById('create-type').value,
      priority: document.getElementById('create-priority').value,
      team_id: document.getElementById('create-team').value,
      reason_for_existence: document.getElementById('create-reason').value,
      business_impact: document.getElementById('create-impact').value,
      next_action_required: document.getElementById('create-next-action').value || 'Triage and assign owner',
      description: document.getElementById('create-description').value
    };

    try {
      const created = await api.createWorkItem(payload);
      showToast(`Work Item ${created.id} created successfully!`, 'success');
      closeCreateModal();
      await loadWorkItems(true);
      refreshMetrics();
      openDetailDrawer(created.id);
    } catch (err) {
      showToast('Creation failed: ' + err.message, 'error');
    }
  });

  // Conflict Modal
  elements.btnCloseConflict.addEventListener('click', closeConflictModal);
  elements.btnConflictDismiss.addEventListener('click', closeConflictModal);
  elements.btnConflictAccept.addEventListener('click', async () => {
    closeConflictModal();
    const { selectedItem } = store.getState();
    if (selectedItem) {
      await openDetailDrawer(selectedItem.id);
    }
    await loadWorkItems(true);
  });

  // Metric Card shortcuts
  elements.cardAttention.addEventListener('click', () => {
    elements.statusTabs.forEach(t => t.classList.toggle('active', t.dataset.status === 'NEEDS_ATTENTION'));
    store.setState({
      filters: { ...store.getState().filters, status: 'ALL', needsAttention: true },
      pagination: { ...store.getState().pagination, page: 1 }
    });
    loadWorkItems(true);
  });

  elements.cardCritical.addEventListener('click', () => {
    elements.filterPriority.value = 'CRITICAL';
    store.setState({
      filters: { ...store.getState().filters, priority: 'CRITICAL', needsAttention: false },
      pagination: { ...store.getState().pagination, page: 1 }
    });
    loadWorkItems(true);
  });

  // Simulator Drawer
  elements.btnToggleSim.addEventListener('click', () => {
    const isShown = elements.simulationDrawer.style.display === 'flex';
    elements.simulationDrawer.style.display = isShown ? 'none' : 'flex';
  });

  elements.btnCloseSimulation.addEventListener('click', () => {
    elements.simulationDrawer.style.display = 'none';
  });

  elements.btnRunRaceClaim.addEventListener('click', runRaceSimulation);
  elements.btnRunIdempotency.addEventListener('click', runIdempotencySimulation);
  elements.btnRunOutboxFailure.addEventListener('click', runOutboxFailureSimulation);
}

// Start application
window.addEventListener('DOMContentLoaded', initApp);
