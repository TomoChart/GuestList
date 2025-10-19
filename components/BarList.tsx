import React from 'react';

export type BarDatum = {
  name: string;
  arrived: number;
  invited: number;
  pct: number;
};

export type BarListProps = {
  data: BarDatum[];
  maxBars?: number;
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

export function BarList({ data, maxBars = 5 }: BarListProps) {
  const items = data.slice(0, maxBars);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-white/40 bg-white/50 p-4 text-center text-sm text-slate-600 backdrop-blur">
        Nema dovoljno podataka za prikaz.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const safePct = Math.max(0, Math.min(100, item.pct));
        return (
          <div
            key={item.name}
            className="rounded-2xl border border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md transition-all hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:text-sm">
              <span className="truncate">{item.name}</span>
              <span className="ml-auto font-medium normal-case text-slate-700">
                {item.arrived}/{item.invited}
              </span>
              <span className="font-semibold text-emerald-600">{formatPercent(safePct)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out"
                style={{ width: `${safePct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BarList;
