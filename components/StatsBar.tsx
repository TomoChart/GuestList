import React from 'react';

interface StatsBarProps {
  arrivedTotal: number;
  giftsGiven: number;
  latencyStatus: 'good' | 'average' | 'poor';
}

const StatsBar: React.FC<StatsBarProps> = ({ arrivedTotal, giftsGiven, latencyStatus }) => {
  const latencyColor = {
    good: 'text-green-500',
    average: 'text-yellow-500',
    poor: 'text-red-500',
  }[latencyStatus];

  return (
    <footer className="sticky bottom-0 bg-brand text-white p-4 flex justify-between items-center">
      <span>Arrived total: {arrivedTotal}</span>
      <span>Gifts given: {giftsGiven}</span>
      <span className={latencyColor}>Latency: {latencyStatus}</span>
    </footer>
  );
};

export default StatsBar;