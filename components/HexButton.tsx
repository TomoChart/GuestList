import React from 'react';

type HexButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
  accent?: 'cyan' | 'emerald';
  className?: string;
  ariaLabel?: string;
};

const accentShadow: Record<NonNullable<HexButtonProps['accent']>, string> = {
  cyan: 'shadow-[0_6px_0_rgba(8,145,178,0.45)] hover:shadow-[0_4px_0_rgba(8,145,178,0.55)]',
  emerald: 'shadow-[0_6px_0_rgba(16,185,129,0.45)] hover:shadow-[0_4px_0_rgba(16,185,129,0.55)]',
};

export default function HexButton({
  label,
  isActive,
  onClick,
  accent,
  className = '',
  ariaLabel,
}: HexButtonProps) {
  const activeBg = accent === 'emerald' ? 'bg-emerald-500' : 'bg-cyan-500';
  const baseShadow = 'shadow-[0_6px_0_rgba(0,0,0,0.35)] hover:shadow-[0_4px_0_rgba(0,0,0,0.45)]';
  const accentClass = accent ? accentShadow[accent] : baseShadow;

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className={`relative inline-flex h-10 min-w-[8.5rem] items-center justify-center px-5 text-sm font-semibold uppercase tracking-wide text-white transition-transform duration-150 active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
        isActive ? activeBg : 'bg-black'
      } ${accentClass} after:pointer-events-none after:absolute after:inset-0 after:rounded-[8px] after:border after:border-white/15 ${className}`}
      style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}
    >
      <span className="relative z-10 font-semibold">{label}</span>
    </button>
  );
}

export type { HexButtonProps };
