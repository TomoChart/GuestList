import React, { useEffect, useMemo, useState } from 'react';
import localFont from 'next/font/local';
import backgroundLista from './background/background_lista.jpg';
import { Guest } from '../types/Guest';

const iqosRegular = localFont({
  src: '../public/fonts/IQOS-Regular.otf',
  display: 'swap',
});

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isResponsibleOpen, setIsResponsibleOpen] = useState(true);

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

  const responsibleOptions = useMemo(() => {
    return Array.from(new Set(guests.map((guest) => guest.responsible)))
      .filter((value) => value && value.trim().length > 0)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [guests]);

  const filteredGuests = useMemo(() => {
    const includesInsensitive = (value: string | undefined, search: string) =>
      (value ?? '').toLowerCase().includes(search.toLowerCase());

    const searchNeedle = searchTerm.trim().toLowerCase();

    return guests.filter((guest) => {
      if (searchNeedle) {
        const guestName = (guest.guestName ?? '').toLowerCase();
        const nameParts = guestName.split(/\s+/).filter(Boolean);
        const matchesFullName = guestName.startsWith(searchNeedle);
        const matchesAnyPart = nameParts.some((part) => part.startsWith(searchNeedle));

        if (!matchesFullName && !matchesAnyPart) {
          return false;
        }
      }

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
  }, [guests, columnFilters, searchTerm]);

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

  const actionButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 28px',
    borderRadius: '9999px',
    backgroundColor: isActive ? '#f87171' : '#d7263d',
    color: '#fff',
    border: 'none',
    fontWeight: 600,
    letterSpacing: '0.02em',
    boxShadow: '0 10px 24px rgba(215, 38, 61, 0.35)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
  });

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
    <div
      className={iqosRegular.className}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: `url(${backgroundLista.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <header
        style={{
          width: '100%',
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '32px 5% 32px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '960px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pretraga po gostu (ime ili prezime)..."
            style={{ padding: '12px 18px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255, 255, 255, 0.4)', color: 'white' }}
          />
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Quick filter chips */}
            <button
              style={{ padding: '10px 20px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '9999px', color: 'white', border: '1px solid rgba(255, 255, 255, 0.35)' }}
              onClick={() => {
                setSearchTerm('');
                setColumnFilters({ ...initialFilters });
              }}
            >
              All
            </button>
            <button
              style={{ padding: '10px 20px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '9999px', color: 'white', border: '1px solid rgba(255, 255, 255, 0.35)' }}
              onClick={() => setIsResponsibleOpen((prev) => !prev)}
            >
              PMZ Responsible
            </button>
            {isResponsibleOpen && (
              <select
                value={columnFilters.responsible}
                onChange={(event) => handleFilterChange('responsible', event.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  color: '#0d2c5f',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  minWidth: '200px',
                }}
              >
                <option value="">Svi odgovorni</option>
                {responsibleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>
      <main
        style={{
          flexGrow: 1,
          padding: '24px 5% 64px',
          boxSizing: 'border-box',
          marginTop: '-120px',
        }}
      >
        {/* Table container */}
        <div className="table-container" style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(6px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', opacity: 0.8 }}>
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
                    <tr key={guest.id} className={`border border-black ${rowBackgroundClass}`}>
                      <td className="border border-black">{guest.department}</td>
                      <td className="border border-black">{guest.responsible}</td>
                      <td className="border border-black">{guest.company}</td>
                      <td className="border border-black">{guest.guestName}</td>
                      <td className="border border-black">{guest.companionName}</td>
                      <td className="border border-black">{guest.arrivalConfirmation}</td>
                      <td className="border border-black">
                        <button
                          style={actionButtonStyle(guest.checkInGuest)}
                          onClick={() => handleArrived(guest.id, 'guest', !guest.checkInGuest)}
                        >
                          {guest.checkInGuest ? 'Undo guest' : 'Arrive guest'}
                        </button>
                      </td>
                      <td className="border border-black">
                        <button
                          style={actionButtonStyle(guest.checkInCompanion)}
                          onClick={() => handleArrived(guest.id, 'plusOne', !guest.checkInCompanion)}
                        >
                          {guest.checkInCompanion ? 'Undo plus one' : 'Arrive plus one'}
                        </button>
                      </td>
                      <td className="border border-black">{guest.checkInTime}</td>
                      <td className="border border-black">
                        <button
                          style={actionButtonStyle(guest.giftReceived)}
                          onClick={() => handleArrived(guest.id, 'gift', !guest.giftReceived)}
                        >
                          {guest.giftReceived ? 'Undo gift' : 'Gift handed'}
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
