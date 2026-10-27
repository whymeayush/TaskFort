// Client Reactive State Store

class Store {
  constructor() {
    this.state = {
      currentUser: null,
      users: [],
      teams: [],
      workItems: [],
      pagination: {
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 1,
        hasMore: false
      },
      filters: {
        status: 'ALL',
        teamId: 'ALL',
        priority: 'ALL',
        type: 'ALL',
        search: '',
        needsAttention: false
      },
      selectedItem: null,
      staleItemIds: new Set(),
      outboxStats: { PENDING: 0, COMPLETED: 0, DEAD_LETTER: 0 },
      conflictState: null
    };

    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(partial) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    }
  }

  markItemStale(id) {
    const updated = new Set(this.state.staleItemIds);
    updated.add(id);
    this.setState({ staleItemIds: updated });
  }

  clearStaleItem(id) {
    const updated = new Set(this.state.staleItemIds);
    updated.delete(id);
    this.setState({ staleItemIds: updated });
  }

  clearAllStale() {
    this.setState({ staleItemIds: new Set() });
  }
}

export const store = new Store();
