import React from 'react';

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  description?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, description }) => {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[28px] border border-white/45 bg-white/25 px-6 py-8 text-center text-[#071334] shadow-[0_30px_90px_rgba(8,22,55,0.45)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-white/15 to-transparent opacity-90" aria-hidden="true" />
      <div className="relative flex h-full w-full flex-col items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#163b7d]/70 sm:text-sm">{title}</h2>
        <div className="flex flex-col items-center gap-1 text-5xl font-black leading-tight tracking-tight text-[#071334] sm:text-6xl">
          {value}
        </div>
        {description && <p className="text-xs font-medium text-[#1f3f86]/75 sm:text-sm">{description}</p>}
      </div>
    </div>
  );
};

export default KpiCard;
