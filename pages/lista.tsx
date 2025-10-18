import React, { useEffect, useMemo, useState } from 'react';
import backgroundLista from './background/background_lista.jpg';
import { Guest } from '../types/Guest';

type SortKey =
  | 'department'
  | 'responsible'
  | 'company'
  | 'guestName'
  | 'companionName'
  | 'arrivalConfirmation'
  | 'checkInGuest'
  | 'checkInCompanion'
  | 'checkInTime'
  | 'giftReceived'
  | 'giftReceivedTime';

type SortDirection = 'asc' | 'desc';

type ColumnFilterState = {
  department: string;
  responsible: string;
  company: string;
  guestName: string;
  companionName: string;
  arrivalConfirmation: '' | 'YES' | 'NO' | 'UNKNOWN';
  checkInGuest: '' | 'yes' | 'no';
  checkInCompanion: '' | 'yes' | 'no';
  checkInTime: string;
  giftReceived: '' | 'yes' | 'no';
};

const initialFilters: ColumnFilterState = {
  department: '',
  responsible: '',
  company: '',
  guestName: '',
  companionName: '',
  arrivalConfirmation: '',
  checkInGuest: '',
  checkInCompanion: '',
  checkInTime: '',
  giftReceived: '',
};

const ListaPage: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [columnFilters, setColumnFilters] = useState<ColumnFilterState>(initialFilters);
  const [sortKey, setSortKey] = useState<SortKey>('guestName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const fetchGuests = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/guests');

        if (!response.ok) {
          throw new Error('Failed to fetch guests');
        }

        const data: Guest[] = await response.json();
        setGuests(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError('Došlo je do pogreške prilikom učitavanja gostiju. Pokušajte ponovno.');
      } finally {
        setLoading(false);
      }
    };

    fetchGuests();
  }, []);

  const filteredGuests = useMemo(() => {
    const includesInsensitive = (value: string | undefined, search: string) =>
      (value ?? '').toLowerCase().includes(search.toLowerCase());

    return guests.filter((guest) => {
      if (columnFilters.department && !includesInsensitive(guest.department, columnFilters.department)) {
        return false;
      }

      if (columnFilters.responsible && !includesInsensitive(guest.responsible, columnFilters.responsible)) {
        return false;
      }

      if (columnFilters.company && !includesInsensitive(guest.company, columnFilters.company)) {
        return false;
      }

      if (columnFilters.guestName && !includesInsensitive(guest.guestName, columnFilters.guestName)) {
        return false;
      }

      if (columnFilters.companionName && !includesInsensitive(guest.companionName, columnFilters.companionName)) {
        return false;
      }

      if (columnFilters.arrivalConfirmation && guest.arrivalConfirmation !== columnFilters.arrivalConfirmation) {
        return false;
      }

      if (columnFilters.checkInGuest === 'yes' && !guest.checkInGuest) {
        return false;
      }

      if (columnFilters.checkInGuest === 'no' && guest.checkInGuest) {
        return false;
      }

      if (columnFilters.checkInCompanion === 'yes' && !guest.checkInCompanion) {
        return false;
      }

      if (columnFilters.checkInCompanion === 'no' && guest.checkInCompanion) {
        return false;
      }

      if (columnFilters.checkInTime && !includesInsensitive(guest.checkInTime, columnFilters.checkInTime)) {
        return false;
      }

      if (columnFilters.giftReceived === 'yes' && !guest.giftReceived) {
        return false;
      }

      if (columnFilters.giftReceived === 'no' && guest.giftReceived) {
        return false;
      }

      return true;
    });
  }, [guests, columnFilters]);

  const sortedGuests = useMemo(() => {
    const data = [...filteredGuests];

    const compare = (a: Guest, b: Guest) => {
      const directionFactor = sortDirection === 'asc' ? 1 : -1;

      const getValue = (guest: Guest): string | number | boolean => {
        switch (sortKey) {
          case 'department':
            return guest.department.toLowerCase();
          case 'responsible':
            return guest.responsible.toLowerCase();
          case 'company':
            return guest.company.toLowerCase();
          case 'guestName':
            return guest.guestName.toLowerCase();
          case 'companionName':
            return (guest.companionName ?? '').toLowerCase();
          case 'arrivalConfirmation':
            return guest.arrivalConfirmation;
          case 'checkInGuest':
            return guest.checkInGuest;
          case 'checkInCompanion':
            return guest.checkInCompanion;
          case 'checkInTime':
            return guest.checkInTime ? Date.parse(guest.checkInTime) || guest.checkInTime : '';
          case 'giftReceived':
            return guest.giftReceived;
          default:
            return '';
        }
      };

      const valueA = getValue(a);
      const valueB = getValue(b);

      if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
        return valueA === valueB ? 0 : valueA ? directionFactor : -directionFactor;
      }

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        if (valueA === valueB) {
          return 0;
        }
        return valueA > valueB ? directionFactor : -directionFactor;
      }

      return valueA.toString().localeCompare(valueB.toString(), undefined, { sensitivity: 'base' }) * directionFactor;
    };

    data.sort(compare);
    return data;
  }, [filteredGuests, sortDirection, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = <K extends keyof ColumnFilterState>(key: K, value: ColumnFilterState[K]) => {
    setColumnFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  // Helper for POST requests
  async function markArrived(recordId: string, field: 'guest' | 'plusOne' | 'gift', value: boolean) {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, field, value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error(data?.body || data?.message || 'Failed');
    return data;
  }

  // Optimistic handler
  async function handleArrived(rowId: string, field: 'guest' | 'plusOne' | 'gift', to: boolean) {
    // Optimistic UI update
    setGuests((prev) =>
      prev.map((g) => {
        if (g.id !== rowId) return g;
        if (field === 'guest') return { ...g, checkInGuest: to };
        if (field === 'plusOne') return { ...g, checkInCompanion: to };
        return { ...g, farewellGift: to };
      })
    );

    try {
      await markArrived(rowId, field, to);
    } catch (err) {
      console.error(err);
      // Rollback on failure
      setGuests((prev) =>
        prev.map((g) => {
          if (g.id !== rowId) return g;
          if (field === 'guest') return { ...g, checkInGuest: !to };
          if (field === 'plusOne') return { ...g, checkInCompanion: !to };
          return { ...g, farewellGift: !to };
        })
      );
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          color: 'white',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundImage: `url(${backgroundLista.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <input
          type="text"
          placeholder="Search by guest, plus one, responsible, company..."
          style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255, 255, 255, 0.4)', color: 'white' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Quick filter chips */}
          <button style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '8px' }}>All</button>
          <button style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '8px' }}>Department 1</button>
        </div>
      </header>
      <main style={{ flexGrow: 1, padding: '16px' }}>
        {/* Table container */}
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', opacity: 0.1 }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#ADD8E6', backdropFilter: 'blur(4px)' }}>
              <tr>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('department')}>
                  PMZ Department
                </th>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('responsible')}>
                  PMZ Responsible
                </th>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('company')}>
                  Company
                </th>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('guestName')}>
                  Guest
                </th>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('companionName')}>
                  Plus one
                </th>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('arrivalConfirmation')}>
                  Arrival Confirmation
                </th>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('checkInGuest')}>
                  Guest CheckIn
                </th>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('checkInCompanion')}>
                  Plus one CheckIn
                </th>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('checkInTime')}>
                  CheckIn Time
                </th>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('giftReceived')}>
                  Farewell gift
                </th>
                <th style={{ border: '1px solid black', cursor: 'pointer' }} onClick={() => handleSort('giftReceivedTime')}>
                  Farewell time
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="border border-white/25 px-3 py-6 text-center text-sm text-blue-100">
                    Učitavanje gostiju…
                  </td>
                </tr>
              ) : sortedGuests.length === 0 ? (
                <tr>
                  <td colSpan={11} className="border border-white/25 px-3 py-6 text-center text-sm text-blue-100">
                    Nema rezultata za odabrane filtere.
                  </td>
                </tr>
              ) : (
                sortedGuests.map((guest) => {
                  const rowBackgroundClass = guest.giftReceived
                    ? 'bg-teal-400/80 text-slate-900'
                    : guest.checkInGuest
                    ? 'bg-emerald-400/80 text-emerald-950'
                    : 'bg-[#0d2c5f]/80 text-white';

                  return (
                    <tr key={guest.id} className={`border border-black ${guest.checkInGuest ? 'bg-green-500' : ''}`}>
                      <td className="border border-black">{guest.department}</td>
                      <td className="border border-black">{guest.responsible}</td>
                      <td className="border border-black">{guest.company}</td>
                      <td className="border border-black">{guest.guestName}</td>
                      <td className="border border-black">{guest.companionName}</td>
                      <td className="border border-black">{guest.arrivalConfirmation}</td>
                      <td className="border border-black">
                        <button
                          className="px-3 py-2 rounded-lg bg-emerald-600 text-white"
                          onClick={() => handleArrived(guest.id, 'guest', !guest.checkInGuest)}
                        >
                          {guest.checkInGuest ? 'Undo Guest' : 'Arrived (Guest)'}
                        </button>
                      </td>
                      <td className="border border-black">
                        <button
                          className="px-3 py-2 rounded-lg bg-emerald-600 text-white"
                          onClick={() => handleArrived(guest.id, 'plusOne', !guest.checkInCompanion)}
                        >
                          {guest.checkInCompanion ? 'Undo Plus one' : 'Arrived (Plus one)'}
                        </button>
                      </td>
                      <td className="border border-black">{guest.checkInTime}</td>
                      <td className="border border-black">
                        <button
                          className="px-3 py-2 rounded-lg bg-cyan-600 text-white"
                          onClick={() => handleArrived(guest.id, 'gift', !guest.giftReceived)}
                        >
                          {guest.giftReceived ? 'Undo Gift' : 'Gift handed'}
                        </button>
                      </td>
                      <td className="border border-black">{guest.giftReceivedTime}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
      <footer className="sticky bottom-0 bg-brand text-white p-4 flex justify-between items-center">
        <span>Arrived total: 10</span>
        <span>Gifts given: 5</span>
        <span className="text-green-500">Latency: Good</span>
      </footer>
    </div>
  );
};

export default ListaPage;
