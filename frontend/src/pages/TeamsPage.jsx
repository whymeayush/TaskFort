import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Trash2, RefreshCw, Shield, Info } from 'lucide-react';

export function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add member modal/inline
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('TEAM_MEMBER');
  const [addingMember, setAddingMember] = useState(false);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teams');
      setTeams(res.data || []);
      if (res.data?.length > 0 && !selectedTeam) {
        setSelectedTeam(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    api.get('/auth/users').then(res => setAllUsers(res.data || [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selectedTeam) return;
    api.get(`/teams/${selectedTeam._id}/members`).then(res => {
      setMembers(res.data || []);
    }).catch(err => {
      console.error('Failed to load members:', err);
    });
  }, [selectedTeam]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedTeam) return;

    setAddingMember(true);
    try {
      await api.post(`/teams/${selectedTeam._id}/members`, {
        userId: selectedUserId,
        roleInTeam: selectedRole
      });
      const res = await api.get(`/teams/${selectedTeam._id}/members`);
      setMembers(res.data || []);
      setSelectedUserId('');
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member? Any active assignments in Open or In Progress will return to the unassigned team pool.')) {
      return;
    }

    try {
      await api.delete(`/teams/${selectedTeam._id}/members/${userId}`);
      setMembers(members.filter(m => m.userId?._id !== userId));
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const isTeamAdmin = user?.isSystemAdmin || user?.memberships?.some(m => m.teamId === selectedTeam?._id && m.roleInTeam === 'TEAM_ADMIN');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-tf-charcoal tracking-tight">Teams & Workspace</h1>
        <p className="text-xs text-tf-slate mt-0.5">
          Organizational rosters, role-based governance, and operational workloads
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Teams Directory */}
        <div className="bg-white border border-tf-border rounded-lg p-4 shadow-tf-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-tf-border">
            <h2 className="text-[11px] font-semibold text-tf-slate uppercase tracking-wider">
              Workspaces ({teams.length})
            </h2>
          </div>

          <div className="space-y-1.5">
            {teams.map(t => {
              const isSelected = selectedTeam?._id === t._id;
              return (
                <div
                  key={t._id}
                  onClick={() => setSelectedTeam(t)}
                  className={`p-3 rounded-md border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'border-tf-indigo/40 bg-tf-indigo/5 text-tf-charcoal shadow-tf-sm'
                      : 'border-transparent hover:border-tf-border hover:bg-tf-bg text-tf-charcoal'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span className={isSelected ? 'text-tf-indigo font-semibold' : ''}>{t.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-tf-bg text-tf-slate border border-tf-border">
                      {t.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-tf-slate mt-1 line-clamp-1">
                    {t.description}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-tf-slate pt-2 border-t border-tf-border/60">
                    <span>{t.memberCount || 0} members</span>
                    <span className="font-medium text-tf-charcoal">{t.activeWorkItems || 0} active items</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Selected Team Members & Roles */}
        <div className="lg:col-span-2 space-y-5">
          {selectedTeam && (
            <div className="bg-white border border-tf-border rounded-lg p-5 shadow-tf-sm space-y-5">
              <div className="flex items-start justify-between border-b border-tf-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-tf-charcoal">{selectedTeam.name}</h2>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-tf-slate bg-tf-bg border border-tf-border">
                      {selectedTeam.code}
                    </span>
                  </div>
                  <p className="text-xs text-tf-slate mt-0.5">{selectedTeam.description}</p>
                </div>
              </div>

              {/* Add Member Form (For authorized admins) */}
              {isTeamAdmin && (
                <form onSubmit={handleAddMember} className="bg-tf-bg border border-tf-border rounded-md p-3 text-xs space-y-2">
                  <span className="font-medium text-tf-charcoal block">Add member to team</span>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      required
                      className="w-full sm:w-1/2 px-2.5 py-1.5 border border-tf-border rounded-md bg-white text-tf-charcoal text-xs focus:outline-none focus:border-tf-indigo"
                    >
                      <option value="">Select team member...</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>

                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full sm:w-1/3 px-2.5 py-1.5 border border-tf-border rounded-md bg-white text-tf-charcoal text-xs focus:outline-none focus:border-tf-indigo"
                    >
                      <option value="TEAM_MEMBER">Team Member</option>
                      <option value="TEAM_ADMIN">Team Admin</option>
                      <option value="READ_ONLY_VIEWER">Read-Only Viewer</option>
                    </select>

                    <button
                      type="submit"
                      disabled={addingMember || !selectedUserId}
                      className="w-full sm:w-auto px-3 py-1.5 bg-tf-indigo text-white rounded-md hover:bg-tf-indigo/90 transition text-xs font-medium whitespace-nowrap disabled:opacity-50"
                    >
                      Add member
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              <div className="space-y-3">
                <span className="text-[11px] font-semibold text-tf-slate uppercase tracking-wider block">
                  Enrolled members ({members.length})
                </span>

                <div className="divide-y divide-tf-border border border-tf-border rounded-md overflow-hidden">
                  {members.map(m => {
                    const u = m.userId;
                    const initials = u?.name ? u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';

                    return (
                      <div key={m._id} className="p-3 flex items-center justify-between hover:bg-tf-bg/50 text-xs transition">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-7 h-7 rounded-full text-white text-[11px] flex items-center justify-center font-medium shadow-tf-sm"
                            style={{ backgroundColor: u?.avatarColor || '#4F5FE8' }}
                          >
                            {initials}
                          </span>
                          <div>
                            <span className="font-medium text-tf-charcoal block">{u?.name}</span>
                            <span className="text-[11px] text-tf-slate font-mono">{u?.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            m.roleInTeam === 'TEAM_ADMIN'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : m.roleInTeam === 'READ_ONLY_VIEWER'
                              ? 'bg-tf-bg text-tf-slate border border-tf-border'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {m.roleInTeam}
                          </span>

                          {isTeamAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(u?._id)}
                              className="p-1 text-tf-slate hover:text-red-600 transition"
                              title="Remove member and release active items"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Member Removal Policy */}
              <div className="p-3 bg-tf-bg border border-tf-border rounded-md text-xs text-tf-slate leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-tf-indigo shrink-0 mt-0.5" />
                <span>
                  When a member is removed from a team, active open items are automatically unassigned and safely returned to the team pool to preserve SLA continuity.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
