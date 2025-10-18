import React from 'react';

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  description?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, description }) => {
  return (
    <div className="bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl shadow-md p-4 text-center">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="text-3xl font-bold text-brand leading-tight">{value}</div>
      {description && <p className="text-sm text-white/70">{description}</p>}
    </div>
  );
};

export default KpiCard;