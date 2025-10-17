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
  weight: '400',
  style: 'normal',
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
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

  const baseCardClasses = `rounded-[32px] shadow-2xl transition-colors duration-300 ${
    isDarkMode ? 'bg-slate-900/85 text-slate-100' : 'bg-white/85 text-slate-900'
  }`;

  const inputBaseClasses = `w-full rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
    isDarkMode
      ? 'border-slate-700 bg-slate-800/70 text-slate-100 placeholder-slate-400'
      : 'border-slate-200 bg-white/70 text-slate-700 placeholder-slate-400'
  }`;

  const headerButtonClasses =
    'flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-slate-500 transition-colors hover:text-sky-300';

  return (
    <div
      className={`${iqosBold.className} flex min-h-screen w-full items-center justify-center overflow-hidden bg-[rgb(0,115,184)] px-4 py-6`}
    >
      <div className="relative flex h-[90vh] w-full max-w-5xl items-center justify-center">
        <div className={`${baseCardClasses} flex h-full w-full flex-col overflow-hidden p-8`}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-extrabold uppercase tracking-[0.4em] text-sky-400">Lista gostiju</h1>
              <p
                className={`mt-2 max-w-xl text-sm uppercase tracking-[0.28em] ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Pretraži. Sortiraj. Check-in u jednom dodiru.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDarkMode((previous) => !previous)}
              className={`rounded-full px-5 py-3 text-sm uppercase tracking-[0.32em] shadow-lg transition-all ${
                isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isDarkMode ? 'Light' : 'Dark'} Mode
            </button>
          </div>

          {error && (
            <p
              className={`mt-5 rounded-2xl border px-4 py-3 text-center text-xs uppercase tracking-[0.25em] ${
                isDarkMode
                  ? 'border-red-900 bg-red-950/60 text-red-300'
                  : 'border-red-200 bg-red-100 text-red-700'
              }`}
            >
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-1 flex-col overflow-hidden">
            <div
              className={`grid grid-cols-5 gap-4 rounded-3xl border px-6 py-4 text-xs uppercase tracking-[0.26em] shadow-inner ${
                isDarkMode ? 'border-slate-700 bg-slate-900/60 text-slate-300' : 'border-slate-200 bg-slate-50/80 text-slate-500'
              }`}
            >
              <div className="col-span-2 flex flex-col gap-2">
                <label className="text-[10px]">PMZ Squad</label>
                <input
                  type="text"
                  value={columnFilters.department}
                  onChange={(event) => handleFilterChange('department', event.target.value)}
                  className={inputBaseClasses}
                  placeholder="Pretraži"
                />
              </div>
              <div className="col-span-3 flex flex-col gap-2 sm:col-span-1">
                <label className="text-[10px]">Lead Host</label>
                <input
                  type="text"
                  value={columnFilters.responsible}
                  onChange={(event) => handleFilterChange('responsible', event.target.value)}
                  className={inputBaseClasses}
                  placeholder="Pretraži"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <label className="text-[10px]">Partner Squad</label>
                <input
                  type="text"
                  value={columnFilters.company}
                  onChange={(event) => handleFilterChange('company', event.target.value)}
                  className={inputBaseClasses}
                  placeholder="Pretraži"
                />
              </div>
              <div className="col-span-3 flex flex-col gap-2 sm:col-span-1">
                <label className="text-[10px]">VIP Gost</label>
                <input
                  type="text"
                  value={columnFilters.guestName}
                  onChange={(event) => handleFilterChange('guestName', event.target.value)}
                  className={inputBaseClasses}
                  placeholder="Pretraži"
                />
              </div>
              <div className="col-span-3 flex flex-col gap-2 sm:col-span-1">
                <label className="text-[10px]">Crew Pratnja</label>
                <input
                  type="text"
                  value={columnFilters.companionName}
                  onChange={(event) => handleFilterChange('companionName', event.target.value)}
                  className={inputBaseClasses}
                  placeholder="Pretraži"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
                <label className="text-[10px]">Arrival Sync</label>
                <select
                  value={columnFilters.arrivalConfirmation}
                  onChange={(event) =>
                    handleFilterChange('arrivalConfirmation', event.target.value as ColumnFilterState['arrivalConfirmation'])
                  }
                  className={inputBaseClasses}
                >
                  <option value="">Sve</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                  <option value="UNKNOWN">UNKNOWN</option>
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
                <label className="text-[10px]">Gost Arrived</label>
                <select
                  value={columnFilters.checkInGuest}
                  onChange={(event) =>
                    handleFilterChange('checkInGuest', event.target.value as ColumnFilterState['checkInGuest'])
                  }
                  className={inputBaseClasses}
                >
                  <option value="">Sve</option>
                  <option value="yes">Da</option>
                  <option value="no">Ne</option>
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
                <label className="text-[10px]">Pratnja Arrived</label>
                <select
                  value={columnFilters.checkInCompanion}
                  onChange={(event) =>
                    handleFilterChange('checkInCompanion', event.target.value as ColumnFilterState['checkInCompanion'])
                  }
                  className={inputBaseClasses}
                >
                  <option value="">Sve</option>
                  <option value="yes">Da</option>
                  <option value="no">Ne</option>
                </select>
              </div>
              <div className="col-span-3 flex flex-col gap-2 sm:col-span-1">
                <label className="text-[10px]">Check-In Time</label>
                <input
                  type="text"
                  value={columnFilters.checkInTime}
                  onChange={(event) => handleFilterChange('checkInTime', event.target.value)}
                  className={inputBaseClasses}
                  placeholder="Pretraži"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
                <label className="text-[10px]">Gift Drop</label>
                <select
                  value={columnFilters.giftReceived}
                  onChange={(event) =>
                    handleFilterChange('giftReceived', event.target.value as ColumnFilterState['giftReceived'])
                  }
                  className={inputBaseClasses}
                >
                  <option value="">Sve</option>
                  <option value="yes">Da</option>
                  <option value="no">Ne</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex-1 overflow-hidden rounded-3xl border border-slate-300/60 shadow-2xl">
              <div className="h-full w-full overflow-hidden">
                <table
                  className={`h-full w-full table-fixed border-collapse text-left text-sm leading-relaxed ${
                    isDarkMode ? 'text-slate-100' : 'text-slate-800'
                  }`}
                >
                  <thead>
                    <tr className={isDarkMode ? 'bg-slate-900/60 text-slate-300' : 'bg-slate-100/80 text-slate-600'}>
                      <th className="border border-slate-300/60 px-4 py-3">
                        <button type="button" onClick={() => handleSort('department')} className={headerButtonClasses}>
                          PMZ Squad
                          {sortKey === 'department' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-slate-300/60 px-4 py-3">
                        <button type="button" onClick={() => handleSort('responsible')} className={headerButtonClasses}>
                          Lead Host
                          {sortKey === 'responsible' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-slate-300/60 px-4 py-3">
                        <button type="button" onClick={() => handleSort('company')} className={headerButtonClasses}>
                          Partner Squad
                          {sortKey === 'company' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-slate-300/60 px-4 py-3">
                        <button type="button" onClick={() => handleSort('guestName')} className={headerButtonClasses}>
                          VIP Gost
                          {sortKey === 'guestName' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-slate-300/60 px-4 py-3">
                        <button type="button" onClick={() => handleSort('companionName')} className={headerButtonClasses}>
                          Crew Pratnja
                          {sortKey === 'companionName' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-slate-300/60 px-4 py-3">
                        <button type="button" onClick={() => handleSort('arrivalConfirmation')} className={headerButtonClasses}>
                          Arrival Sync
                          {sortKey === 'arrivalConfirmation' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-slate-300/60 px-4 py-3 text-center">Gost Check-In</th>
                      <th className="border border-slate-300/60 px-4 py-3 text-center">Pratnja Check-In</th>
                      <th className="border border-slate-300/60 px-4 py-3">
                        <button type="button" onClick={() => handleSort('checkInTime')} className={headerButtonClasses}>
                          Check-In Time
                          {sortKey === 'checkInTime' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-slate-300/60 px-4 py-3 text-center">Gift Drop</th>
                      <th className="border border-slate-300/60 px-4 py-3 text-center">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="border border-slate-300/60 px-6 py-8 text-center text-xs uppercase tracking-[0.32em]"
                        >
                          Učitavanje gostiju…
                        </td>
                      </tr>
                    ) : sortedGuests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="border border-slate-300/60 px-6 py-8 text-center text-xs uppercase tracking-[0.32em]"
                        >
                          Nema rezultata za odabrane filtere.
                        </td>
                      </tr>
                    ) : (
                      sortedGuests.map((guest) => {
                        const isCheckInLoadingRow = checkInLoadingId === guest.id;
                        const isGiftLoadingRow = giftLoadingId === guest.id;
                        const guestArrivedClass = guest.checkInGuest
                          ? isDarkMode
                            ? 'bg-emerald-700/50'
                            : 'bg-emerald-200/70'
                          : isDarkMode
                          ? 'bg-slate-900/40'
                          : 'bg-white/70';

                        return (
                          <tr key={guest.id} className={`${guestArrivedClass} transition-colors`}>
                            <td className="border border-slate-300/60 px-4 py-3 text-sm font-semibold">
                              {guest.department || '—'}
                            </td>
                            <td className="border border-slate-300/60 px-4 py-3 text-sm">{guest.responsible || '—'}</td>
                            <td className="border border-slate-300/60 px-4 py-3 text-sm">{guest.company || '—'}</td>
                            <td className="border border-slate-300/60 px-4 py-3 text-base font-bold uppercase tracking-[0.12em]">
                              {guest.guestName}
                            </td>
                            <td className="border border-slate-300/60 px-4 py-3 text-sm">{guest.companionName || '—'}</td>
                            <td className="border border-slate-300/60 px-4 py-3 text-sm">{guest.arrivalConfirmation}</td>
                            <td className="border border-slate-300/60 px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                className="h-6 w-6 cursor-pointer rounded border-2 border-slate-400 bg-transparent accent-sky-300"
                                checked={guest.checkInGuest}
                                onChange={() =>
                                  handleArrive(guest, {
                                    guestArrived: !guest.checkInGuest,
                                    companionArrived: guest.checkInCompanion,
                                  })
                                }
                                disabled={isCheckInLoadingRow}
                              />
                            </td>
                            <td className="border border-slate-300/60 px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                className="h-6 w-6 cursor-pointer rounded border-2 border-slate-400 bg-transparent accent-sky-300"
                                checked={guest.checkInCompanion}
                                onChange={() =>
                                  handleArrive(guest, {
                                    guestArrived: guest.checkInGuest,
                                    companionArrived: !guest.checkInCompanion,
                                  })
                                }
                                disabled={isCheckInLoadingRow || !guest.companionName}
                              />
                            </td>
                            <td className="border border-slate-300/60 px-4 py-3 text-xs uppercase tracking-[0.18em]">
                              {guest.checkInTime ? new Date(guest.checkInTime).toLocaleString('hr-HR') : '—'}
                            </td>
                            <td className="border border-slate-300/60 px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                className="h-6 w-6 cursor-pointer rounded border-2 border-amber-400 bg-transparent accent-amber-300"
                                checked={guest.giftReceived}
                                onChange={() => handleToggleGift(guest, !guest.giftReceived)}
                                disabled={isGiftLoadingRow}
                              />
                            </td>
                            <td className="border border-slate-300/60 px-4 py-3">
                              <div className="flex flex-wrap items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleArrive(guest, {
                                      guestArrived: true,
                                      companionArrived: Boolean(guest.companionName),
                                    })
                                  }
                                  disabled={isCheckInLoadingRow}
                                  className={`rounded-full px-5 py-3 text-xs uppercase tracking-[0.28em] shadow-lg transition-colors disabled:cursor-not-allowed ${
                                    isDarkMode
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-emerald-900'
                                      : 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-200'
                                  }`}
                                >
                                  Full Check-In
                                </button>
                                {guest.companionName && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleArrive(guest, {
                                        guestArrived: true,
                                        companionArrived: false,
                                      })
                                    }
                                    disabled={isCheckInLoadingRow}
                                    className={`rounded-full px-5 py-3 text-xs uppercase tracking-[0.28em] shadow-lg transition-colors disabled:cursor-not-allowed ${
                                      isDarkMode
                                        ? 'bg-sky-600 text-white hover:bg-sky-500 disabled:bg-slate-800'
                                        : 'bg-sky-500 text-white hover:bg-sky-600 disabled:bg-slate-200'
                                    }`}
                                  >
                                    Solo Gost
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleArrive(guest, {
                                      guestArrived: false,
                                      companionArrived: false,
                                    })
                                  }
                                  disabled={isCheckInLoadingRow}
                                  className={`rounded-full px-5 py-3 text-xs uppercase tracking-[0.28em] shadow-lg transition-colors disabled:cursor-not-allowed ${
                                    isDarkMode
                                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:bg-slate-900'
                                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:bg-slate-100'
                                  }`}
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleGift(guest, !guest.giftReceived)}
                                  disabled={isGiftLoadingRow}
                                  className={`rounded-full px-5 py-3 text-xs uppercase tracking-[0.28em] shadow-lg transition-colors disabled:cursor-not-allowed ${
                                    guest.giftReceived
                                      ? isDarkMode
                                        ? 'bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:bg-amber-900'
                                        : 'bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-200'
                                      : isDarkMode
                                      ? 'bg-amber-200 text-slate-900 hover:bg-amber-300 disabled:bg-amber-900'
                                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:bg-amber-50'
                                  } ${isGiftLoadingRow ? 'opacity-70' : ''}`}
                                >
                                  {guest.giftReceived ? 'Makni poklon' : 'Dodijeli poklon'}
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
    </div>
  );
};

export default ListaPage;
