import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, CheckCircle2 } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-tf-charcoal tracking-tight">Account & Security</h1>
        <p className="text-xs text-tf-slate mt-0.5">
          User identity, workspace scopes, and system permissions
        </p>
      </div>

      <div className="bg-white border border-tf-border rounded-lg p-6 shadow-tf-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-tf-border pb-5">
          <div
            className="w-12 h-12 rounded-full text-white font-semibold text-base flex items-center justify-center shadow-tf-sm"
            style={{ backgroundColor: user?.avatarColor || '#4F5FE8' }}
          >
            {initials}
          </div>
          <div>
            <h2 className="text-base font-semibold text-tf-charcoal">{user?.name}</h2>
            <p className="text-xs text-tf-slate font-mono">{user?.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-tf-charcoal text-white">
                {user?.isSystemAdmin ? 'SYSTEM ADMINISTRATOR' : user?.systemRole}
              </span>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated session
              </span>
            </div>
          </div>
        </div>

        {/* Team Memberships */}
        <div className="space-y-3">
          <span className="text-[11px] font-semibold text-tf-slate uppercase tracking-wider block">
            Authorized Workspaces ({user?.memberships?.length || 0})
          </span>

          <div className="divide-y divide-tf-border border border-tf-border rounded-md overflow-hidden">
            {(!user?.memberships || user.memberships.length === 0) ? (
              <p className="p-4 text-xs text-tf-slate">No specific team memberships enrolled.</p>
            ) : (
              user.memberships.map((m, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-tf-bg/50 transition">
                  <div>
                    <span className="font-medium text-tf-charcoal">{m.teamName || m.teamCode}</span>
                    <span className="text-[10px] text-tf-slate font-mono ml-2">[{m.teamCode}]</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                    m.roleInTeam === 'TEAM_ADMIN'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}>
                    {m.roleInTeam}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security context */}
        <div className="p-4 bg-tf-bg border border-tf-border rounded-md space-y-1.5 text-xs">
          <span className="font-medium text-tf-charcoal block">Platform Architecture & Governance</span>
          <p className="text-tf-slate leading-relaxed text-[11px]">
            Sessions are validated by cryptographically signed JWT tokens with bcrypt salt hashing. Optimistic concurrency control (OCC) guards all work-item modifications against stale overwrites. Role-based access control enforces multi-team data boundaries at the database engine level.
          </p>
        </div>
      </div>
    </div>
  );
}
