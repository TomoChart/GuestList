import React from 'react';

const GuestCard: React.FC = () => {
  return (
    <div className="border p-4 rounded shadow">
      <h2 className="text-lg font-bold">Guest Name</h2>
      <p>Company</p>
      <p>Responsible Person</p>
      <button className="px-4 py-2 bg-blue-500 text-white rounded">Arrived: 1</button>
      <button className="px-4 py-2 bg-green-500 text-white rounded">Arrived: 2</button>
      <label>
        <input type="checkbox" /> Gift
      </label>
    </div>
  );
};

export default GuestCard;