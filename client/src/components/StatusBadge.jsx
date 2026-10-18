import React from 'react';

export function StatusBadge({ status }) {
  const configs = {
    'Open': {
      dot: 'bg-blue-500',
      text: 'text-[#20242C]',
      bg: 'bg-slate-100/70 border-slate-200/70'
    },
    'In Progress': {
      dot: 'bg-amber-500',
      text: 'text-[#20242C]',
      bg: 'bg-amber-50/60 border-amber-200/60'
    },
    'Blocked': {
      dot: 'bg-rose-500',
      text: 'text-rose-800',
      bg: 'bg-rose-50/70 border-rose-200/70'
    },
    'In Review': {
      dot: 'bg-indigo-500',
      text: 'text-indigo-900',
      bg: 'bg-indigo-50/60 border-indigo-200/60'
    },
    'Resolved': {
      dot: 'bg-emerald-500',
      text: 'text-emerald-900',
      bg: 'bg-emerald-50/60 border-emerald-200/60'
    },
    'Closed': {
      dot: 'bg-slate-400',
      text: 'text-slate-600',
      bg: 'bg-slate-100/60 border-slate-200/60'
    }
  };

  const config = configs[status] || configs['Open'];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{status}</span>
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const configs = {
    'CRITICAL': {
      text: 'text-rose-700 font-semibold',
      dot: 'bg-rose-500',
      label: 'Critical'
    },
    'HIGH': {
      text: 'text-amber-700 font-medium',
      dot: 'bg-amber-500',
      label: 'High'
    },
    'MEDIUM': {
      text: 'text-[#727987]',
      dot: 'bg-slate-300',
      label: 'Medium'
    },
    'LOW': {
      text: 'text-[#9CA3AF]',
      dot: 'bg-slate-200',
      label: 'Low'
    }
  };

  const config = configs[priority] || configs['MEDIUM'];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}

export function TypeBadge({ type }) {
  const formatType = (t) => {
    if (!t) return '';
    return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-normal text-[#727987] bg-slate-100/80 border border-[#E7E9EF]">
      {formatType(type)}
    </span>
  );
}
