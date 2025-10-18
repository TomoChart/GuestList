import React from 'react';

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  description?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, description }) => {
  return (
    <div className="flex h-full flex-col items-center gap-3 rounded-3xl border border-white/60 bg-white/70 p-5 text-center text-[#0b1f46] shadow-2xl backdrop-blur">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#163b7d]/80">{title}</h2>
      <div className="text-4xl font-extrabold leading-tight text-[#081637] sm:text-5xl">{value}</div>
      {description && <p className="text-xs font-medium text-[#1f3f86]/80 sm:text-sm">{description}</p>}
    </div>
  );
};

export default KpiCard;