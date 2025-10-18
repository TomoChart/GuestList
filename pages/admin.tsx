import dynamic from 'next/dynamic';
import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

import SearchBar from '../components/SearchBar';
import { Guest } from '../types/Guest';
import { cn } from '../lib/cn';

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
  const [uiVersion, setUiVersion] = useState<'v1' | 'v2'>('v1');
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

  const arrivalQuickFilters: { label: string; value: ColumnFilterState['arrivalConfirmation'] }[] = [
    { label: 'Sve', value: '' },
    { label: 'Yes', value: 'YES' },
    { label: 'No', value: 'NO' },
    { label: 'Unknown', value: 'UNKNOWN' },
  ];

  const variantOptions: { id: 'v1' | 'v2'; label: string }[] = [
    { id: 'v1', label: 'Verzija 1' },
    { id: 'v2', label: 'Verzija 2' },
  ];

  const variant = useMemo(() => {
    if (uiVersion === 'v1') {
      return {
        page: 'min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white',
        header: 'sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-[0_6px_16px_-8px_rgba(0,0,0,.4)]',
        headerInner: 'mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5',
        headerEyebrow: 'text-[10px] uppercase tracking-[0.4em] text-white/50',
        headerTitle: 'text-2xl font-semibold text-white',
        headerSubtitle: 'text-sm text-white/60',
        toggleShell: 'inline-flex items-center rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur',
        toggleButton: 'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60 transition hover:text-white',
        toggleButtonActive: 'bg-teal-400 text-slate-900 shadow',
        actionButton: 'rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/40 hover:bg-white/20 hover:text-white',
        actionButtonPrimary: 'border-teal-300/60 bg-teal-400/15 text-teal-100 hover:bg-teal-300 hover:text-slate-900',
        content: 'mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-8',
        section: 'rounded-3xl border border-white/15 bg-slate-950/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg',
        sectionHeading: 'text-xl font-semibold text-white',
        sectionSubheading: 'text-sm text-white/60',
        searchInput:
          'rounded-2xl border border-white/40 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/70 shadow-inner focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400/50',
        select:
          'rounded-2xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-white shadow-inner focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400/40',
        chipLabel: 'text-xs font-semibold uppercase tracking-wide text-white/60',
        hexButton:
          'relative inline-flex h-9 items-center justify-center px-4 text-sm font-semibold uppercase tracking-wide text-white/70 transition [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)] border border-white/20 bg-white/10 hover:bg-white/20 hover:text-white',
        hexButtonActive: 'bg-teal-400 text-slate-900 border-transparent shadow-lg hover:bg-teal-300',
        tableWrapper:
          'mt-6 overflow-hidden rounded-3xl border border-white/15 bg-slate-950/50 shadow-2xl shadow-black/50 backdrop-blur-lg',
        table: 'min-w-full border-collapse text-left text-sm text-white',
        thead: 'text-xs font-semibold uppercase tracking-widest text-white/70',
        theadRow: 'sticky top-0 z-10 bg-slate-950/85 backdrop-blur-xl',
        filterRow: 'bg-slate-900/60 text-white/70',
        th: 'border border-white/15 px-3 py-3 align-middle',
        thButton: 'flex items-center gap-2 text-left text-white/80 transition hover:text-white',
        filterInput:
          'w-full rounded-xl border border-white/25 bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/55 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400/40',
        filterSelect:
          'w-full rounded-xl border border-white/25 bg-white/10 px-2 py-1 text-xs text-white focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400/40',
        rowBase: 'border border-white/15 transition-colors duration-150',
        rowDefault: 'bg-slate-900/45 text-white',
        rowArrived: 'bg-emerald-400/80 text-emerald-950',
        rowGift: 'bg-teal-400/80 text-slate-900',
        cell: 'border border-white/15 px-3 py-3 text-sm align-top',
        checkbox: 'h-5 w-5 accent-teal-300',
        messageCell: 'border border-white/15 px-3 py-6 text-center text-sm text-white/70',
        chartWrapper:
          'mt-6 h-80 w-full rounded-2xl border border-white/15 bg-slate-950/40 p-4 shadow-inner shadow-black/40',
        error: 'rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100 shadow-inner',
        giftHeaderIcon: 'inline-flex items-center justify-center text-lg',
        giftHeaderLabel: 'hidden md:inline-flex',
        truncate: '',
      } as const;
    }

    return {
      page: 'min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white',
      header: 'sticky top-0 z-20 border border-white/50 bg-white/40 text-slate-900 backdrop-blur-md shadow-[0_6px_24px_-12px_rgba(15,23,42,0.6)]',
      headerInner: 'mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5',
      headerEyebrow: 'text-[10px] uppercase tracking-[0.4em] text-slate-600',
      headerTitle: 'text-2xl font-semibold text-slate-900',
      headerSubtitle: 'text-sm text-slate-700',
      toggleShell: 'inline-flex items-center rounded-full border border-white/70 bg-white/40 p-1 backdrop-blur',
      toggleButton: 'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:text-slate-900',
      toggleButtonActive: 'bg-slate-900 text-white shadow',
      actionButton: 'rounded-full border border-white/60 bg-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-800 transition hover:bg-white/50',
      actionButtonPrimary: 'border-teal-200 bg-teal-200/40 text-slate-900 hover:bg-teal-200/60',
      content: 'mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-8',
      section: 'rounded-3xl border border-white/40 bg-white/15 p-6 shadow-xl shadow-black/25 backdrop-blur-xl',
      sectionHeading: 'text-xl font-semibold text-white',
      sectionSubheading: 'text-sm text-white/70',
      searchInput:
        'rounded-2xl border border-white/40 bg-white/20 px-4 py-2 text-sm text-white placeholder:text-white/70 shadow-inner focus:border-white/70 focus:outline-none focus:ring-2 focus:ring-white/60',
      select:
        'rounded-2xl border border-white/40 bg-white/15 px-3 py-2 text-sm text-white focus:border-white/70 focus:outline-none focus:ring-2 focus:ring-white/60',
      chipLabel: 'text-xs font-semibold uppercase tracking-wide text-white/70',
      hexButton:
        'relative inline-flex h-9 items-center justify-center px-4 text-sm font-semibold uppercase tracking-wide text-white transition [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)] border border-white/40 bg-white/15 hover:bg-white/25',
      hexButtonActive: 'bg-white text-slate-900 border-white shadow-md',
      tableWrapper:
        'mt-6 overflow-hidden rounded-3xl border border-white/30 bg-white/15 shadow-2xl shadow-black/40 backdrop-blur-2xl',
      table: 'min-w-full border-collapse text-left text-sm text-white',
      thead: 'text-xs font-semibold uppercase tracking-[0.35em] text-white/80',
      theadRow: 'bg-white/25 text-white',
      filterRow: 'bg-white/15 text-white',
      th: 'border border-white/30 px-3 py-3 align-middle',
      thButton: 'flex items-center gap-2 text-left text-white transition hover:text-white/90',
      filterInput:
        'w-full rounded-xl border border-white/35 bg-white/20 px-2 py-1 text-xs text-white placeholder:text-white/60 focus:border-white/80 focus:outline-none focus:ring-2 focus:ring-white/60',
      filterSelect:
        'w-full rounded-xl border border-white/35 bg-white/20 px-2 py-1 text-xs text-white focus:border-white/80 focus:outline-none focus:ring-2 focus:ring-white/60',
      rowBase: 'border border-white/30 transition-colors duration-200 hover:bg-white/20',
      rowDefault: 'bg-white/15 text-white',
      rowArrived: 'bg-emerald-300/35 text-emerald-950',
      rowGift: 'bg-teal-300/35 text-slate-900',
      cell: 'border border-white/30 px-3 py-3 text-sm align-top',
      checkbox: 'h-5 w-5 accent-teal-200',
      messageCell: 'border border-white/30 px-3 py-6 text-center text-sm text-white/80',
      chartWrapper:
        'mt-6 h-80 w-full rounded-2xl border border-white/30 bg-white/12 p-4 shadow-inner shadow-black/40',
      error: 'rounded-2xl border border-red-300/50 bg-red-500/15 px-4 py-3 text-sm text-red-100 shadow-inner',
      giftHeaderIcon: 'inline-flex items-center justify-center text-lg',
      giftHeaderLabel: 'hidden md:inline-flex',
      truncate: 'truncate max-w-[22ch]',
    } as const;
  }, [uiVersion]);

  const renderCell = (value: string | null | undefined, fallback = '—') => {
    const normalized = value?.trim();
    const display = normalized && normalized.length > 0 ? normalized : fallback;

    return (
      <span className={cn('block', variant.truncate)} title={normalized ?? undefined}>
        {display}
      </span>
    );
  };

  const renderDateCell = (value: string | null | undefined) => {
    if (!value) {
      return renderCell(undefined);
    }

    const formatted = new Date(value).toLocaleString('hr-HR');
    return (
      <span className={cn('block', variant.truncate)} title={formatted}>
        {formatted}
      </span>
    );
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
    <div className={variant.page}>
      <header className={variant.header}>
        <div className={variant.headerInner}>
          <div>
            <p className={variant.headerEyebrow}>Guest management</p>
            <h1 className={variant.headerTitle}>Admin Dashboard</h1>
            <p className={variant.headerSubtitle}>Praćenje dolazaka, poklona i statusa gostiju u stvarnom vremenu.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={variant.toggleShell}>
              {variantOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setUiVersion(option.id)}
                  className={cn(variant.toggleButton, uiVersion === option.id && variant.toggleButtonActive)}
                  aria-pressed={uiVersion === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={handleRefresh} className={variant.actionButton}>
              Osvježi podatke
            </button>
            <button type="button" onClick={handleExport} className={cn(variant.actionButton, variant.actionButtonPrimary)}>
              Export .xlsx
            </button>
          </div>
        </div>
      </header>

      <main className={variant.content}>
        {error && <div className={variant.error}>{error}</div>}

        <section className={variant.section}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={variant.sectionHeading}>Arrivals by Department</h2>
              <p className={variant.sectionSubheading}>Vizualni pregled check-ina po PMZ odjelima.</p>
            </div>
          </div>

          {loadingStats ? (
            <p className="mt-4 text-sm text-white/70">Učitavanje grafikona…</p>
          ) : stats && stats.arrivalsByDepartment.length > 0 ? (
            <div className={variant.chartWrapper}>
              <ArrivalsByDepartmentChart data={stats.arrivalsByDepartment} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/70">Još nema podataka o dolascima.</p>
          )}
        </section>

        <section className={variant.section}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className={variant.sectionHeading}>Guest List</h2>
              <p className={variant.sectionSubheading}>Pretražite, sortirajte i filtrirajte sve stupce gostiju.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SearchBar value={query} onChange={setQuery} placeholder="Opća pretraga" className={variant.searchInput} />
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className={variant.select}
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
              className={variant.select}
            >
              <option value="">Sve odgovorne osobe</option>
              {responsiblePeople.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={variant.chipLabel}>Arrival confirmation</span>
            {arrivalQuickFilters.map((filter) => (
              <button
                key={filter.value || 'all'}
                type="button"
                onClick={() => handleFilterChange('arrivalConfirmation', filter.value)}
                className={cn(variant.hexButton, columnFilters.arrivalConfirmation === filter.value && variant.hexButtonActive)}
                aria-pressed={columnFilters.arrivalConfirmation === filter.value}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className={variant.tableWrapper}>
            <table className={variant.table}>
              <thead className={variant.thead}>
                <tr className={variant.theadRow}>
                  <th className={variant.th}>
                    <button type="button" onClick={() => handleSort('guestName')} className={variant.thButton}>
                      <span>Guest</span>
                      {sortKey === 'guestName' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th className={variant.th}>
                    <button type="button" onClick={() => handleSort('companionName')} className={variant.thButton}>
                      <span>Plus one</span>
                      {sortKey === 'companionName' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th className={variant.th}>
                    <button type="button" onClick={() => handleSort('department')} className={variant.thButton}>
                      <span>PMZ Department</span>
                      {sortKey === 'department' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th className={variant.th}>
                    <button type="button" onClick={() => handleSort('responsible')} className={variant.thButton}>
                      <span>PMZ Responsible</span>
                      {sortKey === 'responsible' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th className={variant.th}>
                    <button type="button" onClick={() => handleSort('company')} className={variant.thButton}>
                      <span>Company</span>
                      {sortKey === 'company' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th className={variant.th}>
                    <button type="button" onClick={() => handleSort('arrivalConfirmation')} className={variant.thButton}>
                      <span>Arrival Confirmation</span>
                      {sortKey === 'arrivalConfirmation' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th className={variant.th}>
                    <button type="button" onClick={() => handleSort('checkInGuest')} className={variant.thButton}>
                      <span>Guest CheckIn</span>
                      {sortKey === 'checkInGuest' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th className={variant.th}>
                    <button type="button" onClick={() => handleSort('checkInCompanion')} className={variant.thButton}>
                      <span>Plus one CheckIn</span>
                      {sortKey === 'checkInCompanion' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th className={variant.th}>
                    <button type="button" onClick={() => handleSort('checkInTime')} className={variant.thButton}>
                      <span>CheckIn Time</span>
                      {sortKey === 'checkInTime' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th className={variant.th}>
                    <button type="button" onClick={() => handleSort('giftReceived')} className={variant.thButton}>
                      <span className="sr-only md:hidden">Farewell gift</span>
                      <span className={cn('inline-flex md:hidden', variant.giftHeaderIcon)} aria-hidden>
                        🎁
                      </span>
                      <span className={variant.giftHeaderLabel}>Farewell gift</span>
                      {sortKey === 'giftReceived' && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th className={variant.th}>Farewell time</th>
                </tr>
                <tr className={variant.filterRow}>
                  <th className={variant.th}>
                    <input
                      type="text"
                      value={columnFilters.guestName}
                      onChange={(event) => handleFilterChange('guestName', event.target.value)}
                      className={variant.filterInput}
                      placeholder="Pretraži"
                    />
                  </th>
                  <th className={variant.th}>
                    <input
                      type="text"
                      value={columnFilters.companionName}
                      onChange={(event) => handleFilterChange('companionName', event.target.value)}
                      className={variant.filterInput}
                      placeholder="Pretraži"
                    />
                  </th>
                  <th className={variant.th}>
                    <input
                      type="text"
                      value={columnFilters.department}
                      onChange={(event) => handleFilterChange('department', event.target.value)}
                      className={variant.filterInput}
                      placeholder="Pretraži"
                    />
                  </th>
                  <th className={variant.th}>
                    <input
                      type="text"
                      value={columnFilters.responsible}
                      onChange={(event) => handleFilterChange('responsible', event.target.value)}
                      className={variant.filterInput}
                      placeholder="Pretraži"
                    />
                  </th>
                  <th className={variant.th}>
                    <input
                      type="text"
                      value={columnFilters.company}
                      onChange={(event) => handleFilterChange('company', event.target.value)}
                      className={variant.filterInput}
                      placeholder="Pretraži"
                    />
                  </th>
                  <th className={variant.th}>
                    <select
                      value={columnFilters.arrivalConfirmation}
                      onChange={(event) =>
                        handleFilterChange('arrivalConfirmation', event.target.value as ColumnFilterState['arrivalConfirmation'])
                      }
                      className={variant.filterSelect}
                    >
                      <option value="">Sve</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                      <option value="UNKNOWN">UNKNOWN</option>
                    </select>
                  </th>
                  <th className={variant.th}>
                    <select
                      value={columnFilters.checkInGuest}
                      onChange={(event) =>
                        handleFilterChange('checkInGuest', event.target.value as ColumnFilterState['checkInGuest'])
                      }
                      className={variant.filterSelect}
                    >
                      <option value="">Sve</option>
                      <option value="yes">Da</option>
                      <option value="no">Ne</option>
                    </select>
                  </th>
                  <th className={variant.th}>
                    <select
                      value={columnFilters.checkInCompanion}
                      onChange={(event) =>
                        handleFilterChange('checkInCompanion', event.target.value as ColumnFilterState['checkInCompanion'])
                      }
                      className={variant.filterSelect}
                    >
                      <option value="">Sve</option>
                      <option value="yes">Da</option>
                      <option value="no">Ne</option>
                    </select>
                  </th>
                  <th className={variant.th}>
                    <input
                      type="text"
                      value={columnFilters.checkInTime}
                      onChange={(event) => handleFilterChange('checkInTime', event.target.value)}
                      className={variant.filterInput}
                      placeholder="Pretraži"
                    />
                  </th>
                  <th className={variant.th}>
                    <select
                      value={columnFilters.giftReceived}
                      onChange={(event) => handleFilterChange('giftReceived', event.target.value as ColumnFilterState['giftReceived'])}
                      className={variant.filterSelect}
                    >
                      <option value="">Sve</option>
                      <option value="yes">Da</option>
                      <option value="no">Ne</option>
                    </select>
                  </th>
                  <th className={variant.th} />
                </tr>
              </thead>
              <tbody>
                {loadingGuests ? (
                  <tr>
                    <td colSpan={11} className={variant.messageCell}>
                      Učitavanje gostiju…
                    </td>
                  </tr>
                ) : sortedGuests.length === 0 ? (
                  <tr>
                    <td colSpan={11} className={variant.messageCell}>
                      Nema rezultata za odabrane filtere.
                    </td>
                  </tr>
                ) : (
                  sortedGuests.map((guest) => {
                    const rowClass = cn(
                      variant.rowBase,
                      guest.giftReceived ? variant.rowGift : guest.checkInGuest ? variant.rowArrived : variant.rowDefault,
                    );

                    return (
                      <tr key={guest.id} className={rowClass}>
                        <td className={variant.cell}>{renderCell(guest.guestName)}</td>
                        <td className={variant.cell}>{renderCell(guest.companionName)}</td>
                        <td className={variant.cell}>{renderCell(guest.department)}</td>
                        <td className={variant.cell}>{renderCell(guest.responsible)}</td>
                        <td className={variant.cell}>{renderCell(guest.company)}</td>
                        <td className={variant.cell}>{renderCell(guest.arrivalConfirmation)}</td>
                        <td className={cn(variant.cell, 'text-center')}>
                          <input
                            type="checkbox"
                            checked={guest.checkInGuest}
                            readOnly
                            className={variant.checkbox}
                            aria-label={`Guest check-in for ${guest.guestName}`}
                          />
                        </td>
                        <td className={cn(variant.cell, 'text-center')}>
                          <input
                            type="checkbox"
                            checked={guest.checkInCompanion}
                            readOnly
                            className={variant.checkbox}
                            aria-label={`Plus one check-in for ${guest.guestName}`}
                          />
                        </td>
                        <td className={variant.cell}>{renderDateCell(guest.checkInTime)}</td>
                        <td className={cn(variant.cell, 'text-center')}>
                          <input
                            type="checkbox"
                            checked={guest.giftReceived}
                            readOnly
                            className={variant.checkbox}
                            aria-label={`Farewell gift for ${guest.guestName}`}
                          />
                        </td>
                        <td className={variant.cell}>{renderDateCell(guest.giftReceivedTime)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
