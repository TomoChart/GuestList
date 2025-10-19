import React, { PropsWithChildren, useEffect, useId, useMemo, useState } from 'react';

export type ProgressRingProps = {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
};

export function ProgressRing({
  percent,
  size = 160,
  stroke = 12,
  label,
  children,
}: PropsWithChildren<ProgressRingProps>) {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  const normalizedPercent = Math.max(0, Math.min(100, safePercent));
  const gradientId = useId();
  const radius = useMemo(() => (size - stroke) / 2, [size, stroke]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setDisplayPercent(normalizedPercent);
    });

    return () => cancelAnimationFrame(frame);
  }, [normalizedPercent]);

  const dashOffset = useMemo(
    () => circumference - (displayPercent / 100) * circumference,
    [circumference, displayPercent]
  );

  const valueNode = useMemo(() => {
    if (children !== undefined && children !== null) {
      return children;
    }

    return `${Math.round(displayPercent)}%`;
  }, [children, displayPercent]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="overflow-visible">
          <circle
            stroke="rgba(255,255,255,0.35)"
            fill="transparent"
            strokeWidth={stroke}
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
          <circle
            stroke={`url(#${gradientId})`}
            fill="transparent"
            strokeWidth={stroke}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.7s ease-out',
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{valueNode}</span>
          {children !== undefined && children !== null ? (
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">
              {Math.round(safePercent)}%
            </span>
          ) : null}
        </div>
      </div>
      {label ? (
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-600 sm:text-base">
          {label}
        </p>
      ) : null}
    </div>
  );
}

export default ProgressRing;
