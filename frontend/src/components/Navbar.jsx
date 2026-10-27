import React, { useState, useEffect } from 'react';
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Command,
  User as UserIcon,
  Check
} from 'lucide-react';
import { api } from '../api/client';

export function Navbar({ onOpenSearchModal }) {
  const { user, switchPersona } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        const unread = (res.data || []).filter(n => !n.readAt).length;
        setUnreadCount(unread);
      } catch (e) {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

  // Derive breadcrumbs based on pathname
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    if (path === '/my-work') return 'My Work';
    if (path === '/team-work') return 'Team Workspace';
    if (path === '/work-items') return 'All Work';
    if (path === '/work-items/new') return 'New Work Item';
    if (path.startsWith('/work-items/')) return 'Work Item Detail';
    if (path === '/approvals') return 'Approvals Inbox';
    if (path === '/activity') return 'Activity Stream';
    if (path === '/teams') return 'Team Management';
    if (path === '/simulation-lab') return 'Concurrency Lab';
    if (path === '/profile') return 'Settings & Identity';
    return 'Taskfort';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white border-b border-[#E7E9EF] h-13 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#727987]">Workspace</span>
        <span className="text-[#D1D5DF]">/</span>
        <span className="font-semibold text-[#20242C] tracking-tight">{getBreadcrumb()}</span>
      </div>

      {/* Center: Search Field with Keyboard Shortcut Hint */}
      <div className="hidden sm:flex items-center max-w-sm w-full mx-4">
        <div
          onClick={() => navigate('/work-items')}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-md border border-[#E7E9EF] bg-[#F8F9FB] hover:border-[#D1D5DF] text-xs text-[#727987] cursor-pointer transition"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>Search work items, telemetry, tags...</span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[#727987] bg-white border border-[#E7E9EF] rounded shadow-xs">
            <span>⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right: Persona Quick-Switch, Notification, New Item */}
      <div className="flex items-center gap-3">
        {/* Fast Persona Switcher Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[#20242C] hover:bg-[#F8F9FB] border border-[#E7E9EF] transition"
            title="Switch operational role"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F5FE8]" />
            <span className="truncate max-w-[110px] sm:max-w-none">{user?.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#727987]" />
          </button>

          {showPersonaMenu && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-lg shadow-tf-popover border border-[#E7E9EF] py-1 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] font-semibold text-[#727987] uppercase tracking-wider border-b border-[#F0F2F6]">
                Reviewer Persona Switcher
              </div>
              {DEMO_PERSONAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    switchPersona(p);
                    setShowPersonaMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs hover:bg-[#F8F9FB] ${
                    user?.email === p.email ? 'bg-[#EEF1FD] text-[#3D4BC9] font-medium' : 'text-[#20242C]'
                  }`}
                >
                  <div className="truncate">
                    <div>{p.name}</div>
                    <div className="text-[10px] text-[#727987] font-normal">{p.role}</div>
                  </div>
                  {user?.email === p.email && <Check className="w-3.5 h-3.5 text-[#4F5FE8]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon with dot */}
        <Link
          to="/notifications"
          className="relative p-1.5 rounded-md text-[#727987] hover:text-[#20242C] hover:bg-[#F8F9FB] transition"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-white" />
          )}
        </Link>

        {/* + New Work Item Button (Restrained, sophisticated indigo) */}
        <Link
          to="/work-items/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F5FE8] hover:bg-[#4150D8] text-white text-xs font-medium shadow-tf-sm transition duration-100"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New work item</span>
        </Link>
      </div>
    </header>
  );
}
