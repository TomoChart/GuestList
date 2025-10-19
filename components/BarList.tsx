import React from 'react';

export type BarDatum = { name: string; arrived: number; invited: number; pct: number };

export type BarListProps = {
  data: BarDatum[];
  maxBars?: number;
};

export function BarList({ data, maxBars = 5 }: BarListProps) {
  const items = (maxBars ? data.slice(0, maxBars) : data).map((item) => ({
    ...item,
    pct: Number.isFinite(item.pct) ? Math.max(0, Math.min(100, item.pct)) : 0,
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/30 bg-white/40 p-4 text-center text-sm text-slate-600">
        Trenutno nema dovoljno podataka za prikaz.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.name}
          className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/50 px-4 py-3 backdrop-blur transition-all"
        >
          <div className="absolute inset-0 rounded-2xl bg-white/30" aria-hidden />
          <div
            className="absolute inset-y-0 left-0 rounded-2xl bg-emerald-500/80 transition-all duration-700"
            style={{ width: `${item.pct}%` }}
            aria-hidden
          />
          <div className="relative z-10 flex items-center gap-3 text-xs sm:text-sm">
            <span className="flex-1 truncate font-semibold text-slate-800">{item.name}</span>
            <span className="w-24 text-center font-medium text-slate-700">
              {item.arrived}/{item.invited}
            </span>
            <span className="w-16 text-right font-semibold text-slate-900">{item.pct}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default BarList;
