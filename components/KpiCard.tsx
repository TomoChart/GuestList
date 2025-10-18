import React from 'react';

interface KpiCardProps {
  title: string;
  value: number;
  description?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, description }) => {
  return (
    <div className="bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl shadow-md p-4 text-center">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-3xl font-bold text-brand">{value}</p>
      {description && <p className="text-sm text-white/70">{description}</p>}
    </div>
  );
};

export default KpiCard;