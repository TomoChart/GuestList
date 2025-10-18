import React from 'react';

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  description?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, description }) => {
  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl border border-white/40 bg-white/25 p-4 text-center text-white shadow-md backdrop-blur-md sm:text-left">
      <h2 className="text-base font-semibold uppercase tracking-wide text-white/90 sm:text-sm">{title}</h2>
      <div className="text-3xl font-bold leading-tight text-white sm:text-4xl">{value}</div>
      {description && <p className="text-xs text-white/70 sm:text-sm">{description}</p>}
    </div>
  );
};

export default KpiCard;