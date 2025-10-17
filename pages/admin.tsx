import dynamic from 'next/dynamic';
import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

import { BACKGROUND_LISTA_DATA_URI } from '@/lib/backgroundImage';
import SearchBar from '../components/SearchBar';
import { Guest } from '../types/Guest';

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
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [submittingPin, setSubmittingPin] = useState(false);
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

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const cookieRole = document.cookie
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith('role='));

    if (cookieRole === 'role=admin') {
      setHasAccess(true);
    }

    setAccessChecked(true);
  }, []);

  const fetchGuests = useCallback(async () => {
    if (!hasAccess) {
      return;
    }

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
  }, [hasAccess]);

  const fetchStats = useCallback(async () => {
    if (!hasAccess) {
      return;
    }

    setLoadingStats(true);

    try {
      const response = await fetch('/api/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data: StatsResponse = await response.json();
      setStats(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Unable to load dashboard statistics.');
    } finally {
      setLoadingStats(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) {
      return;
    }

    setError(null);
    fetchGuests();
    fetchStats();
  }, [fetchGuests, fetchStats, hasAccess]);

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
  }, [guests, query, department, responsible, columnFilters]);

  const sortedGuests = useMemo(() => {
    const data = [...filteredGuests];
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

  const handleSubmitPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pin) {
      setPinError('Unesite PIN.');
      return;
    }

    setSubmittingPin(true);
    setPinError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'admin', pin }),
      });

      if (!response.ok) {
        throw new Error('Invalid PIN');
      }

      setHasAccess(true);
      setPin('');
      setError(null);
      fetchGuests();
      fetchStats();
    } catch (pinErrorResponse) {
      console.error(pinErrorResponse);
      setPinError('PIN nije ispravan. Pokušajte ponovno.');
    } finally {
      setSubmittingPin(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url('${BACKGROUND_LISTA_DATA_URI}')` }}
    >
      <div className="min-h-screen backdrop-blur-sm bg-slate-900/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          {!accessChecked ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="rounded-xl bg-white/90 px-6 py-8 text-center text-slate-700 shadow-xl">
                Provjera pristupa…
              </div>
            </div>
          ) : hasAccess ? (
            <div className="space-y-8 rounded-xl bg-white/85 p-6 shadow-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                  <p className="mt-1 text-sm text-slate-600">Pratite dolaske, poklone i izvezite popis gostiju.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="rounded bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={loadingGuests || loadingStats}
                  >
                    Osvježi podatke
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-200"
                    disabled={sortedGuests.length === 0}
                  >
                    Export to Excel
                  </button>
                </div>
              </div>

              {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow">
                  <p className="text-sm text-slate-500">Total Invited</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stats ? stats.totalInvited : '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow">
                  <p className="text-sm text-slate-500">Arrived</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stats ? stats.totalArrived : '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow">
                  <p className="text-sm text-slate-500">Gifts Given</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stats ? stats.totalGifts : '—'}</p>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow">
                <h2 className="text-lg font-semibold text-slate-900">Arrivals by Department</h2>
                {loadingStats ? (
                  <p className="mt-4 text-sm text-slate-600">Učitavanje grafikona…</p>
                ) : stats && stats.arrivalsByDepartment.length > 0 ? (
                  <div className="mt-4 h-80 w-full">
                    <ArrivalsByDepartmentChart data={stats.arrivalsByDepartment} />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">Još nema podataka o dolascima.</p>
                )}
              </section>

              <section className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Guest List</h2>
                    <p className="text-sm text-slate-600">Pretražite i sortirajte sve stupce gostiju.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <SearchBar value={query} onChange={setQuery} placeholder="Opća pretraga" />
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Sve odgovorne osobe</option>
                    {responsiblePeople.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white/90 shadow">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
                    <thead>
                      <tr className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <th className="px-4 py-3">
                          <button type="button" onClick={() => handleSort('guestName')} className="flex items-center gap-2">
                            Gost
                            {sortKey === 'guestName' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" onClick={() => handleSort('companionName')} className="flex items-center gap-2">
                            Pratnja
                            {sortKey === 'companionName' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" onClick={() => handleSort('department')} className="flex items-center gap-2">
                            PMZ odjel
                            {sortKey === 'department' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" onClick={() => handleSort('responsible')} className="flex items-center gap-2">
                            Odgovorna osoba
                            {sortKey === 'responsible' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" onClick={() => handleSort('company')} className="flex items-center gap-2">
                            Partner tvrtka
                            {sortKey === 'company' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" onClick={() => handleSort('arrivalConfirmation')} className="flex items-center gap-2">
                            Arrival Confirmation
                            {sortKey === 'arrivalConfirmation' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" onClick={() => handleSort('checkInGuest')} className="flex items-center gap-2">
                            Check In Gost
                            {sortKey === 'checkInGuest' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" onClick={() => handleSort('checkInCompanion')} className="flex items-center gap-2">
                            Check In Pratnja
                            {sortKey === 'checkInCompanion' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" onClick={() => handleSort('checkInTime')} className="flex items-center gap-2">
                            Vrijeme CheckIna
                            {sortKey === 'checkInTime' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" onClick={() => handleSort('giftReceived')} className="flex items-center gap-2">
                            Poklon
                            {sortKey === 'giftReceived' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                      </tr>
                      <tr className="bg-white text-xs">
                        <th className="px-4 py-2">
                          <input
                            type="text"
                            value={columnFilters.guestName}
                            onChange={(event) => handleFilterChange('guestName', event.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Pretraži"
                          />
                        </th>
                        <th className="px-4 py-2">
                          <input
                            type="text"
                            value={columnFilters.companionName}
                            onChange={(event) => handleFilterChange('companionName', event.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Pretraži"
                          />
                        </th>
                        <th className="px-4 py-2">
                          <input
                            type="text"
                            value={columnFilters.department}
                            onChange={(event) => handleFilterChange('department', event.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Pretraži"
                          />
                        </th>
                        <th className="px-4 py-2">
                          <input
                            type="text"
                            value={columnFilters.responsible}
                            onChange={(event) => handleFilterChange('responsible', event.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Pretraži"
                          />
                        </th>
                        <th className="px-4 py-2">
                          <input
                            type="text"
                            value={columnFilters.company}
                            onChange={(event) => handleFilterChange('company', event.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Pretraži"
                          />
                        </th>
                        <th className="px-4 py-2">
                          <select
                            value={columnFilters.arrivalConfirmation}
                            onChange={(event) =>
                              handleFilterChange('arrivalConfirmation', event.target.value as ColumnFilterState['arrivalConfirmation'])
                            }
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Sve</option>
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                            <option value="UNKNOWN">UNKNOWN</option>
                          </select>
                        </th>
                        <th className="px-4 py-2">
                          <select
                            value={columnFilters.checkInGuest}
                            onChange={(event) =>
                              handleFilterChange('checkInGuest', event.target.value as ColumnFilterState['checkInGuest'])
                            }
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Sve</option>
                            <option value="yes">Da</option>
                            <option value="no">Ne</option>
                          </select>
                        </th>
                        <th className="px-4 py-2">
                          <select
                            value={columnFilters.checkInCompanion}
                            onChange={(event) =>
                              handleFilterChange('checkInCompanion', event.target.value as ColumnFilterState['checkInCompanion'])
                            }
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Sve</option>
                            <option value="yes">Da</option>
                            <option value="no">Ne</option>
                          </select>
                        </th>
                        <th className="px-4 py-2">
                          <input
                            type="text"
                            value={columnFilters.checkInTime}
                            onChange={(event) => handleFilterChange('checkInTime', event.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Pretraži"
                          />
                        </th>
                        <th className="px-4 py-2">
                          <select
                            value={columnFilters.giftReceived}
                            onChange={(event) => handleFilterChange('giftReceived', event.target.value as ColumnFilterState['giftReceived'])}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Sve</option>
                            <option value="yes">Da</option>
                            <option value="no">Ne</option>
                          </select>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {loadingGuests ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-600">
                            Učitavanje gostiju…
                          </td>
                        </tr>
                      ) : sortedGuests.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-600">
                            Nema rezultata za odabrane filtere.
                          </td>
                        </tr>
                      ) : (
                        sortedGuests.map((guest) => (
                          <tr key={guest.id} className="bg-white/70">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div>{guest.guestName}</div>
                              {guest.checkInTime && (
                                <div className="text-xs text-slate-500">
                                  Check-in: {new Date(guest.checkInTime).toLocaleString('hr-HR')}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">{guest.companionName ?? '—'}</td>
                            <td className="px-4 py-3">{guest.department || '—'}</td>
                            <td className="px-4 py-3">{guest.responsible || '—'}</td>
                            <td className="px-4 py-3">{guest.company || '—'}</td>
                            <td className="px-4 py-3">{guest.arrivalConfirmation}</td>
                            <td className="px-4 py-3">{guest.checkInGuest ? 'Da' : 'Ne'}</td>
                            <td className="px-4 py-3">{guest.checkInCompanion ? 'Da' : 'Ne'}</td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {guest.checkInTime ? new Date(guest.checkInTime).toLocaleString('hr-HR') : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {guest.giftReceived ? 'Da' : 'Ne'}
                              {guest.giftReceivedTime && (
                                <div className="text-xs text-slate-500">
                                  {new Date(guest.giftReceivedTime).toLocaleString('hr-HR')}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex min-h-[50vh] items-center justify-center">
              <form onSubmit={handleSubmitPin} className="w-full max-w-md space-y-4 rounded-xl bg-white/90 p-6 shadow-xl">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">Admin pristup</h1>
                  <p className="mt-1 text-sm text-slate-600">Unesite administratorski PIN za pristup nadzornoj ploči.</p>
                </div>
                <div>
                  <label htmlFor="admin-pin" className="block text-sm font-medium text-slate-700">
                    PIN
                  </label>
                  <input
                    id="admin-pin"
                    type="password"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="••••"
                    autoFocus
                  />
                </div>
                {pinError && <p className="text-sm text-red-600">{pinError}</p>}
                <button
                  type="submit"
                  disabled={submittingPin}
                  className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {submittingPin ? 'Provjera…' : 'Potvrdi PIN'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
