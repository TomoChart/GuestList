interface KpiCardProps {
  label: string;
  value: number;
  subtitle?: string;
}

export function KpiCard({ label, value, subtitle }: KpiCardProps) {
  return (
    <div className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-white/40 bg-white/20 px-6 py-4 shadow-lg backdrop-blur-md">
      <span className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
        {label}
      </span>
      <span className="text-4xl font-bold text-white">{value.toLocaleString()}</span>
      {subtitle ? (
        <span className="text-xs uppercase tracking-[0.3em] text-white/60">{subtitle}</span>
      ) : null}
    </div>
  );
}

export default KpiCard;
