import React from 'react';
import clsx from 'clsx';

export type HexButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
  accent?: 'cyan' | 'emerald';
  className?: string;
  ariaLabel?: string;
};

const HexButton: React.FC<HexButtonProps> = ({
  label,
  isActive,
  onClick,
  accent = 'cyan',
  className,
  ariaLabel,
}) => {
  const activeBackground = accent === 'emerald' ? 'bg-emerald-500' : 'bg-cyan-500';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={clsx(
        'relative inline-flex h-10 min-w-[140px] items-center justify-center px-5 text-sm font-semibold uppercase tracking-wide text-white transition-all duration-150',
        'shadow-[0_6px_0_rgba(0,0,0,0.35)] active:translate-y-px active:shadow-[0_3px_0_rgba(0,0,0,0.45)]',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-[8px] after:border after:border-white/15 after:content-[""]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        isActive ? activeBackground : 'bg-black',
        !isActive && 'hover:shadow-[0_4px_0_rgba(0,0,0,0.45)]',
        isActive && 'hover:shadow-[0_5px_0_rgba(0,0,0,0.45)]',
        'hover:translate-y-[1px]',
        className
      )}
      style={{
        clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
      }}
    >
      <span className="relative z-10">{label}</span>
    </button>
  );
};

export default HexButton;
