import React, { useEffect, useMemo, useState } from 'react';

import { BACKGROUND_LISTA_DATA_URI } from '@/lib/backgroundImage';
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

const ListaPage: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilterState>(initialFilters);
  const [sortKey, setSortKey] = useState<SortKey>('guestName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [checkInLoadingId, setCheckInLoadingId] = useState<string | null>(null);
  const [giftLoadingId, setGiftLoadingId] = useState<string | null>(null);

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

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url('${BACKGROUND_LISTA_DATA_URI}')` }}
    >
      <div className="min-h-screen backdrop-blur-sm bg-slate-900/30">
        <div className="mx-auto w-full max-w-7xl px-4 py-10">
          <div className="rounded-xl bg-white/85 p-6 shadow-xl">
            <h1 className="text-3xl font-semibold text-slate-900">Lista gostiju</h1>
            <p className="mt-1 text-sm text-slate-600">
              Pretražite i sortirajte goste po svim stupcima te jednostavno evidentirajte dolaske i poklone.
            </p>

            {error && <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
                <thead>
                  <tr className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleSort('department')}
                        className="flex items-center gap-2"
                      >
                        PMZ odjel
                        {sortKey === 'department' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button type="button" onClick={() => handleSort('responsible')} className="flex items-center gap-2">
                        Odgovorna osoba
                        {sortKey === 'responsible' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button type="button" onClick={() => handleSort('company')} className="flex items-center gap-2">
                        Partner tvrtka
                        {sortKey === 'company' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button type="button" onClick={() => handleSort('guestName')} className="flex items-center gap-2">
                        Gost ime i prezime
                        {sortKey === 'guestName' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleSort('companionName')}
                        className="flex items-center gap-2"
                      >
                        Pratnja
                        {sortKey === 'companionName' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleSort('arrivalConfirmation')}
                        className="flex items-center gap-2"
                      >
                        Arrival Confirmation
                        {sortKey === 'arrivalConfirmation' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button type="button" onClick={() => handleSort('checkInGuest')} className="flex items-center gap-2">
                        Check In Gost
                        {sortKey === 'checkInGuest' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleSort('checkInCompanion')}
                        className="flex items-center gap-2"
                      >
                        Check In Pratnja
                        {sortKey === 'checkInCompanion' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button type="button" onClick={() => handleSort('checkInTime')} className="flex items-center gap-2">
                        Vrijeme CheckIna
                        {sortKey === 'checkInTime' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button type="button" onClick={() => handleSort('giftReceived')} className="flex items-center gap-2">
                        Poklon
                        {sortKey === 'giftReceived' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </th>
                    <th className="px-3 py-3 text-center text-slate-500">Akcije</th>
                  </tr>
                  <tr className="bg-white text-xs">
                    <th className="px-3 py-2">
                      <input
                        type="text"
                        value={columnFilters.department}
                        onChange={(event) => handleFilterChange('department', event.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="px-3 py-2">
                      <input
                        type="text"
                        value={columnFilters.responsible}
                        onChange={(event) => handleFilterChange('responsible', event.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="px-3 py-2">
                      <input
                        type="text"
                        value={columnFilters.company}
                        onChange={(event) => handleFilterChange('company', event.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="px-3 py-2">
                      <input
                        type="text"
                        value={columnFilters.guestName}
                        onChange={(event) => handleFilterChange('guestName', event.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="px-3 py-2">
                      <input
                        type="text"
                        value={columnFilters.companionName}
                        onChange={(event) => handleFilterChange('companionName', event.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="px-3 py-2">
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
                    <th className="px-3 py-2">
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
                    <th className="px-3 py-2">
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
                    <th className="px-3 py-2">
                      <input
                        type="text"
                        value={columnFilters.checkInTime}
                        onChange={(event) => handleFilterChange('checkInTime', event.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Pretraži"
                      />
                    </th>
                    <th className="px-3 py-2">
                      <select
                        value={columnFilters.giftReceived}
                        onChange={(event) =>
                          handleFilterChange('giftReceived', event.target.value as ColumnFilterState['giftReceived'])
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Sve</option>
                        <option value="yes">Da</option>
                        <option value="no">Ne</option>
                      </select>
                    </th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-600">
                        Učitavanje gostiju…
                      </td>
                    </tr>
                  ) : sortedGuests.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-600">
                        Nema rezultata za odabrane filtere.
                      </td>
                    </tr>
                  ) : (
                    sortedGuests.map((guest) => {
                      const isCheckInLoading = checkInLoadingId === guest.id;
                      const isGiftLoading = giftLoadingId === guest.id;

                      return (
                        <tr key={guest.id} className="bg-white/70">
                          <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-900">{guest.department || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-3">{guest.responsible || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-3">{guest.company || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-3">{guest.guestName}</td>
                          <td className="whitespace-nowrap px-3 py-3">{guest.companionName || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-3">{guest.arrivalConfirmation}</td>
                          <td className="whitespace-nowrap px-3 py-3">{guest.checkInGuest ? 'Da' : 'Ne'}</td>
                          <td className="whitespace-nowrap px-3 py-3">{guest.checkInCompanion ? 'Da' : 'Ne'}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                            {guest.checkInTime ? new Date(guest.checkInTime).toLocaleString('hr-HR') : '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">{guest.giftReceived ? 'Da' : 'Ne'}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleArrive(guest, {
                                    guestArrived: true,
                                    companionArrived: Boolean(guest.companionName),
                                  })
                                }
                                disabled={isCheckInLoading}
                                className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                              >
                                Arrived: {guest.companionName ? '2' : '1'}
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
                                  disabled={isCheckInLoading}
                                  className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                                >
                                  Arrived: 1
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
                                disabled={isCheckInLoading}
                                className="rounded bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 shadow hover:bg-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleGift(guest, !guest.giftReceived)}
                                disabled={isGiftLoading}
                                className={`rounded px-3 py-1 text-xs font-semibold shadow disabled:cursor-not-allowed ${
                                  guest.giftReceived
                                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                } ${isGiftLoading ? 'opacity-70' : ''}`}
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
  );
};

export default ListaPage;
