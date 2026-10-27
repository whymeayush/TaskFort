import React, { useState, useEffect } from 'react';
import { api, generateIdempotencyKey } from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function CreateWorkItemPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'CUSTOMER_ISSUE',
    priority: 'MEDIUM',
    teamId: '',
    assigneeId: '',
    reasonForExistence: '',
    businessImpact: '',
    nextActionRequired: 'Triage and assign responsible owner',
    dueDate: '',
    tags: ''
  });

  useEffect(() => {
    Promise.all([
      api.get('/teams'),
      api.get('/auth/users')
    ]).then(([teamsRes, usersRes]) => {
      setTeams(teamsRes.data || []);
      setUsers(usersRes.data || []);
      if (teamsRes.data?.length > 0) {
        setFormData(prev => ({ ...prev, teamId: teamsRes.data[0]._id }));
      }
    }).catch(err => {
      console.error('Failed to load form options:', err);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        priority: formData.priority,
        teamId: formData.teamId,
        assigneeId: formData.assigneeId || null,
        reasonForExistence: formData.reasonForExistence.trim(),
        businessImpact: formData.businessImpact.trim(),
        nextActionRequired: formData.nextActionRequired.trim(),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      const res = await api.post('/work-items', payload, {
        headers: {
          'Idempotency-Key': generateIdempotencyKey('create-item')
        }
      });

      navigate(`/work-items/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create work item. Please verify all required fields and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/work-items" className="text-xs text-tf-slate hover:text-tf-charcoal flex items-center gap-1 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Work
        </Link>
      </div>

      <div className="bg-white border border-tf-border rounded-lg p-6 shadow-tf-sm space-y-6">
        <div className="border-b border-tf-border pb-4">
          <h1 className="text-lg font-semibold text-tf-charcoal tracking-tight">New work item</h1>
          <p className="text-xs text-tf-slate mt-0.5">
            Log an operational task, investigation, or incident with clear ownership and context.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-md text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Section 1: Work details */}
          <div className="space-y-4">
            <h2 className="text-[11px] font-semibold text-tf-slate uppercase tracking-wider">
              Work details
            </h2>

            <div>
              <label className="block text-xs font-medium text-tf-charcoal mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Investigate duplicate payment notifications"
                className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal placeholder:text-tf-slate/60 focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 transition text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-tf-charcoal mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-tf-border rounded-md bg-white text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
                >
                  <option value="CUSTOMER_ISSUE">Customer Issue</option>
                  <option value="ENGINEERING_PROBLEM">Engineering Problem</option>
                  <option value="PAYMENT_INVESTIGATION">Payment Investigation</option>
                  <option value="PRODUCTION_INCIDENT">Production Incident</option>
                  <option value="COMPLIANCE_REQUEST">Compliance Request</option>
                  <option value="OPERATIONAL_APPROVAL">Operational Approval</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-tf-charcoal mb-1">
                  Trigger or purpose <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="reasonForExistence"
                  value={formData.reasonForExistence}
                  onChange={handleChange}
                  placeholder="Why does this item exist?"
                  className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal placeholder:text-tf-slate/60 focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-tf-charcoal mb-1">
                Operational impact <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                name="businessImpact"
                value={formData.businessImpact}
                onChange={handleChange}
                placeholder="Impact on systems, customers, or SLA"
                className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal placeholder:text-tf-slate/60 focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tf-charcoal mb-1">
                Next required action <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                name="nextActionRequired"
                value={formData.nextActionRequired}
                onChange={handleChange}
                placeholder="Immediate step needed to make progress"
                className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal placeholder:text-tf-slate/60 focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tf-charcoal mb-1">
                Detailed description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide telemetry, error logs, or full contextual notes..."
                className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal placeholder:text-tf-slate/60 focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
              />
            </div>
          </div>

          {/* Section 2: Ownership */}
          <div className="pt-4 border-t border-tf-border space-y-4">
            <h2 className="text-[11px] font-semibold text-tf-slate uppercase tracking-wider">
              Ownership
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-tf-charcoal mb-1">
                  Team <span className="text-red-500">*</span>
                </label>
                <select
                  name="teamId"
                  value={formData.teamId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-tf-border rounded-md bg-white text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
                >
                  {teams.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-tf-charcoal mb-1">
                  Assignee
                </label>
                <select
                  name="assigneeId"
                  value={formData.assigneeId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-tf-border rounded-md bg-white text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
                >
                  <option value="">Unassigned (Team pool)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Priority and timing */}
          <div className="pt-4 border-t border-tf-border space-y-4">
            <h2 className="text-[11px] font-semibold text-tf-slate uppercase tracking-wider">
              Priority and timing
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-tf-charcoal mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-tf-border rounded-md bg-white text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-tf-charcoal mb-1">
                  Due date
                </label>
                <input
                  type="datetime-local"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-tf-border rounded-md bg-white text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-tf-charcoal mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="e.g. backend, payments"
                  className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal placeholder:text-tf-slate/60 focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-tf-border">
            <Link
              to="/work-items"
              className="px-3.5 py-1.5 rounded-md text-tf-slate hover:text-tf-charcoal text-xs font-medium transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-tf-indigo hover:bg-tf-indigo/90 text-white text-xs font-medium shadow-tf-sm transition disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {submitting ? 'Creating work item...' : 'Create work item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
