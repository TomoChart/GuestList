import React, { useEffect, useMemo, useState } from 'react';

import GuestCard from '../components/GuestCard';
import SearchBar from '../components/SearchBar';
import { Guest } from '../types/Guest';

const KioskPage: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkInLoadingId, setCheckInLoadingId] = useState<string | null>(null);
  const [giftLoadingId, setGiftLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const fetchGuests = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (debouncedQuery) {
          params.set('q', debouncedQuery);
        }

        const response = await fetch(`/api/guests${params.toString() ? `?${params.toString()}` : ''}`);

        if (!response.ok) {
          throw new Error('Failed to fetch guests');
        }

        const data: Guest[] = await response.json();
        setGuests(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError('There was a problem loading guests. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGuests();
  }, [debouncedQuery]);

  const filteredGuests = useMemo(() => guests, [guests]);

  const handleArrive = async (guest: Guest, guestArrived: boolean, companionArrived: boolean) => {
    setCheckInLoadingId(guest.id);
    setError(null);

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordId: guest.id,
          guestArrived,
          companionArrived,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update check-in');
      }

      const updatedGuest: Guest = await response.json();
      setGuests((current) => current.map((item) => (item.id === updatedGuest.id ? updatedGuest : item)));
    } catch (updateError) {
      console.error(updateError);
      setError('Unable to update check-in. Please retry.');
    } finally {
      setCheckInLoadingId(null);
    }
  };

  const handleToggleGift = async (guest: Guest, value: boolean) => {
    setGiftLoadingId(guest.id);
    setError(null);

    try {
      const response = await fetch('/api/gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordId: guest.id,
          value,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update gift status');
      }

      const updatedGuest: Guest = await response.json();
      setGuests((current) => current.map((item) => (item.id === updatedGuest.id ? updatedGuest : item)));
    } catch (updateError) {
      console.error(updateError);
      setError('Unable to update gift status. Please retry.');
    } finally {
      setGiftLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="mx-auto w-full max-w-5xl px-4">
        <h1 className="text-3xl font-bold text-gray-900">Guest Check-In Kiosk</h1>
        <p className="mt-1 text-sm text-gray-600">Use the search to quickly find guests and confirm their arrival.</p>

        <div className="mt-6">
          <SearchBar value={query} onChange={setQuery} placeholder="Search by guest, companion, or responsible" />
        </div>

        {error && <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 text-sm text-gray-600">Loading guests…</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filteredGuests.length === 0 ? (
              <p className="text-sm text-gray-600">No guests match your search.</p>
            ) : (
              filteredGuests.map((guest) => (
                <GuestCard
                  key={guest.id}
                  guest={guest}
                  onArrive={(guestArrived, companionArrived) => handleArrive(guest, guestArrived, companionArrived)}
                  onToggleGift={(value) => handleToggleGift(guest, value)}
                  checkInLoading={checkInLoadingId === guest.id}
                  giftLoading={giftLoadingId === guest.id}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KioskPage;