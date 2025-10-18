import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder }) => {
  return (
    <input
      type="text"
      className="w-full rounded-full border border-white/50 bg-white/80 px-4 py-2 text-sm font-medium text-[#0b1f46] placeholder:text-[#1f3f86]/60 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
      placeholder={placeholder ?? 'Search...'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

export default SearchBar;