import React, { useState, useEffect } from 'react';
import { api, generateIdempotencyKey } from '../api/client';
import { Link } from 'react-router-dom';
import { Check, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ApprovalsPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/approvals');
      setApprovals(res.data || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [user]);

  const handleDecision = async (approvalId, decision) => {
    const comments = window.prompt(`Provide operational decision notes for ${decision}:`) || '';
    setActingId(approvalId);

    try {
      await api.post(`/approvals/${approvalId}/decision`, {
        decision,
        comments
      }, {
        headers: {
          'Idempotency-Key': generateIdempotencyKey(`appr-${decision.toLowerCase()}`)
        }
      });
      fetchApprovals();
    } catch (err) {
      alert(err.response?.data?.message || 'Decision failed');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-tf-charcoal tracking-tight">Approvals</h1>
          <p className="text-xs text-tf-slate mt-0.5">
            Operational sign-offs, authorization gates, and managerial compliance requests
          </p>
        </div>
        <button
          onClick={fetchApprovals}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-tf-border bg-white hover:bg-tf-bg text-xs text-tf-slate hover:text-tf-charcoal font-medium transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="bg-white border border-tf-border rounded-lg overflow-hidden shadow-tf-sm">
        {loading ? (
          <div className="py-12 flex items-center justify-center text-xs text-tf-slate">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading approvals inbox...
          </div>
        ) : approvals.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
            <p className="text-xs font-medium text-tf-charcoal">All caught up</p>
            <p className="text-[11px] text-tf-slate">No pending items require your operational authorization.</p>
          </div>
        ) : (
          <div className="divide-y divide-tf-border">
            {approvals.map(appr => {
              const requester = appr.requestedBy?.name || 'Operator';
              const reqInitials = requester.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div key={appr._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-tf-bg/50 transition">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 flex items-center justify-center">
                        {reqInitials}
                      </span>
                      <span className="text-xs text-tf-charcoal font-medium">
                        {requester}
                      </span>
                      <span className="text-[11px] text-tf-slate">requested approval</span>
                      <span className="text-[11px] text-tf-slate/70">·</span>
                      <time className="text-[11px] text-tf-slate">
                        {new Date(appr.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </time>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 ml-1">
                        Requires {appr.requiredRole}
                      </span>
                    </div>

                    <Link
                      to={`/work-items/${appr.workItemId?._id || appr.workItemId}`}
                      className="font-medium text-xs text-tf-charcoal hover:text-tf-indigo transition block"
                    >
                      {appr.workItemId?.title || 'Operational Work Item'}
                    </Link>

                    {appr.comments && (
                      <p className="text-xs text-tf-slate italic">
                        "{appr.comments}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleDecision(appr._id, 'REJECTED')}
                      disabled={actingId === appr._id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-tf-border text-tf-slate hover:text-red-700 hover:bg-red-50/50 text-xs font-medium transition disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => handleDecision(appr._id, 'APPROVED')}
                      disabled={actingId === appr._id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-tf-indigo hover:bg-tf-indigo/90 text-white text-xs font-medium shadow-tf-sm transition disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
