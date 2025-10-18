import React from 'react';

interface SmartCheckboxProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  accent?: 'green' | 'cyan' | 'brand';
}

const SmartCheckbox: React.FC<SmartCheckboxProps> = ({ checked, onChange, ariaLabel, accent = 'brand' }) => {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onChange}
      className={`h-7 w-7 rounded-lg border border-white/70 bg-white/20 backdrop-blur-sm shadow-inner flex items-center justify-center ${
        checked ? `bg-${accent} border-transparent` : ''
      }`}
    >
      {checked && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="white"
          className="h-5 w-5"
        >
          <path d="M20.285 6.285a1 1 0 00-1.414 0L9 16.157l-3.871-3.872a1 1 0 00-1.414 1.414l4.586 4.586a1 1 0 001.414 0l10.586-10.586a1 1 0 000-1.414z" />
        </svg>
      )}
    </button>
  );
};

export default SmartCheckbox;