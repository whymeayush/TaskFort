import React, { useState } from 'react';
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, AlertCircle, Lock, Mail } from 'lucide-react';

export function LoginPage() {
  const { login, switchPersona } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickPersonaLogin = async (persona) => {
    setError(null);
    setSubmitting(true);
    try {
      await switchPersona(persona);
      navigate('/');
    } catch (err) {
      setError('Failed to switch persona');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-md">
            N⚡
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Newtonite Operations Hub
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-mono">
          Operations Under Pressure — Secure Authentication
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Email Address</label>
              <div className="mt-1 relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@newtonite.internal"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Password</label>
              <div className="mt-1 relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-xs text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition disabled:opacity-50"
            >
              {submitting ? 'Authenticating...' : 'Sign In to Operations Hub'}
            </button>
          </form>

          {/* Quick Reviewer Persona Login */}
          <div className="mt-6 border-t border-slate-200 pt-6">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Fast Reviewer 1-Click Login
            </span>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PERSONAS.slice(0, 4).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickPersonaLogin(p)}
                  className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
                >
                  <div className="text-xs font-medium text-slate-800 truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{p.badge}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link to="/register" className="text-xs text-blue-600 hover:underline">
              Need a new account? Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
