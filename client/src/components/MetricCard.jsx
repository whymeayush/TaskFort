import React from 'react';

export function MetricCard({ label, value, icon: Icon, onClick, active = false, hint }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-lg px-4 py-3 transition-all duration-100 ${
        active
          ? 'border-[#4F5FE8] ring-1 ring-[#4F5FE8]/20 shadow-tf-sm'
          : 'border-[#E7E9EF] hover:border-[#D1D5DF] hover:shadow-tf-sm'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#727987]">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-[#727987]/70" />}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-[#20242C] tracking-tight font-sans">
          {value !== undefined ? value : '—'}
        </span>
        {hint && (
          <span className="text-[11px] text-[#727987] font-normal">{hint}</span>
        )}
      </div>
    </div>
  );
}
