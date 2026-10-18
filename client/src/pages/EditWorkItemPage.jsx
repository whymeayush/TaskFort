import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, generateIdempotencyKey } from '../api/client';
import { ConflictModal } from '../components/ConflictModal';
import { ArrowLeft, Save, AlertCircle, RefreshCw } from 'lucide-react';

export function EditWorkItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [serverVersion, setServerVersion] = useState(1);

  // OCC Conflict modal state
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [clientPayload, setClientPayload] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    reasonForExistence: '',
    businessImpact: '',
    nextActionRequired: '',
    dueDate: ''
  });

  const fetchItem = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/work-items/${id}`);
      const data = res.data;
      setServerVersion(data.version);
      setFormData({
        title: data.title || '',
        description: data.description || '',
        priority: data.priority || 'MEDIUM',
        reasonForExistence: data.reasonForExistence || '',
        businessImpact: data.businessImpact || '',
        nextActionRequired: data.nextActionRequired || '',
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString().slice(0, 16) : ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load work item');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority,
      reasonForExistence: formData.reasonForExistence.trim(),
      businessImpact: formData.businessImpact.trim(),
      nextActionRequired: formData.nextActionRequired.trim(),
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      expectedVersion: serverVersion
    };

    setClientPayload(payload);

    try {
      await api.put(`/work-items/${id}`, payload, {
        headers: {
          'If-Match': `"v${serverVersion}"`,
          'Idempotency-Key': generateIdempotencyKey('edit')
        }
      });
      navigate(`/work-items/${id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictData(err.response.data);
        setConflictOpen(true);
      } else {
        setError(err.response?.data?.message || 'Failed to update work item');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center text-tf-slate text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Loading work item...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Link to={`/work-items/${id}`} className="text-xs text-tf-slate hover:text-tf-charcoal flex items-center gap-1 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to work item
        </Link>
        <span className="text-[11px] font-mono text-tf-slate bg-tf-bg px-2 py-0.5 rounded border border-tf-border">
          Targeting revision v{serverVersion}
        </span>
      </div>

      <div className="bg-white border border-tf-border rounded-lg p-6 shadow-tf-sm space-y-6">
        <div className="border-b border-tf-border pb-4">
          <h1 className="text-lg font-semibold text-tf-charcoal tracking-tight">Edit work item</h1>
          <p className="text-xs text-tf-slate mt-0.5">
            Changes are protected by optimistic concurrency control. Concurrent updates will be surfaced before overwriting.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-md text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-medium text-tf-charcoal mb-1">Title</label>
            <input
              type="text"
              required
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 transition text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-tf-charcoal mb-1">Priority</label>
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
              <label className="block text-xs font-medium text-tf-charcoal mb-1">Due date</label>
              <input
                type="datetime-local"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-tf-border rounded-md bg-white text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-tf-charcoal mb-1">Trigger or purpose</label>
            <input
              type="text"
              required
              name="reasonForExistence"
              value={formData.reasonForExistence}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-tf-charcoal mb-1">Operational impact</label>
            <input
              type="text"
              required
              name="businessImpact"
              value={formData.businessImpact}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-tf-charcoal mb-1">Next action required</label>
            <input
              type="text"
              required
              name="nextActionRequired"
              value={formData.nextActionRequired}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-tf-charcoal mb-1">Detailed description</label>
            <textarea
              required
              rows={4}
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-tf-border rounded-md text-tf-charcoal focus:outline-none focus:border-tf-indigo focus:ring-1 focus:ring-tf-indigo/30 text-xs"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-tf-border">
            <Link
              to={`/work-items/${id}`}
              className="px-3.5 py-1.5 rounded-md text-tf-slate hover:text-tf-charcoal text-xs font-medium transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-tf-indigo hover:bg-tf-indigo/90 text-white text-xs font-medium shadow-tf-sm transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {submitting ? 'Checking revision...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

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
