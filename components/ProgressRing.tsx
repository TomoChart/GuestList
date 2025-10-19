import React, { useEffect, useMemo, useState } from 'react';

export type ProgressRingProps = {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
};

const clampPercent = (value: number) => {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
};

export function ProgressRing({ percent, size = 160, stroke = 12, label, children }: React.PropsWithChildren<ProgressRingProps>) {
  const normalizedPercent = clampPercent(percent);
  const radius = useMemo(() => Math.max((size - stroke) / 2, 0), [size, stroke]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    const nextOffset = circumference * (1 - normalizedPercent / 100);
    const timeout = requestAnimationFrame(() => {
      setDashOffset(nextOffset);
    });

    return () => cancelAnimationFrame(timeout);
  }, [circumference, normalizedPercent]);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="block">
          <circle
            className="text-white/40"
            stroke="currentColor"
            strokeWidth={stroke}
            fill="transparent"
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
          <circle
            className="text-emerald-500 drop-shadow"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="transparent"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.9s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          {children ?? (
            <span className="text-4xl font-bold text-slate-900 sm:text-5xl">{Math.round(normalizedPercent)}%</span>
          )}
        </div>
      </div>
      {label ? <span className="text-sm font-medium text-slate-700 sm:text-base">{label}</span> : null}
    </div>
  );
}

export default ProgressRing;
