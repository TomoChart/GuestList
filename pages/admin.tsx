import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import SearchBar from '../components/SearchBar';
import type { Guest } from '../types/Guest';

type StatsResponse = {
  totals: {
    invited: number;
    arrived: number;
    gifts: number;
  };
  arrivalsByDepartment: {
    department: string;
    arrived: number;
  }[];
};

const AdminPage: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setGuestLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();

        if (searchTerm) {
          params.append('q', searchTerm);
        }

        if (departmentFilter) {
          params.append('department', departmentFilter);
        }

        if (responsibleFilter) {
          params.append('responsible', responsibleFilter);
        }

        const queryString = params.toString();
        const response = await fetch(`/api/guests${queryString ? `?${queryString}` : ''}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch guests');
        }

        const data: Guest[] = await response.json();
        setGuests(data);

        if (!searchTerm && !departmentFilter && !responsibleFilter) {
          setAllGuests(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setGuestLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchTerm, departmentFilter, responsibleFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setStatsLoading(true);

    const loadStats = async () => {
      try {
        const response = await fetch('/api/stats', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data: StatsResponse = await response.json();
        setStats(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setStatsLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      controller.abort();
    };
  }, []);

  const departmentOptions = useMemo(() => {
    const source = allGuests.length ? allGuests : guests;
    const unique = new Set(source.map((guest) => guest.department).filter(Boolean));
    return Array.from(unique);
  }, [allGuests, guests]);

  const responsibleOptions = useMemo(() => {
    const source = allGuests.length ? allGuests : guests;
    const unique = new Set(source.map((guest) => guest.responsible).filter(Boolean));
    return Array.from(unique);
  }, [allGuests, guests]);

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const rows = guests.map((guest) => ({
      ID: guest.id,
      Guest: guest.guestName,
      Companion: guest.companionName ?? '',
      Department: guest.department,
      Responsible: guest.responsible,
      'Arrival confirmation': guest.arrivalConfirmation,
      'Guest checked in': guest.checkInGuest ? 'Yes' : 'No',
      'Companion checked in': guest.checkInCompanion ? 'Yes' : 'No',
      'Check-in time': guest.checkInTime ?? '',
      Gift: guest.giftReceived ? 'Yes' : 'No',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guests');
    XLSX.writeFile(workbook, 'guest-list.xlsx');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-8">
      <header className="space-y-4 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600">Monitor attendance and manage guest data in real time.</p>
      </header>

      <section className="max-w-6xl mx-auto grid gap-4 md:grid-cols-3">
        {['Invited', 'Arrived', 'Gifts given'].map((label, index) => {
          const value = stats?.totals;
          const numberValue =
            index === 0 ? value?.invited ?? 0 : index === 1 ? value?.arrived ?? 0 : value?.gifts ?? 0;

          return (
            <div key={label} className="bg-white rounded shadow p-6">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold">{statsLoading ? '…' : numberValue}</p>
            </div>
          );
        })}
      </section>

      <section className="max-w-6xl mx-auto bg-white rounded shadow p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search guests" />
          </div>
          <div className="flex gap-4">
            <select
              className="border px-4 py-2 rounded"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value="">All departments</option>
              {departmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="border px-4 py-2 rounded"
              value={responsibleFilter}
              onChange={(event) => setResponsibleFilter(event.target.value)}
            >
              <option value="">All responsible persons</option>
              {responsibleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="px-4 py-2 bg-blue-600 text-white rounded self-start"
        >
          Export to Excel
        </button>

        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.arrivalsByDepartment ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="arrived" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2">Guest</th>
                <th className="text-left px-4 py-2">Companion</th>
                <th className="text-left px-4 py-2">Department</th>
                <th className="text-left px-4 py-2">Responsible</th>
                <th className="text-left px-4 py-2">Guest check-in</th>
                <th className="text-left px-4 py-2">Companion check-in</th>
                <th className="text-left px-4 py-2">Gift</th>
              </tr>
            </thead>
            <tbody>
              {guestLoading ? (
                <tr>
                  <td className="px-4 py-4 text-center" colSpan={7}>
                    Loading guests…
                  </td>
                </tr>
              ) : guests.length ? (
                guests.map((guest) => (
                  <tr key={guest.id} className="border-t">
                    <td className="px-4 py-2">{guest.guestName}</td>
                    <td className="px-4 py-2">{guest.companionName ?? '—'}</td>
                    <td className="px-4 py-2">{guest.department || '—'}</td>
                    <td className="px-4 py-2">{guest.responsible || '—'}</td>
                    <td className="px-4 py-2">{guest.checkInGuest ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">{guest.checkInCompanion ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">{guest.giftReceived ? 'Yes' : 'No'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-center" colSpan={7}>
                    No guests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminPage;
