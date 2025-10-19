import React from 'react';

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  description?: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, description }) => {
  return (
    <div className="flex h-full flex-col items-center gap-4 rounded-[32px] border border-white/30 bg-white/15 p-6 text-center text-white shadow-[0_20px_60px_rgba(8,15,40,0.55)] backdrop-blur-xl sm:p-7">
      <h2 className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70 sm:text-sm">{title}</h2>
      <div className="w-full text-5xl font-black leading-tight tracking-tight text-white drop-shadow-lg sm:text-6xl">{value}</div>
      {description && <div className="text-sm font-medium text-white/80 sm:text-base">{description}</div>}
    </div>
  );
};

export default KpiCard;