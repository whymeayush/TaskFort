import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check, X } from 'lucide-react';

export function ConflictModal({ isOpen, onClose, onRefresh, conflictData, clientPayload }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(clientPayload || {}, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-tf-modal max-w-xl w-full border border-[#E7E9EF] overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E7E9EF] flex items-center justify-between bg-[#F8F9FB]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-[#20242C] text-sm">Concurrent update conflict</h3>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#20242C]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5">
          <p className="text-[#20242C] leading-relaxed">
            This item has changed since you opened it. Review the latest version before saving.
          </p>

          <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
            <div className="border border-[#E7E9EF] rounded-md p-3 bg-[#F8F9FB] space-y-1">
              <span className="font-sans font-semibold text-[#727987] block uppercase text-[10px] tracking-wider">
                Your unsaved changes
              </span>
              <pre className="text-[#20242C] max-h-36 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(clientPayload || { message: 'Pending edits' }, null, 2)}
              </pre>
            </div>

            <div className="border border-emerald-200 rounded-md p-3 bg-emerald-50/40 space-y-1">
              <span className="font-sans font-semibold text-emerald-800 block uppercase text-[10px] tracking-wider">
                Latest server state {conflictData?.serverVersion ? `(v${conflictData.serverVersion})` : ''}
              </span>
              <pre className="text-emerald-950 max-h-36 overflow-auto whitespace-pre-wrap">
                {conflictData?.serverItem ? JSON.stringify(conflictData.serverItem, null, 2) : conflictData?.message || 'Newer version stored on server.'}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F8F9FB] px-5 py-3 border-t border-[#E7E9EF] flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#727987] hover:text-[#20242C] hover:bg-white rounded border border-transparent hover:border-[#E7E9EF] transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy unsaved edits'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-[#727987] hover:text-[#20242C] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#4F5FE8] hover:bg-[#4150D8] text-white text-xs font-medium shadow-tf-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload latest version
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
