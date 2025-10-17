import React from 'react';

import { Guest } from '../types/Guest';

interface GuestCardProps {
  guest: Guest;
  onArrive: (guestArrived: boolean, companionArrived: boolean) => void;
  onToggleGift: (value: boolean) => void;
  checkInLoading?: boolean;
  giftLoading?: boolean;
}

const GuestCard: React.FC<GuestCardProps> = ({ guest, onArrive, onToggleGift, checkInLoading, giftLoading }) => {
  const arrivedCount = (guest.checkInGuest ? 1 : 0) + (guest.checkInCompanion ? 1 : 0);
  const hasCompanion = Boolean(guest.companionName);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{guest.guestName}</h2>
        {guest.companionName && <p className="text-sm text-gray-600">Pratnja: {guest.companionName}</p>}
        {guest.company && <p className="text-sm text-gray-600">Tvrtka: {guest.company}</p>}
        <p className="text-sm text-gray-600">Odgovorna osoba: {guest.responsible || '—'}</p>
        <p className="text-sm text-gray-600">PMZ odjel: {guest.department || '—'}</p>
        <p className="text-xs uppercase tracking-wide text-gray-500">Potvrda dolaska: {guest.arrivalConfirmation}</p>
        {guest.checkInTime && <p className="text-xs text-gray-500">Vrijeme Check-Ina: {guest.checkInTime}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-blue-200"
          onClick={() => onArrive(true, false)}
          disabled={
            checkInLoading ||
            (!hasCompanion && guest.checkInGuest) ||
            (guest.checkInGuest && guest.checkInCompanion)
          }
        >
          Arrived: 1
        </button>
        <button
          type="button"
          className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-green-200"
          onClick={() => onArrive(true, hasCompanion)}
          disabled={checkInLoading || !hasCompanion || (guest.checkInGuest && guest.checkInCompanion)}
        >
          Arrived: 2
        </button>
        <div className="flex items-center gap-2">
          <input
            id={`gift-${guest.id}`}
            type="checkbox"
            checked={guest.giftReceived}
            disabled={giftLoading}
            onChange={(event) => onToggleGift(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor={`gift-${guest.id}`} className="text-sm font-medium text-gray-700">
            Gift
          </label>
        </div>
      </div>

      <p className="text-xs text-gray-500">Prisutno: {arrivedCount}</p>
    </div>
  );
};

export default GuestCard;