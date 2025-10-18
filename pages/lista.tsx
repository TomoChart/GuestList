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
  const [statusFilter, setStatusFilter] = useState<'all' | 'arrived' | 'expected'>('all');
  const [companionDrafts, setCompanionDrafts] = useState<Record<string, string>>({});

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
    const counts = guests.reduce<Record<string, { total: number; pmzCount: number }>>((acc, guest) => {
      const responsible = guest.responsible?.trim();
      if (!responsible) {
        return acc;
      }

      const entry = acc[responsible] ?? { total: 0, pmzCount: 0 };
      entry.total += 1;
      if ((guest.company ?? '').trim().toLowerCase() === 'philip morris zagreb') {
        entry.pmzCount += 1;
      }
      acc[responsible] = entry;
      return acc;
    }, {});

    return Object.entries(counts)
      .filter(([, info]) => !(info.total === 1 && info.pmzCount === 1))
      .map(([name]) => name)
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

      if (statusFilter === 'arrived' && !guest.checkInGuest) {
        return false;
      }

      if (statusFilter === 'expected' && guest.checkInGuest) {
        return false;
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
  }, [guests, columnFilters, searchTerm, statusFilter]);

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

  const actionButtonStyle = (isActive: boolean, disabled?: boolean): React.CSSProperties => ({
    padding: '10px 28px',
    borderRadius: '9999px',
    backgroundColor: isActive ? '#16a34a' : '#111827',
    color: '#fff',
    border: 'none',
    fontWeight: 600,
    letterSpacing: '0.02em',
    boxShadow: isActive ? '0 12px 30px rgba(22, 163, 74, 0.35)' : '0 12px 30px rgba(17, 24, 39, 0.45)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
  });

  const getCompanionValue = (guest: Guest) => companionDrafts[guest.id] ?? guest.companionName ?? '';

  async function persistCompanionName(guest: Guest) {
    const draftValue = companionDrafts[guest.id];
    const targetValue = draftValue !== undefined ? draftValue : guest.companionName ?? '';
    const normalizedValue = targetValue.trim();
    const previousValue = guest.companionName ?? '';

    if (normalizedValue === previousValue.trim()) {
      setCompanionDrafts((prev) => {
        const next = { ...prev };
        delete next[guest.id];
        return next;
      });
      return;
    }

    setGuests((prev) =>
      prev.map((current) =>
        current.id === guest.id
          ? {
              ...current,
              companionName: normalizedValue.length > 0 ? normalizedValue : undefined,
            }
          : current
      )
    );

    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: guest.id, name: normalizedValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to save plus one');
      }

      setCompanionDrafts((prev) => {
        const next = { ...prev };
        delete next[guest.id];
        return next;
      });
    } catch (err) {
      console.error(err);
      setGuests((prev) =>
        prev.map((current) =>
          current.id === guest.id
            ? { ...current, companionName: previousValue.length > 0 ? previousValue : undefined }
            : current
        )
      );

      setCompanionDrafts((prev) => ({
        ...prev,
        [guest.id]: previousValue,
      }));
    }
  }

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
        return { ...g, giftReceived: to };
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
          return { ...g, giftReceived: !to };
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
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {(
              [
                { label: 'All', value: 'all' },
                { label: 'Arrived', value: 'arrived' },
                { label: 'Expected', value: 'expected' },
              ] as const
            ).map((option) => {
              const isActive = statusFilter === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
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
                setStatusFilter('all');
              }}
            >
              Reset filters
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
        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(248, 113, 113, 0.25)',
              color: '#fecaca',
              border: '1px solid rgba(248, 113, 113, 0.4)',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
        {/* Table container */}
        <div className="table-container" style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(6px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', opacity: 0.9 }}>
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
                  <td colSpan={10} className="border border-white/25 px-3 py-6 text-center text-sm text-blue-100">
                    Učitavanje gostiju…
                  </td>
                </tr>
              ) : sortedGuests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="border border-white/25 px-3 py-6 text-center text-sm text-blue-100">
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
                      <td className="border border-black">
                        <input
                          value={getCompanionValue(guest)}
                          onChange={(event) =>
                            setCompanionDrafts((prev) => ({ ...prev, [guest.id]: event.target.value }))
                          }
                          onBlur={() => persistCompanionName(guest)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.currentTarget.blur();
                            }
                            if (event.key === 'Escape') {
                              setCompanionDrafts((prev) => {
                                const next = { ...prev };
                                delete next[guest.id];
                                return next;
                              });
                              event.currentTarget.blur();
                            }
                          }}
                          placeholder="Upiši ime i prezime"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid rgba(15, 23, 42, 0.45)',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            color: '#0f172a',
                          }}
                        />
                      </td>
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
                          style={actionButtonStyle(guest.checkInCompanion, getCompanionValue(guest).trim().length === 0)}
                          disabled={getCompanionValue(guest).trim().length === 0}
                          onClick={() =>
                            getCompanionValue(guest).trim().length > 0 &&
                            handleArrived(guest.id, 'plusOne', !guest.checkInCompanion)
                          }
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
