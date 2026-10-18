import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { Link, useNavigate } from 'react-router-dom';
import {
  Inbox,
  UserCheck,
  Clock,
  ShieldAlert,
  ArrowRight,
  Plus,
  RefreshCw,
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/dashboard/summary');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  // Compute realistic time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.name ? user.name.split(' ')[0] : 'there';
    if (hour < 12) return `Good morning, ${firstName}.`;
    if (hour < 18) return `Good afternoon, ${firstName}.`;
    return `Good evening, ${firstName}.`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200/70 rounded w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-white border border-[#E7E9EF] rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          <div className="lg:col-span-2 h-96 bg-white border border-[#E7E9EF] rounded-lg" />
          <div className="h-96 bg-white border border-[#E7E9EF] rounded-lg" />
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const myAssigned = data?.myAssigned || [];
  const needsAttention = data?.needsAttention || [];
  const activityLogs = data?.activityLogs || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Header with Personal Greeting & Primary Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-semibold text-[#20242C] tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-xs text-[#727987] mt-0.5">
            Here's where things stand today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E7E9EF] bg-white hover:bg-[#F8F9FB] text-xs font-medium text-[#727987] hover:text-[#20242C] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/work-items/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#4F5FE8] hover:bg-[#4150D8] text-white text-xs font-medium shadow-tf-sm transition duration-100"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New work item</span>
          </Link>
        </div>
      </div>

      {/* 2. Work Summary: 4 Compact Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Open work"
          value={metrics.totalOpen}
          icon={Inbox}
          onClick={() => navigate('/work-items?status=Open')}
        />
        <MetricCard
          label="Assigned to me"
          value={metrics.assignedToMe}
          icon={UserCheck}
          onClick={() => navigate('/my-work')}
        />
        <MetricCard
          label="Overdue"
          value={metrics.overdue}
          icon={Clock}
          onClick={() => navigate('/work-items?needsAttention=true')}
          hint={metrics.overdue > 0 ? 'SLA breach risk' : undefined}
        />
        <MetricCard
          label="Awaiting approval"
          value={metrics.pendingApprovals}
          icon={ShieldAlert}
          onClick={() => navigate('/approvals')}
          hint={metrics.pendingApprovals > 0 ? 'Sign-off required' : undefined}
        />
      </div>

      {/* 3. Balanced Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Primary): My Work & Active Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Work List */}
          <div className="bg-white border border-[#E7E9EF] rounded-lg shadow-tf-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E7E9EF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs text-[#20242C]">My Work</span>
                <span className="text-[11px] font-mono text-[#727987] bg-[#F8F9FB] px-1.5 py-0.2 rounded border border-[#E7E9EF]">
                  {myAssigned.length}
                </span>
              </div>
              <Link to="/my-work" className="text-xs text-[#4F5FE8] hover:underline flex items-center gap-1 font-medium">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {myAssigned.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#727987] space-y-1">
                <p className="font-medium text-[#20242C]">No tasks currently assigned to you</p>
                <p className="text-[11px]">Pick up an unassigned ticket from the queue or create a new one.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E7E9EF]/80">
                {myAssigned.map(item => (
                  <Link
                    key={item._id}
                    to={`/work-items/${item._id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-[#F8F9FB] transition group text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="font-mono text-[10px] text-[#727987] shrink-0">
                        {item.teamId?.code}-{item._id.slice(-4).toUpperCase()}
                      </span>
                      <span className="text-[#20242C] group-hover:text-[#4F5FE8] font-medium truncate">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <PriorityBadge priority={item.priority} />
                      <StatusBadge status={item.status} />
                      {item.dueDate && (
                        <span className="text-[11px] text-[#727987] font-mono hidden sm:inline">
                          {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Priority Operational Work */}
          <div className="bg-white border border-[#E7E9EF] rounded-lg shadow-tf-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E7E9EF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs text-[#20242C]">High Priority Operations</span>
              </div>
              <Link to="/work-items?priority=CRITICAL" className="text-xs text-[#4F5FE8] hover:underline flex items-center gap-1 font-medium">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-[#E7E9EF]/80">
              {(data?.urgentItems || []).slice(0, 4).map(item => (
                <Link
                  key={item._id}
                  to={`/work-items/${item._id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#F8F9FB] transition group text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-mono text-[10px] text-[#727987] shrink-0">
                      {item.teamId?.code}
                    </span>
                    <span className="text-[#20242C] group-hover:text-[#4F5FE8] font-medium truncate">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-[#727987] hidden sm:inline">
                      {item.assigneeId ? item.assigneeId.name : <span className="text-purple-600 font-medium">Unassigned</span>}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Needs Attention & Recent Activity */}
        <div className="space-y-6">
          {/* Needs Attention */}
          <div className="bg-white border border-[#E7E9EF] rounded-lg shadow-tf-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0F2F6] pb-2">
              <span className="font-medium text-xs text-[#20242C]">Needs Attention</span>
              <span className="text-[10px] text-[#727987]">Action required</span>
            </div>

            {needsAttention.length === 0 ? (
              <p className="text-xs text-[#727987] py-4 text-center">
                No immediate blockers or overdue items.
              </p>
            ) : (
              <div className="space-y-2">
                {needsAttention.slice(0, 4).map(item => {
                  const isCritical = item.priority === 'CRITICAL';
                  return (
                    <Link
                      key={item._id}
                      to={`/work-items/${item._id}`}
                      className="block p-2.5 rounded-md border border-[#E7E9EF] hover:border-[#D1D5DF] hover:bg-[#F8F9FB] transition text-xs space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-[#20242C] line-clamp-1">
                          {item.title}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isCritical ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`} />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#727987]">
                        <span>{item.teamId?.code}</span>
                        <span>•</span>
                        <span>{item.status}</span>
                        <span>•</span>
                        <span className="text-purple-600 font-medium">
                          {item.assigneeId ? item.assigneeId.name : 'Unassigned'}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Team Activity */}
          <div className="bg-white border border-[#E7E9EF] rounded-lg shadow-tf-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0F2F6] pb-2">
              <span className="font-medium text-xs text-[#20242C]">Recent Team Activity</span>
              <Link to="/activity" className="text-[11px] text-[#4F5FE8] hover:underline">
                View all
              </Link>
            </div>

            {activityLogs.length === 0 ? (
              <p className="text-xs text-[#727987] py-4 text-center">
                No recent activity recorded yet.
              </p>
            ) : (
              <div className="space-y-3 text-xs">
                {activityLogs.slice(0, 5).map((log, idx) => {
                  const actor = log.actorId?.name || 'Operator';
                  return (
                    <div key={log._id || idx} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#EEF1FD] text-[#4F5FE8] flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                        {getInitials(actor)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[#20242C] leading-snug">
                          <span className="font-medium">{actor}</span>{' '}
                          <span className="text-[#727987]">
                            {log.actionType === 'ASSIGNED' ? 'claimed' :
                             log.actionType === 'STATUS_CHANGE' ? `moved to ${log.newValue}` :
                             log.actionType === 'APPROVAL_GRANTED' ? 'approved request for' :
                             log.actionType === 'COMMENT_ADDED' ? 'commented on' : 'updated'}
                          </span>{' '}
                          <Link
                            to={`/work-items/${log.workItemId?._id || log.workItemId}`}
                            className="font-medium text-[#20242C] hover:text-[#4F5FE8] truncate"
                          >
                            {log.workItemId?.title || 'work item'}
                          </Link>
                        </p>
                        <time className="text-[10px] text-[#9CA3AF] font-mono">
                          {formatRelativeTime(log.timestamp || log.createdAt)}
                        </time>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
