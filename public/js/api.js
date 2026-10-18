// API Client Wrapper with Idempotency Key generation and OCC version headers

class ApiClient {
  constructor() {
    this.currentUserId = 'usr-alice';
  }

  setUserId(userId) {
    this.currentUserId = userId;
  }

  generateUUID() {
    return 'idem-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': this.currentUserId,
      ...(options.headers || {})
    };

    // Automatically attach Idempotency-Key to mutating actions if not explicitly disabled
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method) && !headers['Idempotency-Key']) {
      headers['Idempotency-Key'] = this.generateUUID();
    }

    const config = {
      ...options,
      headers
    };

    const response = await fetch(endpoint, config);

    // Extract caching and ETag headers
    const idempotencyCacheStatus = response.headers.get('X-Cache');
    const etag = response.headers.get('ETag');

    let data = null;
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      data = { raw: text };
    }

    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.code = data.error;
      error.serverVersion = data.serverVersion;
      error.serverItem = data.serverItem;
      throw error;
    }

    return {
      data,
      etag,
      cacheStatus: idempotencyCacheStatus
    };
  }

  // Work Items
  async getWorkItems(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== null && val !== undefined && val !== 'ALL' && val !== '') {
        query.set(key, val);
      }
    });
    const res = await this.request(`/api/work-items?${query.toString()}`);
    return res.data;
  }

  async getWorkItem(id) {
    const res = await this.request(`/api/work-items/${id}`);
    return res.data;
  }

  async createWorkItem(payload, idempotencyKey = null) {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await this.request('/api/work-items', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  async updateWorkItem(id, updates, expectedVersion = null) {
    const headers = expectedVersion !== null ? { 'If-Match': `"v${expectedVersion}"` } : {};
    const res = await this.request(`/api/work-items/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ...updates, expectedVersion })
    });
    return res.data;
  }

  async claimWorkItem(id, expectedVersion = null) {
    const headers = expectedVersion !== null ? { 'If-Match': `"v${expectedVersion}"` } : {};
    const res = await this.request(`/api/work-items/${id}/claim`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expectedVersion })
    });
    return res.data;
  }

  async transitionStatus(id, targetStatus, payload = {}, expectedVersion = null) {
    const headers = expectedVersion !== null ? { 'If-Match': `"v${expectedVersion}"` } : {};
    const res = await this.request(`/api/work-items/${id}/transition`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, targetStatus, expectedVersion })
    });
    return res.data;
  }

  async addComment(id, message) {
    const res = await this.request(`/api/work-items/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    return res.data;
  }

  // Users & Teams
  async getUsers() {
    const res = await this.request('/api/users');
    return res.data;
  }

  async getTeams() {
    const res = await this.request('/api/teams');
    return res.data;
  }

  async getOutboxStats() {
    const res = await this.request('/api/outbox/stats');
    return res.data;
  }

  // Simulations
  async runRaceClaim(workItemId) {
    const res = await this.request('/api/simulation/race-claim', {
      method: 'POST',
      body: JSON.stringify({ workItemId })
    });
    return res.data;
  }

  async runIdempotencyTest(key = null) {
    const res = await this.request('/api/simulation/idempotency-test', {
      method: 'POST',
      body: JSON.stringify({ key })
    });
    return res.data;
  }

  async runOutboxFailure() {
    const res = await this.request('/api/simulation/outbox-failure', {
      method: 'POST',
      body: JSON.stringify({})
    });
    return res.data;
  }
}

export const api = new ApiClient();
