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
    <div className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-blue-900/70 p-4 text-white shadow">
      <div>
        <h2 className="text-lg font-semibold text-white">{guest.guestName}</h2>
        {guest.companionName && <p className="text-sm text-blue-100">Plus one: {guest.companionName}</p>}
        {guest.company && <p className="text-sm text-blue-100">Company: {guest.company}</p>}
        <p className="text-sm text-blue-100">PMZ Responsible: {guest.responsible || '—'}</p>
        <p className="text-sm text-blue-100">PMZ Deparment: {guest.department || '—'}</p>
        <p className="text-xs uppercase tracking-wide text-blue-200">Arrival Confirmation: {guest.arrivalConfirmation}</p>
        {guest.checkInTime && <p className="text-xs text-blue-200">CheckIn Time: {guest.checkInTime}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow disabled:cursor-not-allowed disabled:bg-emerald-900 disabled:text-emerald-200"
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
          className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 shadow disabled:cursor-not-allowed disabled:bg-sky-900 disabled:text-sky-200"
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
            className="h-5 w-5 rounded border-white/40 text-teal-300 accent-teal-400"
          />
          <label htmlFor={`gift-${guest.id}`} className="text-sm font-medium text-blue-100">
            Farewell gift
          </label>
        </div>
      </div>

      <p className="text-xs text-blue-200">Prisutno: {arrivedCount}</p>
    </div>
  );
};

export default GuestCard;