import Link from 'next/link';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

import SearchBar from '../components/SearchBar';
import { Guest } from '../types/Guest';
import KpiCard from '../components/KpiCard';
import { formatToZagreb } from '../lib/datetime';
import backgroundLista from './background/background_lista.jpg';

const ArrivalsByDepartmentChart = dynamic(() => import('../components/ArrivalsByDepartmentChart'), {
  ssr: false,
});

interface StatsResponse {
  totalInvited: number;
  totalArrived: number;
  totalGifts: number;
  arrivalsByDepartment: { department: string; arrived: number }[];
}

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

const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [responsible, setResponsible] = useState('');
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilterState>(initialFilters);
  const [sortKey, setSortKey] = useState<SortKey>('guestName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [includePMZ, setIncludePMZ] = useState(false);

  const fetchGuests = useCallback(async () => {
    setLoadingGuests(true);

    try {
      const response = await fetch('/api/guests');

      if (!response.ok) {
        throw new Error('Failed to fetch guests');
      }

      const data: Guest[] = await response.json();
      setGuests(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Unable to load guests. Please try again.');
    } finally {
      setLoadingGuests(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);

    try {
      const response = await fetch('/api/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data: StatsResponse = await response.json();
      setStats({
        ...data,
        arrivalsByDepartment: data.arrivalsByDepartment ?? [],
      });
    } catch (fetchError) {
      console.error(fetchError);
      setError('Unable to load dashboard statistics.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    setError(null);
    fetchGuests();
    fetchStats();
  }, [fetchGuests, fetchStats]);

  const departments = useMemo(() => {
    return Array.from(new Set(guests.map((guest) => guest.department).filter((value): value is string => Boolean(value)))).sort();
  }, [guests]);

  const responsiblePeople = useMemo(() => {
    return Array.from(new Set(guests.map((guest) => guest.responsible).filter((value): value is string => Boolean(value)))).sort();
  }, [guests]);

  const filteredGuests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const includesInsensitive = (value: string | undefined, search: string) =>
      (value ?? '').toLowerCase().includes(search.toLowerCase());

    return guests.filter((guest) => {
      const matchesQuery = normalizedQuery
        ? [guest.guestName, guest.companionName, guest.company, guest.responsible]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLowerCase().includes(normalizedQuery))
        : true;

      const matchesDepartment = department ? guest.department === department : true;
      const matchesResponsible = responsible ? guest.responsible === responsible : true;

      if (!(matchesQuery && matchesDepartment && matchesResponsible)) {
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

      if (columnFilters.checkInTime) {
        const formattedTime = formatToZagreb(guest.checkInTime) ?? guest.checkInTime ?? '';
        if (!includesInsensitive(formattedTime, columnFilters.checkInTime)) {
          return false;
        }
      }

      if (columnFilters.giftReceived === 'yes' && !guest.giftReceived) {
        return false;
      }

      if (columnFilters.giftReceived === 'no' && guest.giftReceived) {
        return false;
      }

      return true;
    });
  }, [guests, query, department, responsible, columnFilters]);

  const sortedGuests = useMemo(() => {
    const data = [...filteredGuests];
    const directionFactor = sortDirection === 'asc' ? 1 : -1;

    const getValue = (guest: Guest): string | number | boolean => {
      switch (sortKey) {
        case 'department':
          return guest.department?.toLowerCase() ?? '';
        case 'responsible':
          return guest.responsible?.toLowerCase() ?? '';
        case 'company':
          return guest.company?.toLowerCase() ?? '';
        case 'guestName':
          return guest.guestName?.toLowerCase() ?? '';
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

    data.sort((a, b) => {
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
    });

    return data;
  }, [filteredGuests, sortDirection, sortKey]);

  const {
    totalArrivals,
    totalInvitedGuests,
    guestCount,
    guestsWithoutCompanion,
    companionCount,
    arrivedGuestCount,
    arrivedCompanionCount,
  } = useMemo(() => {
    const relevantGuests = includePMZ
      ? guests
      : guests.filter((guest) => {
          const company = guest.company?.trim().toLowerCase() ?? '';
          return company !== 'philip morris zagreb';
        });

    let companionTotal = 0;
    let guestsWithoutCompanionTotal = 0;
    let arrivedGuestsTotal = 0;
    let arrivedCompanionsTotal = 0;

    relevantGuests.forEach((guest) => {
      if (guest.companionName) {
        companionTotal += 1;
      } else {
        guestsWithoutCompanionTotal += 1;
      }

      if (guest.checkInGuest) {
        arrivedGuestsTotal += 1;
      }

      if (guest.checkInCompanion) {
        arrivedCompanionsTotal += 1;
      }
    });

    const guestTotal = relevantGuests.length;
    const totalInvited = guestTotal + companionTotal;
    const totalArrivalsCount = arrivedGuestsTotal + arrivedCompanionsTotal;

    return {
      totalArrivals: totalArrivalsCount,
      totalInvitedGuests: totalInvited,
      guestCount: guestTotal,
      guestsWithoutCompanion: guestsWithoutCompanionTotal,
      companionCount: companionTotal,
      arrivedGuestCount: arrivedGuestsTotal,
      arrivedCompanionCount: arrivedCompanionsTotal,
    };
  }, [guests, includePMZ]);

  const pageBackgroundStyle = useMemo<React.CSSProperties>(
    () => ({
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundImage: `url(${backgroundLista.src})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }),
    []
  );

  const pmzButtonClasses = (active: boolean) =>
    [
      'inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
      active ? 'bg-white text-[#081637] shadow-lg' : 'text-white/80 hover:text-white',
    ].join(' ');

  const handleRefresh = () => {
    setError(null);
    fetchGuests();
    fetchStats();
  };

  const handleExport = async () => {
    if (sortedGuests.length === 0) {
      setError('There are no guests to export for the current filters.');
      return;
    }

    try {
      const XLSX = await import('xlsx');

      const worksheet = XLSX.utils.json_to_sheet(
        sortedGuests.map((guest) => ({
          'Guest Name': guest.guestName,
          'Companion Name': guest.companionName ?? '',
          Department: guest.department ?? '',
          'Responsible Person': guest.responsible ?? '',
          'Arrival Confirmation': guest.arrivalConfirmation,
          'Check In Guest': guest.checkInGuest ? 'Yes' : 'No',
          'Check In Companion': guest.checkInCompanion ? 'Yes' : 'No',
          'Check In Time': guest.checkInTime ?? '',
          'Gift Received': guest.giftReceived ? 'Yes' : 'No',
          'Gift Received Time': guest.giftReceivedTime ?? '',
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Guests');
      XLSX.writeFile(workbook, `guest-list-${dayjs().format('YYYY-MM-DD-HHmm')}.xlsx`);
    } catch (exportError) {
      console.error(exportError);
      setError('Export failed. Please try again.');
    }
  };

  const handleFilterChange = <K extends keyof ColumnFilterState>(key: K, value: ColumnFilterState[K]) => {
    setColumnFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="admin-page" style={pageBackgroundStyle}>
      <header className="admin-header">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/30 bg-[#081637]/80 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Admin Dashboard</h1>
              <Link
                href="/lista"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/60 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
              >
                Otvori listu gostiju
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold uppercase tracking-wide text-white/80">PMZ</span>
                <div className="inline-flex rounded-full border border-white/40 bg-white/10 p-1">
                  <button
                    type="button"
                    onClick={() => setIncludePMZ(true)}
                    className={pmzButtonClasses(includePMZ)}
                    aria-pressed={includePMZ}
                  >
                    DA
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludePMZ(false)}
                    className={pmzButtonClasses(!includePMZ)}
                    aria-pressed={!includePMZ}
                  >
                    NE
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Ukupan broj gostiju pozvanih (gosti + pratnja)"
                value={(
                  <>
                    <span className="block text-4xl font-extrabold sm:text-5xl">{totalInvitedGuests}</span>
                    {!includePMZ && (
                      <span className="block text-xs font-semibold text-white/80 sm:text-sm">
                        (bez Philip Morris Zagreb)
                      </span>
                    )}
                  </>
                )}
              />
              <KpiCard
                title="Gosti"
                value={(
                  <>
                    <span className="block text-4xl font-extrabold sm:text-5xl">{guestCount}</span>
                    <span className="block text-xs font-semibold text-white/80 sm:text-sm">
                      ({guestsWithoutCompanion} bez pratnje)
                    </span>
                  </>
                )}
              />
              <KpiCard
                title="Pratnja"
                value={<span className="block text-4xl font-extrabold sm:text-5xl">{companionCount}</span>}
              />
              <KpiCard
                title="Ukupan broj gostiju (gosti + pratnja) koji su došli"
                value={(
                  <>
                    <span className="block text-4xl font-extrabold sm:text-5xl">{totalArrivals}</span>
                    <span className="block text-xs font-semibold text-white/80 sm:text-sm">
                      ({arrivedGuestCount} gosti, {arrivedCompanionCount} pratnja)
                    </span>
                  </>
                )}
                description="Check-in gosti i pratnja"
              />
            </div>
          </div>
        </div>
      </header>
      <main className="admin-main">
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-3xl border border-red-400/60 bg-red-500/20 px-4 py-3 text-sm text-red-100 shadow-lg backdrop-blur">
              {error}
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-3xl border border-white/30 bg-[#0b1f46]/80 p-6 shadow-2xl backdrop-blur lg:col-span-1">
              <h2 className="text-xl font-semibold text-white">Arrivals by Department</h2>
              {loadingStats ? (
                <p className="mt-4 text-sm text-blue-100">Učitavanje grafikona…</p>
              ) : (stats?.arrivalsByDepartment ?? []).length > 0 ? (
                <div className="mt-4 h-80 w-full">
                  <ArrivalsByDepartmentChart data={stats?.arrivalsByDepartment ?? []} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-blue-100">Još nema podataka o dolascima.</p>
              )}
            </section>

            <section className="rounded-3xl border border-white/30 bg-[#0b1f46]/80 p-6 shadow-2xl backdrop-blur lg:col-span-2">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Guest List</h2>
                  <p className="text-sm text-blue-100">Pretražite i sortirajte sve stupce gostiju.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="inline-flex w-full items-center justify-center rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                  >
                    Osvježi podatke
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex w-full items-center justify-center rounded-full border border-emerald-300/70 bg-emerald-400/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-400/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 sm:w-auto"
                  >
                    Izvezi u Excel
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <SearchBar value={query} onChange={setQuery} placeholder="Opća pretraga" />
                <select
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  className="rounded border border-white/40 bg-[#0f2d6a] px-3 py-2 text-sm text-white shadow-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                >
                  <option value="">Svi odjeli</option>
                  {departments.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  value={responsible}
                  onChange={(event) => setResponsible(event.target.value)}
                  className="rounded border border-white/40 bg-[#0f2d6a] px-3 py-2 text-sm text-white shadow-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                >
                  <option value="">Sve odgovorne osobe</option>
                  {responsiblePeople.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border border-white/40 bg-[#0f2d6a] shadow-inner">
                <table className="min-w-full border-collapse text-left text-sm text-white">
                  <thead>
                    <tr className="bg-[#163b7d] text-xs font-semibold uppercase tracking-wide text-blue-100">
                      <th className="border border-white/30 px-3 py-3">
                        <button type="button" onClick={() => handleSort('guestName')} className="flex items-center gap-2">
                          Guest
                          {sortKey === 'guestName' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-white/30 px-3 py-3">
                        <button type="button" onClick={() => handleSort('companionName')} className="flex items-center gap-2">
                          Plus one
                          {sortKey === 'companionName' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-white/30 px-3 py-3">
                        <button type="button" onClick={() => handleSort('department')} className="flex items-center gap-2">
                          PMZ Department
                          {sortKey === 'department' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-white/30 px-3 py-3">
                        <button type="button" onClick={() => handleSort('responsible')} className="flex items-center gap-2">
                          PMZ Responsible
                          {sortKey === 'responsible' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-white/30 px-3 py-3">
                        <button type="button" onClick={() => handleSort('company')} className="flex items-center gap-2">
                          Company
                          {sortKey === 'company' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-white/30 px-3 py-3">
                        <button
                          type="button"
                          onClick={() => handleSort('arrivalConfirmation')}
                          className="flex items-center gap-2"
                        >
                          Arrival Confirmation
                          {sortKey === 'arrivalConfirmation' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-white/30 px-3 py-3">
                        <button type="button" onClick={() => handleSort('checkInGuest')} className="flex items-center gap-2">
                          Guest CheckIn
                          {sortKey === 'checkInGuest' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-white/30 px-3 py-3">
                        <button type="button" onClick={() => handleSort('checkInCompanion')} className="flex items-center gap-2">
                          Plus one CheckIn
                          {sortKey === 'checkInCompanion' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-white/30 px-3 py-3">
                        <button type="button" onClick={() => handleSort('checkInTime')} className="flex items-center gap-2">
                          CheckIn Time
                          {sortKey === 'checkInTime' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-white/30 px-3 py-3">
                        <button type="button" onClick={() => handleSort('giftReceived')} className="flex items-center gap-2">
                          Farewell gift
                          {sortKey === 'giftReceived' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                        </button>
                      </th>
                      <th className="border border-white/30 px-3 py-3">Farewell time</th>
                    </tr>
                    <tr className="bg-[#102f66] text-xs text-blue-100">
                      <th className="border border-white/25 px-3 py-2">
                        <input
                          type="text"
                          value={columnFilters.guestName}
                          onChange={(event) => handleFilterChange('guestName', event.target.value)}
                          className="w-full rounded border border-white/40 bg-white/90 px-2 py-1 text-xs text-slate-900 placeholder-blue-600 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          placeholder="Pretraži"
                        />
                      </th>
                      <th className="border border-white/25 px-3 py-2">
                        <input
                          type="text"
                          value={columnFilters.companionName}
                          onChange={(event) => handleFilterChange('companionName', event.target.value)}
                          className="w-full rounded border border-white/40 bg-white/90 px-2 py-1 text-xs text-slate-900 placeholder-blue-600 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          placeholder="Pretraži"
                        />
                      </th>
                      <th className="border border-white/25 px-3 py-2">
                        <input
                          type="text"
                          value={columnFilters.department}
                          onChange={(event) => handleFilterChange('department', event.target.value)}
                          className="w-full rounded border border-white/40 bg-white/90 px-2 py-1 text-xs text-slate-900 placeholder-blue-600 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          placeholder="Pretraži"
                        />
                      </th>
                      <th className="border border-white/25 px-3 py-2">
                        <input
                          type="text"
                          value={columnFilters.responsible}
                          onChange={(event) => handleFilterChange('responsible', event.target.value)}
                          className="w-full rounded border border-white/40 bg-white/90 px-2 py-1 text-xs text-slate-900 placeholder-blue-600 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          placeholder="Pretraži"
                        />
                      </th>
                      <th className="border border-white/25 px-3 py-2">
                        <input
                          type="text"
                          value={columnFilters.company}
                          onChange={(event) => handleFilterChange('company', event.target.value)}
                          className="w-full rounded border border-white/40 bg-white/90 px-2 py-1 text-xs text-slate-900 placeholder-blue-600 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          placeholder="Pretraži"
                        />
                      </th>
                      <th className="border border-white/25 px-3 py-2">
                        <select
                          value={columnFilters.arrivalConfirmation}
                          onChange={(event) =>
                            handleFilterChange('arrivalConfirmation', event.target.value as ColumnFilterState['arrivalConfirmation'])
                          }
                          className="w-full rounded border border-white/40 bg-white/90 px-2 py-1 text-xs text-slate-900 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        >
                          <option value="">Sve</option>
                          <option value="YES">YES</option>
                          <option value="NO">NO</option>
                          <option value="UNKNOWN">UNKNOWN</option>
                        </select>
                      </th>
                      <th className="border border-white/25 px-3 py-2">
                        <select
                          value={columnFilters.checkInGuest}
                          onChange={(event) =>
                            handleFilterChange('checkInGuest', event.target.value as ColumnFilterState['checkInGuest'])
                          }
                          className="w-full rounded border border-white/40 bg-white/90 px-2 py-1 text-xs text-slate-900 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        >
                          <option value="">Sve</option>
                          <option value="yes">Da</option>
                          <option value="no">Ne</option>
                        </select>
                      </th>
                      <th className="border border-white/25 px-3 py-2">
                        <select
                          value={columnFilters.checkInCompanion}
                          onChange={(event) =>
                            handleFilterChange('checkInCompanion', event.target.value as ColumnFilterState['checkInCompanion'])
                          }
                          className="w-full rounded border border-white/40 bg-white/90 px-2 py-1 text-xs text-slate-900 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        >
                          <option value="">Sve</option>
                          <option value="yes">Da</option>
                          <option value="no">Ne</option>
                        </select>
                      </th>
                      <th className="border border-white/25 px-3 py-2">
                        <input
                          type="text"
                          value={columnFilters.checkInTime}
                          onChange={(event) => handleFilterChange('checkInTime', event.target.value)}
                          className="w-full rounded border border-white/40 bg-white/90 px-2 py-1 text-xs text-slate-900 placeholder-blue-600 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          placeholder="Pretraži"
                        />
                      </th>
                      <th className="border border-white/25 px-3 py-2">
                        <select
                          value={columnFilters.giftReceived}
                          onChange={(event) => handleFilterChange('giftReceived', event.target.value as ColumnFilterState['giftReceived'])}
                          className="w-full rounded border border-white/40 bg-white/90 px-2 py-1 text-xs text-slate-900 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        >
                          <option value="">Sve</option>
                          <option value="yes">Da</option>
                          <option value="no">Ne</option>
                        </select>
                      </th>
                      <th className="border border-white/25 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {loadingGuests ? (
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
                          <tr key={guest.id} className={`transition-colors duration-150 ${rowBackgroundClass}`}>
                            <td className="border border-white/25 px-3 py-3 font-medium">{guest.guestName}</td>
                            <td className="border border-white/25 px-3 py-3">{guest.companionName ?? '—'}</td>
                            <td className="border border-white/25 px-3 py-3">{guest.department || '—'}</td>
                            <td className="border border-white/25 px-3 py-3">{guest.responsible || '—'}</td>
                            <td className="border border-white/25 px-3 py-3">{guest.company || '—'}</td>
                            <td className="border border-white/25 px-3 py-3">{guest.arrivalConfirmation}</td>
                            <td className="border border-white/25 px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={guest.checkInGuest}
                                readOnly
                                className="h-5 w-5 accent-emerald-500"
                                aria-label={`Guest check-in for ${guest.guestName}`}
                              />
                            </td>
                            <td className="border border-white/25 px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={guest.checkInCompanion}
                                readOnly
                                className="h-5 w-5 accent-sky-400"
                                aria-label={`Plus one check-in for ${guest.guestName}`}
                              />
                            </td>
                            <td className="border border-white/25 px-3 py-3 text-xs">
                              {formatToZagreb(guest.checkInTime) ?? '—'}
                            </td>
                            <td className="border border-white/25 px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={guest.giftReceived}
                                readOnly
                                className="h-5 w-5 accent-teal-500"
                                aria-label={`Farewell gift for ${guest.guestName}`}
                              />
                            </td>
                            <td className="border border-white/25 px-3 py-3 text-xs">
                              {formatToZagreb(guest.giftReceivedTime) ?? '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
