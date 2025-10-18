import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import HexButton from '../components/HexButton';
import { Guest } from '../types/Guest';
import { formatLocalStamp } from '../utils/time';

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
type CheckField = 'guest' | 'plusOne' | 'gift';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch guests');
  }
  return (await response.json()) as Guest[];
};

const ListaPage: React.FC = () => {
  const { data, error, isLoading, mutate } = useSWR<Guest[]>('/api/guests', fetcher, {
    revalidateOnFocus: false,
  });
  const [guests, setGuests] = useState<Guest[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('guestName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');

  useEffect(() => {
    if (data) {
      setGuests(data);
    }
  }, [data]);

  const departments = useMemo(() => {
    const unique = new Set<string>();
    guests.forEach((guest) => {
      if (guest.department) {
        unique.add(guest.department);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [guests]);

  const filteredGuests = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    return guests.filter((guest) => {
      const matchesDepartment =
        selectedDepartment === 'All' || selectedDepartment === '' || guest.department === selectedDepartment;

      if (!matchesDepartment) {
        return false;
      }

      if (!normalizedTerm) {
        return true;
      }

      const haystack = [
        guest.department,
        guest.responsible,
        guest.company,
        guest.guestName,
        guest.companionName ?? '',
        guest.arrivalConfirmation ?? '',
        guest.checkInTime ?? '',
        guest.giftReceivedTime ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedTerm);
    });
  }, [guests, searchTerm, selectedDepartment]);

  const sortedGuests = useMemo(() => {
    const dataSet = [...filteredGuests];

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
        if (valueA === valueB) {
          return 0;
        }
        return valueA ? directionFactor : -directionFactor;
      }

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        if (valueA === valueB) {
          return 0;
        }
        return valueA > valueB ? directionFactor : -directionFactor;
      }

      return valueA.toString().localeCompare(valueB.toString(), undefined, { sensitivity: 'base' }) * directionFactor;
    };

    dataSet.sort(compare);
    return dataSet;
  }, [filteredGuests, sortDirection, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) {
      return '';
    }
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  async function markArrived(recordId: string, field: CheckField, value: boolean, clientStamp?: string) {
    const body: Record<string, unknown> = { recordId, field, value };
    if (typeof clientStamp === 'string') {
      body.clientStamp = clientStamp;
    }

    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok || !payload?.ok) {
      throw new Error(payload?.body || payload?.message || 'Failed to update record');
    }

    return payload;
  }

  async function handleArrived(rowId: string, field: CheckField, to: boolean) {
    const snapshot = guests.map((guest) => ({ ...guest }));
    const now = new Date();
    const isoNow = now.toISOString();
    const stamp = field === 'gift' ? (to ? formatLocalStamp(now) : '') : undefined;

    setGuests((prev) =>
      prev.map((guest) => {
        if (guest.id !== rowId) {
          return guest;
        }

        if (field === 'guest') {
          const shouldClearTime = !to && !guest.checkInCompanion;
          return {
            ...guest,
            checkInGuest: to,
            checkInTime: to ? isoNow : shouldClearTime ? undefined : guest.checkInTime,
          };
        }

        if (field === 'plusOne') {
          const shouldClearTime = !to && !guest.checkInGuest;
          return {
            ...guest,
            checkInCompanion: to,
            checkInTime: to ? isoNow : shouldClearTime ? undefined : guest.checkInTime,
          };
        }

        return {
          ...guest,
          giftReceived: to,
          giftReceivedTime: to ? stamp ?? '' : '',
        };
      })
    );

    try {
      await markArrived(rowId, field, to, field === 'gift' ? stamp : undefined);
      await mutate();
    } catch (err) {
      console.error(err);
      setGuests(snapshot);
    }
  }

  const isError = Boolean(error);
  const departmentChips = ['All', ...departments];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <section className="relative isolate bg-[url('/background/background_lista.jpg')] bg-cover bg-center before:absolute before:inset-0 before:bg-black/25 before:content-['']">
        <div className="relative z-10 mx-auto flex min-h-[180px] w-full max-w-7xl flex-col items-center gap-6 px-6 py-10 md:min-h-[220px]">
          <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full justify-center md:flex-1">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by guest, plus one, responsible, company..."
                className="w-full max-w-xl rounded-2xl border border-white/40 bg-white/20 px-5 py-3 text-base text-white placeholder-white/80 shadow-lg backdrop-blur-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 md:ml-auto md:justify-end">
              {departmentChips.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDepartment(dept)}
                  className={clsx(
                    'rounded-full border border-white/40 bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                    selectedDepartment === dept && 'bg-white/60 text-slate-900'
                  )}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10">
        {isError && (
          <div className="mb-6 rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Došlo je do pogreške prilikom učitavanja gostiju. Pokušajte ponovno.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr>
                {[
                  { key: 'department' as SortKey, label: 'PMZ Department' },
                  { key: 'responsible' as SortKey, label: 'PMZ Responsible' },
                  { key: 'company' as SortKey, label: 'Company' },
                  { key: 'guestName' as SortKey, label: 'Guest' },
                  { key: 'companionName' as SortKey, label: 'Plus one' },
                  { key: 'arrivalConfirmation' as SortKey, label: 'Arrival Confirmation' },
                  { key: 'checkInGuest' as SortKey, label: 'Guest CheckIn' },
                  { key: 'checkInCompanion' as SortKey, label: 'Plus one CheckIn' },
                  { key: 'checkInTime' as SortKey, label: 'CheckIn Time' },
                  { key: 'giftReceived' as SortKey, label: 'Farewell gift' },
                  { key: 'giftReceivedTime' as SortKey, label: 'Farewell time' },
                ].map((column) => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.key)}
                    className="cursor-pointer select-none border border-white/40 bg-white/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-900 backdrop-blur md:text-sm"
                    scope="col"
                  >
                    <span className="flex items-center gap-2">
                      {column.label}
                      <span className="text-xs text-slate-700">{getSortIndicator(column.key)}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="border border-white/50 px-4 py-8 text-center text-sm text-blue-100"
                  >
                    Učitavanje gostiju…
                  </td>
                </tr>
              ) : sortedGuests.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="border border-white/50 px-4 py-8 text-center text-sm text-blue-100"
                  >
                    Nema rezultata za odabrane filtere.
                  </td>
                </tr>
              ) : (
                sortedGuests.map((guest) => {
                  const hasCheckIn = guest.checkInGuest || guest.checkInCompanion;

                  return (
                    <tr
                      key={guest.id}
                      className={clsx(
                        'relative overflow-hidden transition-colors duration-150',
                        'bg-white/10 hover:bg-white/20',
                        hasCheckIn &&
                          "bg-emerald-500/15 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-emerald-500 before:content-['']",
                        guest.giftReceived &&
                          "after:pointer-events-none after:absolute after:inset-0 after:bg-cyan-500/10 after:content-['']"
                      )}
                    >
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight text-white md:text-base">
                        {guest.department}
                      </td>
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight text-white md:text-base">
                        {guest.responsible}
                      </td>
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight text-white md:text-base">
                        {guest.company}
                      </td>
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight text-white md:text-base">
                        {guest.guestName}
                      </td>
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight text-white md:text-base">
                        {guest.companionName}
                      </td>
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight text-white md:text-base">
                        {guest.arrivalConfirmation}
                      </td>
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight md:text-base">
                        <HexButton
                          label="Arrived (Guest)"
                          ariaLabel={guest.checkInGuest ? 'Undo guest arrival' : 'Mark guest arrived'}
                          isActive={guest.checkInGuest}
                          accent="emerald"
                          onClick={() => handleArrived(guest.id, 'guest', !guest.checkInGuest)}
                        />
                      </td>
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight md:text-base">
                        <HexButton
                          label="Arrived (Plus one)"
                          ariaLabel={guest.checkInCompanion ? 'Undo plus one arrival' : 'Mark plus one arrived'}
                          isActive={guest.checkInCompanion}
                          accent="emerald"
                          onClick={() => handleArrived(guest.id, 'plusOne', !guest.checkInCompanion)}
                        />
                      </td>
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight text-white md:text-base">
                        {guest.checkInTime ?? ''}
                      </td>
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight md:text-base">
                        <HexButton
                          label="Gift handed"
                          ariaLabel={guest.giftReceived ? 'Undo gift handed' : 'Mark gift handed'}
                          isActive={guest.giftReceived}
                          onClick={() => handleArrived(guest.id, 'gift', !guest.giftReceived)}
                        />
                      </td>
                      <td className="relative z-[1] border border-white/50 px-4 py-3 text-sm leading-tight text-white md:text-base">
                        {guest.giftReceivedTime ?? ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default ListaPage;
