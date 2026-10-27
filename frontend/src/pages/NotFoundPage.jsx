import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="py-20 text-center max-w-md mx-auto space-y-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">404 — Page Not Found</h1>
      <p className="text-xs text-slate-500">
        The operational resource, view, or link you requested does not exist.
      </p>
      <div>
        <Link to="/" className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export function AccessDeniedPage() {
  return (
    <div className="py-20 text-center max-w-md mx-auto space-y-4">
      <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-600">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">403 — Access Restricted</h1>
      <p className="text-xs text-slate-500">
        Your active user role does not possess authorization to view or mutate this team scope.
      </p>
      <div>
        <Link to="/" className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
