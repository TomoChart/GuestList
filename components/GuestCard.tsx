import React from 'react';

import type { Guest } from '../types/Guest';

type GuestCardProps = {
  guest: Guest;
  onCheckIn: (options: { recordId: string; guestArrived: boolean; companionArrived: boolean }) => void;
  onToggleGift: (options: { recordId: string; value: boolean }) => void;
  loading?: boolean;
};

const GuestCard: React.FC<GuestCardProps> = ({ guest, onCheckIn, onToggleGift, loading = false }) => {
  const handleArrivedOne = () => {
    onCheckIn({ recordId: guest.id, guestArrived: true, companionArrived: false });
  };

  const handleArrivedTwo = () => {
    onCheckIn({ recordId: guest.id, guestArrived: true, companionArrived: true });
  };

  const handleGiftToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    onToggleGift({ recordId: guest.id, value: event.target.checked });
  };

  return (
    <div className="border p-4 rounded shadow bg-white space-y-3">
      <div>
        <h2 className="text-lg font-bold">{guest.guestName}</h2>
        {guest.company && <p className="text-sm text-gray-600">{guest.company}</p>}
        <p className="text-sm">Responsible: {guest.responsible || '—'}</p>
        <p className="text-sm">Department: {guest.department || '—'}</p>
        {guest.companionName && <p className="text-sm">Companion: {guest.companionName}</p>}
        <p className="text-sm">Arrival confirmation: {guest.arrivalConfirmation}</p>
        {guest.checkInTime && <p className="text-xs text-gray-500">Checked in at: {guest.checkInTime}</p>}
      </div>

      <div className="flex gap-2">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          onClick={handleArrivedOne}
          disabled={loading}
        >
          Arrived: 1
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          onClick={handleArrivedTwo}
          disabled={loading}
        >
          Arrived: 2
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={guest.giftReceived} onChange={handleGiftToggle} disabled={loading} /> Gift received
      </label>

      <div className="text-xs text-gray-600 space-y-1">
        <p>Guest checked in: {guest.checkInGuest ? 'Yes' : 'No'}</p>
        <p>Companion checked in: {guest.checkInCompanion ? 'Yes' : 'No'}</p>
        <p>Gift: {guest.giftReceived ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default GuestCard;
