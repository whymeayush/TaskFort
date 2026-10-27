import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  CheckSquare,
  ListTodo,
  Users2,
  Clock,
  Activity,
  ShieldAlert,
  Cpu,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Building
} from 'lucide-react';
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext';

export function TaskfortLogo({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L4 5.5V11.5C4 16.5 7.4 21.1 12 22.5C16.6 21.1 20 16.5 20 11.5V5.5L12 2Z"
        fill="#EEF1FD"
        stroke="#4F5FE8"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 11.5L11 13.5L15.5 9"
        stroke="#4F5FE8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sidebar() {
  const { user, logout, switchPersona } = useAuth();
  const navigate = useNavigate();
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

  const primaryNav = [
    { label: 'Overview', path: '/', icon: LayoutGrid },
    { label: 'My Work', path: '/my-work', icon: CheckSquare },
    { label: 'All Work', path: '/work-items', icon: ListTodo },
    { label: 'Team Workspace', path: '/team-work', icon: Users2 },
    { label: 'Approvals', path: '/approvals', icon: ShieldAlert },
    { label: 'Activity', path: '/activity', icon: Activity },
  ];

  const secondaryNav = [
    { label: 'Team Management', path: '/teams', icon: Building },
    { label: 'Concurrency Lab', path: '/simulation-lab', icon: Cpu },
    { label: 'Settings', path: '/profile', icon: Settings },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <aside className="w-60 bg-white border-r border-[#E7E9EF] flex flex-col justify-between select-none shrink-0 min-h-screen">
      {/* Top Header & Workspace Selector */}
      <div className="p-3.5 space-y-4">
        {/* Brand */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <TaskfortLogo className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-[15px] tracking-tight text-[#20242C]">
              Taskfort
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#727987] bg-[#F8F9FB] px-1.5 py-0.5 rounded border border-[#E7E9EF]">
            v1.2
          </span>
        </div>

        {/* Workspace Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#F8F9FB] text-xs font-medium text-[#20242C] transition border border-transparent hover:border-[#E7E9EF]"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-4 h-4 rounded bg-[#EEF1FD] text-[#4F5FE8] flex items-center justify-center text-[10px] font-bold">
                N
              </span>
              <span className="truncate">Newtonite Operations</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#727987]" />
          </button>

          {showWorkspaceMenu && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-tf-popover border border-[#E7E9EF] py-1 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] font-medium text-[#727987] uppercase tracking-wider">
                Workspaces
              </div>
              <div className="px-3 py-1.5 bg-[#EEF1FD]/60 text-[#3D4BC9] font-medium flex items-center justify-between">
                <span>Newtonite Operations</span>
                <span className="text-[10px]">Active</span>
              </div>
              <div className="px-3 py-1.5 text-[#727987] hover:bg-[#F8F9FB] cursor-pointer">
                Engineering Incident Lab
              </div>
            </div>
          )}
        </div>

        {/* Primary Navigation */}
        <div className="space-y-0.5 pt-1">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `
                  flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition duration-100
                  ${isActive
                    ? 'bg-[#EEF1FD] text-[#3D4BC9] font-medium'
                    : 'text-[#727987] hover:text-[#20242C] hover:bg-[#F8F9FB]'
                  }
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Secondary Navigation Divider */}
        <div className="pt-3 border-t border-[#E7E9EF] space-y-0.5">
          <div className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
            Platform
          </div>
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition duration-100
                  ${isActive
                    ? 'bg-[#EEF1FD] text-[#3D4BC9] font-medium'
                    : 'text-[#727987] hover:text-[#20242C] hover:bg-[#F8F9FB]'
                  }
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Bottom User Area with Persona Switcher Dropdown */}
      <div className="p-3 border-t border-[#E7E9EF] relative">
        <button
          type="button"
          onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
          className="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-[#F8F9FB] transition text-left"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-full bg-[#EEF1FD] text-[#4F5FE8] border border-[#D5DCFA] flex items-center justify-center font-semibold text-[11px] shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-[#20242C] truncate leading-tight">
                {user?.name || 'Operator'}
              </div>
              <div className="text-[10px] text-[#727987] truncate">
                {user?.isSystemAdmin ? 'System Admin' : (user?.memberships?.[0]?.teamName || 'Newtonite')}
              </div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#727987] shrink-0" />
        </button>

        {/* Persona Switcher / Profile Popover */}
        {showPersonaDropdown && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-lg shadow-tf-popover border border-[#E7E9EF] p-1.5 z-50 text-xs">
            <div className="px-2 py-1 text-[10px] font-semibold text-[#727987] uppercase tracking-wider border-b border-[#F0F2F6]">
              Switch Operational Persona
            </div>
            <div className="max-h-48 overflow-y-auto py-1 space-y-0.5">
              {DEMO_PERSONAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    switchPersona(p);
                    setShowPersonaDropdown(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between ${
                    user?.email === p.email ? 'bg-[#EEF1FD] text-[#3D4BC9] font-medium' : 'hover:bg-[#F8F9FB] text-[#20242C]'
                  }`}
                >
                  <div className="truncate">
                    <div>{p.name}</div>
                    <div className="text-[10px] text-[#727987]">{p.badge}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="pt-1 mt-1 border-t border-[#F0F2F6]">
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full text-left px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
