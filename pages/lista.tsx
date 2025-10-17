import React, { useEffect, useMemo, useState } from 'react';
import localFont from 'next/font/local';
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
  | 'giftReceived';

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

const iqosBold = localFont({
  src: '../public/fonts/IQOS-Bold.otf',
  display: 'swap',
});

const ListaPage: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilterState>(initialFilters);
  const [sortKey, setSortKey] = useState<SortKey>('guestName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [checkInLoadingId, setCheckInLoadingId] = useState<string | null>(null);
  const [giftLoadingId, setGiftLoadingId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
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

  const handleArrive = async (
    guest: Guest,
    { guestArrived, companionArrived }: { guestArrived: boolean; companionArrived: boolean }
  ) => {
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
      setError('Nije moguće spremiti dolazak. Pokušajte ponovno.');
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
      setError('Nije moguće spremiti poklon. Pokušajte ponovno.');
    } finally {
      setGiftLoadingId(null);
    }
  };

  const handleCheckInChange = (guest: Guest, type: 'guest' | 'companion', checked: boolean) => {
    const nextGuestArrived = type === 'guest' ? checked : guest.checkInGuest;
    const nextCompanionArrived = type === 'companion' ? checked : guest.checkInCompanion;

    void handleArrive(guest, {
      guestArrived: nextGuestArrived,
      companionArrived: nextCompanionArrived,
    });
  };

  const handleResetFilters = () => {
    setColumnFilters(initialFilters);
  };

  return (
    <div className={`${iqosBold.className} ${isDarkMode ? 'dark' : ''}`}>
      <div
        className={`flex min-h-screen items-center justify-center bg-[rgb(0,115,184)] transition-colors duration-500 ${
          isDarkMode ? 'bg-slate-950' : ''
        }`}
      >
        <div
          className={`flex h-[720px] w-[1024px] max-w-[95vw] flex-col rounded-[32px] border-2 border-white/20 px-10 py-8 shadow-2xl backdrop-blur-sm transition-colors duration-500 ${
            isDarkMode ? 'bg-slate-900/70 text-slate-100' : 'bg-white/40 text-slate-900'
          }`}
        >
          <header className="flex items-start justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.55em] text-white/80">Guestlist Experience</p>
              <h1 className="mt-3 text-4xl font-bold tracking-wide text-white drop-shadow-lg">
                Lista gostiju
              </h1>
              <p className="mt-3 max-w-xl text-base text-white/80">
                Prilagođeno za iPad – upravljajte gostima, pratite dolaske i evidentirajte poklone kroz elegantno sučelje.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDarkMode((previous) => !previous)}
              className={`h-14 min-w-[140px] rounded-full border-2 px-6 text-lg font-semibold tracking-wide transition-all duration-300 ${
                isDarkMode
                  ? 'border-white/60 bg-white/20 text-white hover:bg-white/30'
                  : 'border-white/60 bg-white/90 text-slate-900 hover:bg-white'
              }`}
            >
              {isDarkMode ? 'Day Mode' : 'Night Mode'}
            </button>
          </header>

          {error && (
            <p className="mt-4 rounded-xl border border-red-300/80 bg-red-500/20 px-4 py-3 text-sm text-red-50">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-12 rounded-full border border-white/50 bg-white/30 px-6 text-sm uppercase tracking-[0.25em] text-white shadow-lg transition hover:bg-white/50"
              >
                Reset filtriranja
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="h-12 rounded-full border border-sky-200 bg-sky-500/80 px-6 text-sm uppercase tracking-[0.25em] text-white shadow-lg transition hover:bg-sky-400"
              >
                Osvježi podatke
              </button>
            </div>
            <div className="flex flex-col items-end text-right text-xs uppercase tracking-[0.35em] text-white/60">
              <span>Optimizirano za 1024 × 768</span>
              <span>Scrollbars Hidden</span>
            </div>
          </div>

          <div
            className="mt-6 flex-1 overflow-hidden rounded-3xl border border-white/30 bg-white/10 p-4 shadow-inner transition-colors duration-500 dark:bg-slate-900/40"
          >
            <div
              className="h-full w-full overflow-auto rounded-2xl bg-white/10 p-4 transition-colors duration-500 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden dark:bg-slate-950/30"
            >
              <table className="w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="backdrop-blur-sm">
                    {[
                      { key: 'department', label: 'PMZ CREW' },
                      { key: 'responsible', label: 'HOST MAESTRO' },
                      { key: 'company', label: 'PARTNER HUB' },
                      { key: 'guestName', label: 'VIP GUEST' },
                      { key: 'companionName', label: 'PLUS ONE' },
                      { key: 'arrivalConfirmation', label: 'RSVP STATUS' },
                      { key: 'checkInGuest', label: 'GOST CHECK-IN' },
                      { key: 'checkInCompanion', label: 'PRATNJA CHECK-IN' },
                      { key: 'checkInTime', label: 'CHECK-IN CLOCK' },
                      { key: 'giftReceived', label: 'GIFT DROP' },
                      { key: 'actions', label: 'RADNJE' },
                    ].map((header) => (
                      <th
                        key={header.key}
                        className="border border-white/20 bg-white/10 px-4 py-4 text-[0.65rem] uppercase tracking-[0.4em] text-white/90 shadow-sm transition-colors duration-500 dark:border-white/10 dark:bg-white/5"
                      >
                        {header.key !== 'actions' ? (
                          <button
                            type="button"
                            onClick={() => header.key !== 'actions' && handleSort(header.key as SortKey)}
                            className="flex items-center gap-3 text-white/90 transition hover:text-white"
                          >
                            <span>{header.label}</span>
                            {header.key !== 'actions' && sortKey === header.key && (
                              <span className="text-xs">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </button>
                        ) : (
                          <span>{header.label}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                  <tr className="text-[0.7rem]">
                    <th className="border border-white/20 bg-white/20 px-3 py-3">
                      <input
                        type="text"
                        value={columnFilters.department}
                        onChange={(event) => handleFilterChange('department', event.target.value)}
                        className="w-full rounded-full border border-white/40 bg-white/40 px-3 py-2 text-[0.7rem] text-slate-900 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="border border-white/20 bg-white/20 px-3 py-3">
                      <input
                        type="text"
                        value={columnFilters.responsible}
                        onChange={(event) => handleFilterChange('responsible', event.target.value)}
                        className="w-full rounded-full border border-white/40 bg-white/40 px-3 py-2 text-[0.7rem] text-slate-900 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="border border-white/20 bg-white/20 px-3 py-3">
                      <input
                        type="text"
                        value={columnFilters.company}
                        onChange={(event) => handleFilterChange('company', event.target.value)}
                        className="w-full rounded-full border border-white/40 bg-white/40 px-3 py-2 text-[0.7rem] text-slate-900 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="border border-white/20 bg-white/20 px-3 py-3">
                      <input
                        type="text"
                        value={columnFilters.guestName}
                        onChange={(event) => handleFilterChange('guestName', event.target.value)}
                        className="w-full rounded-full border border-white/40 bg-white/40 px-3 py-2 text-[0.7rem] text-slate-900 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="border border-white/20 bg-white/20 px-3 py-3">
                      <input
                        type="text"
                        value={columnFilters.companionName}
                        onChange={(event) => handleFilterChange('companionName', event.target.value)}
                        className="w-full rounded-full border border-white/40 bg-white/40 px-3 py-2 text-[0.7rem] text-slate-900 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="border border-white/20 bg-white/20 px-3 py-3">
                      <select
                        value={columnFilters.arrivalConfirmation}
                        onChange={(event) =>
                          handleFilterChange('arrivalConfirmation', event.target.value as ColumnFilterState['arrivalConfirmation'])
                        }
                        className="w-full rounded-full border border-white/40 bg-white/40 px-3 py-2 text-[0.7rem] text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      >
                        <option value="">Sve</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                        <option value="UNKNOWN">UNKNOWN</option>
                      </select>
                    </th>
                    <th className="border border-white/20 bg-white/20 px-3 py-3">
                      <select
                        value={columnFilters.checkInGuest}
                        onChange={(event) =>
                          handleFilterChange('checkInGuest', event.target.value as ColumnFilterState['checkInGuest'])
                        }
                        className="w-full rounded-full border border-white/40 bg-white/40 px-3 py-2 text-[0.7rem] text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      >
                        <option value="">Sve</option>
                        <option value="yes">Da</option>
                        <option value="no">Ne</option>
                      </select>
                    </th>
                    <th className="border border-white/20 bg-white/20 px-3 py-3">
                      <select
                        value={columnFilters.checkInCompanion}
                        onChange={(event) =>
                          handleFilterChange('checkInCompanion', event.target.value as ColumnFilterState['checkInCompanion'])
                        }
                        className="w-full rounded-full border border-white/40 bg-white/40 px-3 py-2 text-[0.7rem] text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      >
                        <option value="">Sve</option>
                        <option value="yes">Da</option>
                        <option value="no">Ne</option>
                      </select>
                    </th>
                    <th className="border border-white/20 bg-white/20 px-3 py-3">
                      <input
                        type="text"
                        value={columnFilters.checkInTime}
                        onChange={(event) => handleFilterChange('checkInTime', event.target.value)}
                        className="w-full rounded-full border border-white/40 bg-white/40 px-3 py-2 text-[0.7rem] text-slate-900 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="border border-white/20 bg-white/20 px-3 py-3">
                      <select
                        value={columnFilters.giftReceived}
                        onChange={(event) =>
                          handleFilterChange('giftReceived', event.target.value as ColumnFilterState['giftReceived'])
                        }
                        className="w-full rounded-full border border-white/40 bg-white/40 px-3 py-2 text-[0.7rem] text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      >
                        <option value="">Sve</option>
                        <option value="yes">Da</option>
                        <option value="no">Ne</option>
                      </select>
                    </th>
                    <th className="border border-white/20 bg-white/20 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="border border-white/20 px-4 py-6 text-center text-base text-white">
                        Učitavanje gostiju…
                      </td>
                    </tr>
                  ) : sortedGuests.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="border border-white/20 px-4 py-6 text-center text-base text-white/80">
                        Nema rezultata za odabrane filtere.
                      </td>
                    </tr>
                  ) : (
                    sortedGuests.map((guest) => {
                      const isCheckInLoading = checkInLoadingId === guest.id;
                      const isGiftLoading = giftLoadingId === guest.id;

                      return (
                        <tr
                          key={guest.id}
                          className={`transition-colors duration-500 ${
                            guest.checkInGuest
                              ? 'bg-emerald-300/70 text-emerald-950 dark:bg-emerald-500/40 dark:text-white'
                              : 'bg-white/30 text-slate-900 dark:bg-slate-800/50 dark:text-slate-100'
                          }`}
                        >
                          <td className="border border-white/20 px-4 py-4 text-sm font-semibold uppercase tracking-[0.15em]">
                            {guest.department || '—'}
                          </td>
                          <td className="border border-white/20 px-4 py-4 text-sm tracking-[0.1em]">
                            {guest.responsible || '—'}
                          </td>
                          <td className="border border-white/20 px-4 py-4 text-sm tracking-[0.1em]">
                            {guest.company || '—'}
                          </td>
                          <td className="border border-white/20 px-4 py-4 text-base font-semibold">{guest.guestName}</td>
                          <td className="border border-white/20 px-4 py-4 text-base">
                            {guest.companionName || '—'}
                          </td>
                          <td className="border border-white/20 px-4 py-4 text-sm uppercase tracking-[0.25em]">
                            {guest.arrivalConfirmation}
                          </td>
                          <td className="border border-white/20 px-4 py-4">
                            <label className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={guest.checkInGuest}
                                onChange={(event) =>
                                  handleCheckInChange(guest, 'guest', event.target.checked)
                                }
                                disabled={isCheckInLoading}
                                className="h-7 w-7 cursor-pointer rounded-md border-2 border-white/60 bg-white/30 text-sky-400 transition focus:ring-0 disabled:cursor-not-allowed"
                              />
                            </label>
                          </td>
                          <td className="border border-white/20 px-4 py-4">
                            <label className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={guest.checkInCompanion}
                                onChange={(event) =>
                                  handleCheckInChange(guest, 'companion', event.target.checked)
                                }
                                disabled={isCheckInLoading || !guest.companionName}
                                className="h-7 w-7 cursor-pointer rounded-md border-2 border-white/60 bg-white/30 text-sky-400 transition focus:ring-0 disabled:cursor-not-allowed"
                              />
                            </label>
                          </td>
                          <td className="border border-white/20 px-4 py-4 text-xs uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200">
                            {guest.checkInTime ? new Date(guest.checkInTime).toLocaleString('hr-HR') : '—'}
                          </td>
                          <td className="border border-white/20 px-4 py-4">
                            <label className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={guest.giftReceived}
                                onChange={(event) => handleToggleGift(guest, event.target.checked)}
                                disabled={isGiftLoading}
                                className="h-7 w-7 cursor-pointer rounded-md border-2 border-white/60 bg-white/30 text-amber-400 transition focus:ring-0 disabled:cursor-not-allowed"
                              />
                            </label>
                          </td>
                          <td className="border border-white/20 px-4 py-4">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  handleArrive(guest, {
                                    guestArrived: true,
                                    companionArrived: Boolean(guest.companionName),
                                  })
                                }
                                disabled={isCheckInLoading}
                                className="h-12 w-36 rounded-full border border-emerald-400 bg-emerald-500/90 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed"
                              >
                                Full Check
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleArrive(guest, {
                                    guestArrived: false,
                                    companionArrived: false,
                                  })
                                }
                                disabled={isCheckInLoading}
                                className="h-12 w-32 rounded-full border border-white/50 bg-white/30 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-white/50 disabled:cursor-not-allowed"
                              >
                                Reset
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListaPage;
