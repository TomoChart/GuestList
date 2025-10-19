import React from 'react';

export type StatCardProps = {
  label: string;
  value: number | string;
  sublabel?: string;
};

export function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 text-center transition-all">
      <span className="text-4xl font-bold text-slate-900 sm:text-5xl">{value}</span>
      <span className="text-sm font-medium text-slate-700 sm:text-base">{label}</span>
      {sublabel ? <span className="text-xs text-slate-500 sm:text-sm">{sublabel}</span> : null}
    </div>
  );
}

export default StatCard;
