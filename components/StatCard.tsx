import React from 'react';

export type StatCardProps = {
  label: string;
  value: number | string;
  sublabel?: string;
};

export function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/60 px-4 py-3 text-center shadow-inner transition-all">
      <span className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {value}
      </span>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-sm">
        {label}
      </span>
      {sublabel ? (
        <span className="text-xs text-slate-600 sm:text-sm">{sublabel}</span>
      ) : null}
    </div>
  );
}

export default StatCard;
