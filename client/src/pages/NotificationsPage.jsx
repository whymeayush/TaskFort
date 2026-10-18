import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { Bell, Check, RefreshCw } from 'lucide-react';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, readAt: new Date() } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-tf-charcoal tracking-tight">Notifications</h1>
          <p className="text-xs text-tf-slate mt-0.5">
            Assignment updates, approval decisions, and status transitions
          </p>
        </div>
        <button
          onClick={fetchNotifications}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-tf-border bg-white text-xs font-medium text-tf-slate hover:text-tf-charcoal hover:bg-tf-bg transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="bg-white border border-tf-border rounded-lg overflow-hidden shadow-tf-sm">
        {loading ? (
          <div className="py-12 flex items-center justify-center text-xs text-tf-slate">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading updates...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Bell className="w-7 h-7 text-tf-slate/40 mx-auto" />
            <p className="text-xs font-medium text-tf-charcoal">All caught up</p>
            <p className="text-[11px] text-tf-slate">No unread notifications at this time.</p>
          </div>
        ) : (
          <div className="divide-y divide-tf-border">
            {notifications.map(n => (
              <div
                key={n._id}
                className={`p-4 flex items-start justify-between gap-4 transition ${
                  !n.readAt ? 'bg-tf-indigo/5' : 'hover:bg-tf-bg/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {!n.readAt && (
                      <span className="w-1.5 h-1.5 rounded-full bg-tf-indigo shrink-0" />
                    )}
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-tf-bg text-tf-slate border border-tf-border">
                      {n.type}
                    </span>
                    <time className="text-[11px] text-tf-slate">
                      {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <p className="text-xs text-tf-charcoal font-medium">{n.message}</p>
                  {n.workItemId && (
                    <Link
                      to={`/work-items/${n.workItemId._id || n.workItemId}`}
                      className="text-xs text-tf-indigo hover:underline inline-block pt-0.5"
                    >
                      View work item →
                    </Link>
                  )}
                </div>

                {!n.readAt && (
                  <button
                    onClick={() => markAsRead(n._id)}
                    className="p-1 text-tf-slate hover:text-tf-charcoal rounded transition"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
