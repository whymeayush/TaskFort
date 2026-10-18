import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, generateIdempotencyKey } from '../api/client';
import { StatusBadge, PriorityBadge, TypeBadge } from '../components/StatusBadge';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { ConflictModal } from '../components/ConflictModal';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  User,
  Shield,
  ArrowRight,
  MessageSquare,
  Edit,
  Send,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Calendar,
  History,
  Building,
  Tag
} from 'lucide-react';

export function WorkItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Comments state
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Status transition state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');

  // Conflict state
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [clientPayload, setClientPayload] = useState(null);

  const fetchItem = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/work-items/${id}`);
      setItem(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError({
          title: 'Access Restricted',
          message: err.response.data?.message || 'You do not belong to the authorized team for this confidential work item.'
        });
      } else if (err.response?.status === 404) {
        setError({
          title: 'Work item not found',
          message: 'The requested operational record does not exist or has been archived.'
        });
      } else {
        setError({
          title: 'Error loading work item',
          message: err.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [id, user]);

  // Atomic OCC Claim
  const handleClaim = async () => {
    setActionLoading(true);
    const payload = { expectedVersion: item.version };
    try {
      const res = await api.post(`/work-items/${id}/claim`, payload, {
        headers: {
          'If-Match': `"v${item.version}"`,
          'Idempotency-Key': generateIdempotencyKey('claim')
        }
      });
      setItem(res.data);
      fetchItem();
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictData(err.response.data);
        setClientPayload(payload);
        setConflictOpen(true);
      } else {
        alert(err.response?.data?.message || 'Claim failed');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Status Transition
  const handleStatusChange = (newStatus) => {
    if (newStatus === 'Resolved') {
      setShowResolveModal(true);
      return;
    }
    executeTransition(newStatus);
  };

  const executeTransition = async (newStatus, summary = null) => {
    setActionLoading(true);
    const payload = {
      targetStatus: newStatus,
      resolutionSummary: summary,
      expectedVersion: item.version
    };

    try {
      const res = await api.post(`/work-items/${id}/transition`, payload, {
        headers: {
          'If-Match': `"v${item.version}"`,
          'Idempotency-Key': generateIdempotencyKey('status-trans')
        }
      });
      setItem(res.data);
      setShowResolveModal(false);
      setResolutionSummary('');
      fetchItem();
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictData(err.response.data);
        setClientPayload(payload);
        setConflictOpen(true);
      } else {
        alert(err.response?.data?.message || 'Transition rejected');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Add Comment with Idempotency Key
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setPostingComment(true);
    try {
      await api.post(`/work-items/${id}/comments`, { body: newComment.trim() }, {
        headers: {
          'Idempotency-Key': generateIdempotencyKey('comment')
        }
      });
      setNewComment('');
      fetchItem();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200/70 rounded w-48" />
        <div className="h-10 bg-slate-200/50 rounded w-3/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
          <div className="lg:col-span-2 h-96 bg-white border border-[#E7E9EF] rounded-lg" />
          <div className="h-80 bg-white border border-[#E7E9EF] rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#E7E9EF] rounded-lg p-8 max-w-md mx-auto text-center space-y-3 my-12 shadow-tf-sm">
        <AlertCircle className="w-8 h-8 text-[#727987] mx-auto" />
        <h2 className="text-sm font-semibold text-[#20242C]">{error.title}</h2>
        <p className="text-xs text-[#727987] leading-relaxed">{error.message}</p>
        <div className="pt-2">
          <Link to="/work-items" className="text-xs text-[#4F5FE8] hover:underline font-medium">
            ← Return to All Work
          </Link>
        </div>
      </div>
    );
  }

  const isUnassigned = !item.assigneeId;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Header with Breadcrumb, Task Identifier, Title, and Direct Actions */}
      <div className="bg-white border border-[#E7E9EF] rounded-lg p-5 shadow-tf-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#F0F2F6] pb-3">
          <div className="flex items-center gap-2 text-xs">
            <Link to="/work-items" className="text-[#727987] hover:text-[#20242C]">
              Work items
            </Link>
            <span className="text-[#D1D5DF]">/</span>
            <span className="font-mono text-[#727987] font-medium">
              {item.teamId?.code}-{item._id.slice(-4).toUpperCase()}
            </span>
            <span className="text-[10px] font-mono text-[#9CA3AF] bg-[#F8F9FB] px-1.5 py-0.2 rounded border border-[#E7E9EF]">
              v{item.version}
            </span>
          </div>

          {/* Action Menu */}
          <div className="flex items-center gap-2">
            {isUnassigned && (
              <button
                type="button"
                onClick={handleClaim}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F5FE8] hover:bg-[#4150D8] text-white text-xs font-medium shadow-tf-sm transition disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Claim responsibility</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#727987]">Status:</span>
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={actionLoading}
                className="text-xs px-2.5 py-1 rounded-md border border-[#E7E9EF] bg-white text-[#20242C] font-medium hover:border-[#D1D5DF]"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="In Review">In Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <Link
              to={`/work-items/${item._id}/edit`}
              className="px-2.5 py-1 rounded-md border border-[#E7E9EF] text-xs font-medium text-[#727987] hover:text-[#20242C] hover:bg-[#F8F9FB] transition"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Title & Status Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <h1 className="text-lg font-semibold text-[#20242C] tracking-tight">
            {item.title}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <PriorityBadge priority={item.priority} />
            <StatusBadge status={item.status} />
          </div>
        </div>
      </div>

      {/* 2. Main Issue-Tracking Workspace (Left: Details & Comments, Right: Details Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Purpose, Description, Comments, Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Operational Mandate Box */}
          <div className="bg-white border border-[#E7E9EF] rounded-lg p-5 shadow-tf-sm space-y-4">
            <span className="text-xs font-semibold text-[#20242C] uppercase tracking-wider block border-b border-[#F0F2F6] pb-2 font-mono text-[10px]">
              Operational Mandate
            </span>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[11px] font-medium text-[#727987] block mb-1">
                  Why this item exists (Root cause trigger)
                </span>
                <p className="p-3 bg-[#F8F9FB] border border-[#E7E9EF] rounded-md text-[#20242C] font-medium leading-relaxed">
                  {item.reasonForExistence}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-medium text-[#727987] block mb-1">
                  Operational & Business Impact
                </span>
                <p className="p-3 bg-amber-50/40 border border-amber-200/60 rounded-md text-amber-950 leading-relaxed">
                  {item.businessImpact}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-medium text-[#727987] block mb-1">
                  Next Required Action
                </span>
                <p className="p-3 bg-blue-50/40 border border-blue-200/60 rounded-md text-blue-950 font-medium flex items-center gap-2 leading-relaxed">
                  <ArrowRight className="w-3.5 h-3.5 text-[#4F5FE8] shrink-0" />
                  {item.nextActionRequired || 'Assignee triage and root cause investigation'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-medium text-[#727987] block mb-1">
                  Technical Details & Telemetry
                </span>
                <p className="text-[#20242C] leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              </div>
            </div>

            {item.resolutionSummary && (
              <div className="p-3 bg-emerald-50/50 border border-emerald-200/70 rounded-md text-xs space-y-0.5">
                <span className="font-semibold text-emerald-800 block text-[11px]">Resolution Summary</span>
                <p className="text-emerald-950">{item.resolutionSummary}</p>
              </div>
            )}
          </div>

          {/* Comments & Updates Composer */}
          <div className="bg-white border border-[#E7E9EF] rounded-lg p-5 shadow-tf-sm space-y-4">
            <span className="text-xs font-semibold text-[#20242C] uppercase tracking-wider block border-b border-[#F0F2F6] pb-2 font-mono text-[10px]">
              Collaboration & Discussion ({item.comments?.length || 0})
            </span>

            {/* Comment Thread */}
            <div className="space-y-3">
              {(!item.comments || item.comments.length === 0) ? (
                <p className="text-xs text-[#727987] py-2 text-center">
                  No comments yet. Leave a handoff note or investigation update below.
                </p>
              ) : (
                item.comments.map(c => {
                  const author = c.authorId?.name || 'Operator';
                  return (
                    <div key={c._id} className="p-3 bg-[#F8F9FB] border border-[#E7E9EF] rounded-md text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium text-[#20242C]">
                          <div className="w-4 h-4 rounded-full bg-[#EEF1FD] text-[#4F5FE8] flex items-center justify-center font-bold text-[8px]">
                            {getInitials(author)}
                          </div>
                          <span>{author}</span>
                        </div>
                        <time className="text-[10px] text-[#9CA3AF] font-mono">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      <p className="text-[#20242C] leading-relaxed pl-6">{c.body}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer */}
            <form onSubmit={handleAddComment} className="pt-2 space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Leave an operational update, reproduction steps, or resolution findings..."
                rows={2}
                className="w-full text-xs p-2.5 border border-[#E7E9EF] rounded-md focus:bg-white text-[#20242C]"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9CA3AF] font-mono">
                  Idempotent safe submission
                </span>
                <button
                  type="submit"
                  disabled={postingComment || !newComment.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F5FE8] hover:bg-[#4150D8] text-white text-xs font-medium shadow-tf-sm transition disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>{postingComment ? 'Posting...' : 'Post comment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1 Col): Details Panel & Append-Only Activity */}
        <div className="space-y-6">
          {/* Details Panel */}
          <div className="bg-white border border-[#E7E9EF] rounded-lg p-4 shadow-tf-sm space-y-3">
            <span className="text-xs font-semibold text-[#20242C] uppercase tracking-wider block border-b border-[#F0F2F6] pb-2 font-mono text-[10px]">
              Properties
            </span>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#F0F2F6]">
                <span className="text-[#727987]">Assignee</span>
                <span className="text-[#20242C] font-medium">
                  {item.assigneeId ? item.assigneeId.name : <span className="text-purple-600">Unassigned</span>}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#F0F2F6]">
                <span className="text-[#727987]">Team</span>
                <span className="text-[#20242C] font-medium">{item.teamId?.name}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#F0F2F6]">
                <span className="text-[#727987]">Category</span>
                <TypeBadge type={item.type} />
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#F0F2F6]">
                <span className="text-[#727987]">Creator</span>
                <span className="text-[#20242C]">{item.createdBy?.name || 'Operator'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#F0F2F6]">
                <span className="text-[#727987]">Due Date</span>
                <span className="text-[#20242C] font-mono text-[11px]">
                  {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'None'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#F0F2F6]">
                <span className="text-[#727987]">Created</span>
                <span className="text-[#727987] font-mono text-[11px]">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#727987]">OCC Revision</span>
                <span className="font-mono text-[#20242C] font-semibold">v{item.version}</span>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white border border-[#E7E9EF] rounded-lg p-4 shadow-tf-sm space-y-3">
            <span className="text-xs font-semibold text-[#20242C] uppercase tracking-wider block border-b border-[#F0F2F6] pb-2 font-mono text-[10px]">
              Activity History
            </span>
            <ActivityTimeline events={item.timeline || []} />
          </div>
        </div>
      </div>

      {/* Mandatory Resolution Summary Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-tf-modal border border-[#E7E9EF] space-y-3 text-xs">
            <h3 className="font-semibold text-sm text-[#20242C]">Resolution Summary Required</h3>
            <p className="text-[#727987] leading-relaxed">
              Taskfort workflow rules require documenting an explicit resolution summary (min 10 characters) before resolving or closing a work item.
            </p>
            <textarea
              required
              rows={3}
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="Describe the root cause mitigation and verification steps taken..."
              className="w-full text-xs p-2.5 border border-[#E7E9EF] rounded-md focus:bg-white text-[#20242C]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-1.5 text-xs text-[#727987] hover:text-[#20242C]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || resolutionSummary.trim().length < 10}
                onClick={() => executeTransition('Resolved', resolutionSummary.trim())}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-tf-sm transition disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Resolve work item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Modal */}
      <ConflictModal
        isOpen={conflictOpen}
        onClose={() => setConflictOpen(false)}
        onRefresh={() => {
          setConflictOpen(false);
          fetchItem();
        }}
        conflictData={conflictData}
        clientPayload={clientPayload}
      />
    </div>
  );
}
