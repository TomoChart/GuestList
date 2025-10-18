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
      className="w-full rounded border border-white/30 bg-blue-900/60 px-4 py-2 text-sm text-white shadow-sm placeholder-blue-200 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
      placeholder={placeholder ?? 'Search...'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

export default SearchBar;