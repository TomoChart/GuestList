import React, { useEffect, useMemo, useState } from 'react';

import GuestCard from '../components/GuestCard';
import SearchBar from '../components/SearchBar';
import type { Guest } from '../types/Guest';

const KioskPage: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRecord, setActiveRecord] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();

        if (searchTerm) {
          params.append('q', searchTerm);
        }

        if (departmentFilter) {
          params.append('department', departmentFilter);
        }

        if (responsibleFilter) {
          params.append('responsible', responsibleFilter);
        }

        const queryString = params.toString();
        const response = await fetch(`/api/guests${queryString ? `?${queryString}` : ''}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch guests');
        }

        const data: Guest[] = await response.json();
        setGuests(data);

        if (!searchTerm && !departmentFilter && !responsibleFilter) {
          setAllGuests(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchTerm, departmentFilter, responsibleFilter]);

  const departmentOptions = useMemo(() => {
    const source = allGuests.length ? allGuests : guests;
    const unique = new Set(source.map((guest) => guest.department).filter(Boolean));
    return Array.from(unique);
  }, [allGuests, guests]);

  const responsibleOptions = useMemo(() => {
    const source = allGuests.length ? allGuests : guests;
    const unique = new Set(source.map((guest) => guest.responsible).filter(Boolean));
    return Array.from(unique);
  }, [allGuests, guests]);

  const updateGuestState = (recordId: string, updater: (guest: Guest) => Guest) => {
    setGuests((prev) => prev.map((guest) => (guest.id === recordId ? updater(guest) : guest)));
    setAllGuests((prev) => prev.map((guest) => (guest.id === recordId ? updater(guest) : guest)));
  };

  const handleCheckIn = async ({ recordId, guestArrived, companionArrived }: { recordId: string; guestArrived: boolean; companionArrived: boolean }) => {
    setActiveRecord(recordId);

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordId, guestArrived, companionArrived }),
      });

      if (!response.ok) {
        throw new Error('Failed to update check-in');
      }

      const now = new Date().toISOString();
      updateGuestState(recordId, (guest) => ({
        ...guest,
        checkInGuest: guestArrived,
        checkInCompanion: companionArrived,
        checkInTime: now,
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setActiveRecord(null);
    }
  };

  const handleGiftToggle = async ({ recordId, value }: { recordId: string; value: boolean }) => {
    setActiveRecord(recordId);

    try {
      const response = await fetch('/api/gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordId, value }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle gift');
      }

      updateGuestState(recordId, (guest) => ({
        ...guest,
        giftReceived: value,
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setActiveRecord(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">
      <header className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold text-center">Guest Check-in Kiosk</h1>
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by guest or companion" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            className="border px-4 py-2 rounded"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="">All departments</option>
            {departmentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            className="border px-4 py-2 rounded"
            value={responsibleFilter}
            onChange={(event) => setResponsibleFilter(event.target.value)}
          >
            <option value="">All responsible persons</option>
            {responsibleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {loading && <p className="text-center text-gray-600">Loading guests...</p>}
        {!loading && !guests.length && <p className="text-center text-gray-600">No guests found.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {guests.map((guest) => (
            <GuestCard
              key={guest.id}
              guest={guest}
              onCheckIn={handleCheckIn}
              onToggleGift={handleGiftToggle}
              loading={activeRecord === guest.id}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default KioskPage;
