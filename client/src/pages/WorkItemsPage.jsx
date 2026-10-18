import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function WorkItemsPage({ presetAssignee, presetTeamOnly }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  // URL query params
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'ALL';
  const priority = searchParams.get('priority') || 'ALL';
  const type = searchParams.get('type') || 'ALL';
  const teamId = searchParams.get('teamId') || 'ALL';
  const assigneeId = presetAssignee || searchParams.get('assigneeId') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    api.get('/teams').then(res => setTeams(res.data)).catch(() => {});
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        search: search || undefined,
        status: status !== 'ALL' ? status : undefined,
        priority: priority !== 'ALL' ? priority : undefined,
        type: type !== 'ALL' ? type : undefined,
        teamId: teamId !== 'ALL' ? teamId : undefined,
        assigneeId: assigneeId || undefined
      };

      const res = await api.get('/work-items', { params });
      setItems(res.data.items || []);
      setPagination(res.data.pagination || { page: 1, limit: 12, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search, status, priority, type, teamId, assigneeId, page, user]);

  const updateFilter = (key, val) => {
    const newParams = new URLSearchParams(searchParams);
    if (!val || val === 'ALL') {
      newParams.delete(key);
    } else {
      newParams.set(key, val);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const statusChips = ['ALL', 'Open', 'In Progress', 'Blocked', 'In Review', 'Resolved', 'Closed'];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-semibold text-[#20242C] tracking-tight">
            {presetAssignee ? 'My Work' : presetTeamOnly ? 'Team Workspace' : 'All Work'}
          </h1>
          <p className="text-xs text-[#727987] mt-0.5">
            {pagination.total} operational work items tracked
          </p>
        </div>

        <Link
          to="/work-items/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F5FE8] hover:bg-[#4150D8] text-white text-xs font-medium shadow-tf-sm transition duration-100"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New work item</span>
        </Link>
      </div>

      {/* 2. Filter Bar: Search, Status Chips, Understated Dropdowns */}
      <div className="bg-white border border-[#E7E9EF] rounded-lg p-2.5 shadow-tf-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Filter by title, description, or root cause trigger..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FB] border border-[#E7E9EF] rounded-md focus:bg-white transition text-[#20242C]"
            />
          </div>

          {/* Understated Dropdowns */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
            <select
              value={teamId}
              onChange={(e) => updateFilter('teamId', e.target.value)}
              className="px-2.5 py-1.5 border border-[#E7E9EF] rounded-md bg-white text-[#727987] text-xs hover:border-[#D1D5DF]"
            >
              <option value="ALL">All teams</option>
              {teams.map(t => (
                <option key={t._id} value={t._id}>{t.name} ({t.code})</option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => updateFilter('priority', e.target.value)}
              className="px-2.5 py-1.5 border border-[#E7E9EF] rounded-md bg-white text-[#727987] text-xs hover:border-[#D1D5DF]"
            >
              <option value="ALL">All priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={type}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="px-2.5 py-1.5 border border-[#E7E9EF] rounded-md bg-white text-[#727987] text-xs hover:border-[#D1D5DF]"
            >
              <option value="ALL">All types</option>
              <option value="PRODUCTION_INCIDENT">Production Incident</option>
              <option value="PAYMENT_INVESTIGATION">Payment Investigation</option>
              <option value="COMPLIANCE_REQUEST">Compliance Request</option>
              <option value="ENGINEERING_PROBLEM">Engineering Problem</option>
              <option value="OPERATIONAL_APPROVAL">Operational Approval</option>
              <option value="CUSTOMER_ISSUE">Customer Issue</option>
            </select>

            {(search || status !== 'ALL' || priority !== 'ALL' || type !== 'ALL' || teamId !== 'ALL') && (
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams())}
                className="px-2 py-1 text-[11px] text-[#727987] hover:text-[#20242C] flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Compact Status Chips */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-xs border-t border-[#F0F2F6]">
          <span className="text-[11px] font-medium text-[#9CA3AF] mr-1">Status:</span>
          {statusChips.map(tab => (
            <button
              key={tab}
              onClick={() => updateFilter('status', tab)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
                (status === tab || (tab === 'ALL' && !searchParams.get('status')))
                  ? 'bg-[#EEF1FD] text-[#3D4BC9]'
                  : 'text-[#727987] hover:bg-[#F8F9FB] hover:text-[#20242C]'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* 3. High-Density Table */}
      <div className="bg-white border border-[#E7E9EF] rounded-lg shadow-tf-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-9 bg-slate-100 rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-xs font-medium text-[#20242C]">No matching work items</p>
            <p className="text-[11px] text-[#727987]">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#E7E9EF] text-[#727987] font-medium select-none">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Work Item</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Priority</th>
                  <th className="py-2.5 px-3 font-medium">Assignee</th>
                  <th className="py-2.5 px-3 font-medium">Team</th>
                  <th className="py-2.5 px-3 font-medium">Due Date</th>
                  <th className="py-2.5 px-4 text-right font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E9EF]/80">
                {items.map(item => (
                  <tr
                    key={item._id}
                    className="hover:bg-[#F8F9FB] transition group"
                  >
                    <td className="py-2.5 px-4 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#727987] shrink-0">
                          {item.teamId?.code}-{item._id.slice(-4).toUpperCase()}
                        </span>
                        <Link
                          to={`/work-items/${item._id}`}
                          className="font-medium text-[#20242C] group-hover:text-[#4F5FE8] truncate block"
                        >
                          {item.title}
                        </Link>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {item.assigneeId ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-[#EEF1FD] text-[#4F5FE8] flex items-center justify-center font-bold text-[8px] shrink-0">
                            {getInitials(item.assigneeId.name)}
                          </div>
                          <span className="text-[#20242C] truncate max-w-[110px]">
                            {item.assigneeId.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#9CA3AF] italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#727987] whitespace-nowrap">
                      {item.teamId?.code || 'OPS'}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[#727987] font-mono whitespace-nowrap">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[11px] text-[#9CA3AF] font-mono whitespace-nowrap">
                      v{item.version}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Pagination */}
        <div className="bg-[#F8F9FB] border-t border-[#E7E9EF] px-4 py-2 flex items-center justify-between text-xs text-[#727987]">
          <span>
            Page <strong className="text-[#20242C]">{pagination.page}</strong> of <strong className="text-[#20242C]">{pagination.totalPages}</strong> ({pagination.total} items)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updateFilter('page', Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-[#E7E9EF] bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateFilter('page', Math.min(pagination.totalPages, page + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1 rounded border border-[#E7E9EF] bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
