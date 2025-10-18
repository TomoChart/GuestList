import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HexButton from '../components/HexButton';
import { formatLocalStamp } from '../utils/time';
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
  const [searchQuery, setSearchQuery] = useState('');

  const [columnFilters, setColumnFilters] = useState<ColumnFilterState>(initialFilters);
  const [sortKey, setSortKey] = useState<SortKey>('guestName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const fetchGuests = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch('/api/guests');

        if (!response.ok) {
          throw new Error('Failed to fetch guests');
        }

        const data: Guest[] = await response.json();
        setGuests(data);
        return data;
      } catch (fetchError) {
        console.error(fetchError);
        setError('Došlo je do pogreške prilikom učitavanja gostiju. Pokušajte ponovno.');
        throw fetchError;
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchGuests().catch(() => {
      // handled via error state
    });
  }, [fetchGuests]);

  const includesInsensitive = useCallback((value: string | undefined, search: string) => (value ?? '').toLowerCase().includes(search.toLowerCase()), []);

  const filteredGuests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return guests.filter((guest) => {
      if (query) {
        const matchesQuery = [
          guest.guestName,
          guest.companionName,
          guest.responsible,
          guest.company,
          guest.department,
        ]
          .filter(Boolean)
          .some((value) => (value ?? '').toLowerCase().includes(query));

        if (!matchesQuery) {
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
  }, [columnFilters, guests, includesInsensitive, searchQuery]);

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
          case 'giftReceivedTime':
            return guest.giftReceivedTime ?? '';
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

  const departmentOptions = useMemo(() => {
    const unique = new Set<string>();
    guests.forEach((guest) => {
      if (guest.department) {
        unique.add(guest.department);
      }
    });

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [guests]);

  async function markArrived(
    recordId: string,
    field: 'guest' | 'plusOne' | 'gift',
    value: boolean,
    clientStamp?: string
  ) {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, field, value, clientStamp }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error(data?.body || data?.message || 'Failed');
    return data;
  }

  async function handleArrived(rowId: string, field: 'guest' | 'plusOne' | 'gift', to: boolean) {
    const snapshot = guests.map((guest) => ({ ...guest }));
    const shouldSetCheckIn = to && (field === 'guest' || field === 'plusOne');
    const checkInTimestamp = shouldSetCheckIn ? new Date().toISOString() : undefined;
    const giftStamp = field === 'gift' ? (to ? formatLocalStamp(new Date()) : '') : undefined;

    setGuests((prev) =>
      prev.map((guest) => {
        if (guest.id !== rowId) return guest;

        const next: Guest = { ...guest };

        if (field === 'guest') {
          next.checkInGuest = to;
          if (checkInTimestamp) {
            next.checkInTime = checkInTimestamp;
          } else if (!to && !guest.checkInCompanion) {
            next.checkInTime = undefined;
          }
        }

        if (field === 'plusOne') {
          next.checkInCompanion = to;
          if (checkInTimestamp) {
            next.checkInTime = checkInTimestamp;
          } else if (!to && !guest.checkInGuest) {
            next.checkInTime = undefined;
          }
        }

        if (field === 'gift') {
          next.giftReceived = to;
          next.giftReceivedTime = giftStamp ?? next.giftReceivedTime;
          if (!to) {
            next.giftReceivedTime = '';
          }
        }

        return next;
      })
    );

    try {
      await markArrived(rowId, field, to, field === 'gift' ? giftStamp : undefined);
      await fetchGuests({ silent: true });
    } catch (err) {
      console.error(err);
      setGuests(snapshot);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative isolate overflow-hidden bg-[url('/background/background_lista.jpg')] bg-cover bg-center before:absolute before:inset-0 before:bg-black/25 before:content-['']">
        <div className="relative z-10 mx-auto flex min-h-[180px] w-full max-w-6xl flex-col items-center gap-6 px-4 py-10 md:min-h-[220px] md:py-12">
          <input
            type="text"
            placeholder="Search by guest, plus one, responsible, company..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full max-w-xl rounded-2xl border border-white/40 bg-white/20 px-5 py-3 text-center text-base font-medium text-white placeholder-white/80 backdrop-blur-md"
          />

          <div className="flex w-full flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => handleFilterChange('department', '')}
              className={`rounded-full border border-white/40 px-4 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                columnFilters.department === ''
                  ? 'bg-white text-slate-900'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              All Departments
            </button>
            {departmentOptions.map((department) => (
              <button
                key={department}
                type="button"
                onClick={() => handleFilterChange('department', department)}
                className={`rounded-full border border-white/40 px-4 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                  columnFilters.department === department
                    ? 'bg-white text-slate-900'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {department}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/10 shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/50">
              <thead className="bg-white/30 text-slate-900">
                <tr>
                  {[
                    { key: 'department', label: 'PMZ Department' },
                    { key: 'responsible', label: 'PMZ Responsible' },
                    { key: 'company', label: 'Company' },
                    { key: 'guestName', label: 'Guest' },
                    { key: 'companionName', label: 'Plus one' },
                    { key: 'arrivalConfirmation', label: 'Arrival Confirmation' },
                    { key: 'checkInGuest', label: 'Guest CheckIn' },
                    { key: 'checkInCompanion', label: 'Plus one CheckIn' },
                    { key: 'checkInTime', label: 'CheckIn Time' },
                    { key: 'giftReceived', label: 'Farewell gift' },
                    { key: 'giftReceivedTime', label: 'Farewell time' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      scope="col"
                      onClick={() => handleSort(key as SortKey)}
                      className="cursor-pointer border border-white/40 px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/50">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-blue-100">
                      Učitavanje gostiju…
                    </td>
                  </tr>
                ) : sortedGuests.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-blue-100">
                      Nema rezultata za odabrane filtere.
                    </td>
                  </tr>
                ) : (
                  sortedGuests.map((guest) => {
                    const hasArrived = guest.checkInGuest || guest.checkInCompanion;
                    const hasGift = guest.giftReceived;

                    return (
                      <tr
                        key={guest.id}
                        className={`group relative transition-colors ${
                          hasArrived
                            ? "bg-emerald-500/15 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:bg-emerald-500 before:content-['']"
                            : ''
                        } ${
                          hasGift
                            ? "after:pointer-events-none after:absolute after:inset-0 after:bg-cyan-500/10 after:content-['']"
                            : ''
                        }`}
                      >
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          {guest.department}
                        </td>
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          {guest.responsible}
                        </td>
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          {guest.company}
                        </td>
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          {guest.guestName}
                        </td>
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          {guest.companionName ?? '—'}
                        </td>
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          {guest.arrivalConfirmation}
                        </td>
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          <HexButton
                            label="Arrived (Guest)"
                            isActive={guest.checkInGuest}
                            onClick={() => handleArrived(guest.id, 'guest', !guest.checkInGuest)}
                            accent="emerald"
                            ariaLabel={`Toggle guest arrival for ${guest.guestName}`}
                          />
                        </td>
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          <HexButton
                            label="Arrived (Plus one)"
                            isActive={guest.checkInCompanion}
                            onClick={() => handleArrived(guest.id, 'plusOne', !guest.checkInCompanion)}
                            accent="emerald"
                            ariaLabel={`Toggle plus one arrival for ${guest.guestName}`}
                          />
                        </td>
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          {guest.checkInTime ? guest.checkInTime : '—'}
                        </td>
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          <HexButton
                            label="Gift handed"
                            isActive={guest.giftReceived}
                            onClick={() => handleArrived(guest.id, 'gift', !guest.giftReceived)}
                            accent="cyan"
                            ariaLabel={`Toggle gift status for ${guest.guestName}`}
                          />
                        </td>
                        <td className="border border-white/50 bg-white/10 px-4 py-3 text-sm leading-tight text-white transition-colors group-hover:bg-white/20 md:text-base">
                          {guest.giftReceivedTime ? guest.giftReceivedTime : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ListaPage;
