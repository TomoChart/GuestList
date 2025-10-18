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
      className="w-full rounded-full border border-white/40 bg-[#0f2d6a] px-4 py-2 text-sm text-white placeholder:text-white/70 shadow-sm focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-300"
      placeholder={placeholder ?? 'Search...'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

export default SearchBar;