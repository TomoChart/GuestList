interface StatsBarProps {
  arrivedTotal: number;
  giftsGiven: number;
  updatedAt?: Date | null;
  latencyMs?: number | null;
}

function formatLatency(latency?: number | null): { label: string; className: string } {
  if (latency == null) {
    return { label: "--", className: "bg-white/40" };
  }

  if (latency < 1200) {
    return { label: `${Math.round(latency)}ms`, className: "bg-emerald-400" };
  }

  if (latency < 2500) {
    return { label: `${Math.round(latency)}ms`, className: "bg-amber-400" };
  }

  return { label: `${Math.round(latency)}ms`, className: "bg-rose-500" };
}

export function StatsBar({
  arrivedTotal,
  giftsGiven,
  updatedAt,
  latencyMs,
}: StatsBarProps) {
  const latency = formatLatency(latencyMs ?? null);
  const updatedLabel = updatedAt
    ? `zadnje ažurirano ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "čekam podatke";

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/40 bg-white/10 px-6 py-3 text-sm"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-4 font-semibold uppercase tracking-[0.2em]">
        <span>
          Arrived total: <span className="text-white/80">{arrivedTotal}</span>
        </span>
        <span>
          Gifts given: <span className="text-white/80">{giftsGiven}</span>
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/70">
        <span className="flex items-center gap-2">
          <span className={`block h-3 w-3 rounded-full ${latency.className}`} aria-hidden />
          Latency {latency.label}
        </span>
        <span>{updatedLabel}</span>
      </div>
    </div>
  );
}

export default StatsBar;
