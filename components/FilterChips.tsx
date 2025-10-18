import React from 'react';

interface FilterChipsProps {
  filters: string[];
  onSelect: (filter: string) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ filters, onSelect }) => {
  return (
    <div className="flex space-x-2">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onSelect(filter)}
          className="px-4 py-2 bg-white/20 rounded-lg text-white"
        >
          {filter}
        </button>
      ))}
    </div>
  );
};

export default FilterChips;