import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

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

const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [responsible, setResponsible] = useState('');
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setStats(data);
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

    return guests.filter((guest) => {
      const matchesQuery = normalizedQuery
        ? [guest.guestName, guest.companionName, guest.company, guest.responsible]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLowerCase().includes(normalizedQuery))
        : true;

      const matchesDepartment = department ? guest.department === department : true;
      const matchesResponsible = responsible ? guest.responsible === responsible : true;

      return matchesQuery && matchesDepartment && matchesResponsible;
    });
  }, [guests, query, department, responsible]);

  const handleRefresh = () => {
    setError(null);
    fetchGuests();
    fetchStats();
  };

  const handleExport = async () => {
    if (filteredGuests.length === 0) {
      setError('There are no guests to export for the current filters.');
      return;
    }

    try {
      const XLSX = await import('xlsx');

      const worksheet = XLSX.utils.json_to_sheet(
        filteredGuests.map((guest) => ({
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

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Monitor attendance, gifts, and export guest information.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loadingGuests || loadingStats}
            >
              Refresh data
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-200"
              disabled={filteredGuests.length === 0}
            >
              Export to Excel
            </button>
          </div>
        </div>

        {error && <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Total Invited</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stats ? stats.totalInvited : '—'}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Arrived</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stats ? stats.totalArrived : '—'}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Gifts Given</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stats ? stats.totalGifts : '—'}</p>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Arrivals by Department</h2>
          {loadingStats ? (
            <p className="mt-4 text-sm text-gray-600">Loading chart…</p>
          ) : stats && stats.arrivalsByDepartment.length > 0 ? (
            <div className="mt-4 h-80 w-full">
              <ArrivalsByDepartmentChart data={stats.arrivalsByDepartment} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">No arrival data available yet.</p>
          )}
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Guest List</h2>
              <p className="text-sm text-gray-600">Filter by department, responsible person, or search by name.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <SearchBar value={query} onChange={setQuery} placeholder="Search guests" />
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All departments</option>
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={responsible}
              onChange={(event) => setResponsible(event.target.value)}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All responsible</option>
              {responsiblePeople.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
            {loadingGuests ? (
              <p className="p-4 text-sm text-gray-600">Loading guests…</p>
            ) : filteredGuests.length === 0 ? (
              <p className="p-4 text-sm text-gray-600">No guests match the selected filters.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Companion</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Responsible</th>
                    <th className="px-4 py-3">Arrival</th>
                    <th className="px-4 py-3">Check-In</th>
                    <th className="px-4 py-3">Gift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div>{guest.guestName}</div>
                        {guest.checkInTime && <div className="text-xs text-gray-500">Checked in: {guest.checkInTime}</div>}
                      </td>
                      <td className="px-4 py-3">{guest.companionName ?? '—'}</td>
                      <td className="px-4 py-3">{guest.department || '—'}</td>
                      <td className="px-4 py-3">{guest.responsible || '—'}</td>
                      <td className="px-4 py-3">{guest.arrivalConfirmation}</td>
                      <td className="px-4 py-3">
                        Gost: {guest.checkInGuest ? 'Yes' : 'No'}
                        <br />
                        Pratnja: {guest.checkInCompanion ? 'Yes' : 'No'}
                      </td>
                      <td className="px-4 py-3">
                        {guest.giftReceived ? 'Yes' : 'No'}
                        {guest.giftReceivedTime && <div className="text-xs text-gray-500">{guest.giftReceivedTime}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPage;