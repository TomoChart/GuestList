import React from 'react';

const SearchBar: React.FC = () => {
  return (
    <input
      type="text"
      className="border px-4 py-2 rounded w-full"
      placeholder="Search..."
    />
  );
};

export default SearchBar;