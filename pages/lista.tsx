import React, { useCallback, useEffect, useMemo, useState } from 'react';
import localFont from 'next/font/local';
import backgroundLista from './background/background_lista.jpg';
import { Guest } from '../types/Guest';
import { formatToZagreb } from '../lib/datetime';
import { NewGuestForm } from '../components/NewGuestForm';

const iqosRegular = localFont({
  src: '../public/fonts/IQOS-Regular.otf',
  display: 'swap',
});

type SortKey =
  | 'responsible'
  | 'company'
  | 'guestName'
  | 'companionName'
  | 'checkInGuest'
  | 'checkInCompanion'
  | 'checkInTime'
  | 'giftReceived';

type SortDirection = 'asc' | 'desc';

type ColumnFilterState = {
  responsible: string;
  company: string;
  guestName: string;
  companionName: string;
  checkInGuest: '' | 'yes' | 'no';
  checkInCompanion: '' | 'yes' | 'no';
  checkInTime: string;
  giftReceived: '' | 'yes' | 'no';
};

const initialFilters: ColumnFilterState = {
  responsible: '',
  company: '',
  guestName: '',
  companionName: '',
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isResponsibleOpen, setIsResponsibleOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'arrived' | 'expected'>('all');
  const [companionDrafts, setCompanionDrafts] = useState<Record<string, string>>({});
  const [focusedCompanionId, setFocusedCompanionId] = useState<string | null>(null);
  const [variant, setVariant] = useState<'v1' | 'v2'>('v1');
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<string[]>([]);
  const [isNewGuestModalOpen, setIsNewGuestModalOpen] = useState(false);

  const recentlyAddedSet = useMemo(() => new Set(recentlyAddedIds), [recentlyAddedIds]);

  const focusSearchInput = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const search = document.getElementById('guest-search-input');
    if (search instanceof HTMLInputElement) {
      search.focus();
    }
  }, []);

  const handleOpenNewGuestModal = useCallback(() => {
    setIsNewGuestModalOpen(true);
  }, []);

  const handleCloseNewGuestModal = useCallback(() => {
    setIsNewGuestModalOpen(false);
    setTimeout(() => {
      focusSearchInput();
    }, 0);
  }, [focusSearchInput]);

  useEffect(() => {
    if (!isNewGuestModalOpen || typeof document === 'undefined') {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isNewGuestModalOpen]);

  const theme = useMemo(() => {
    if (variant === 'v1') {
      return {
        headerCard: {
          backgroundColor: 'rgba(9, 20, 48, 0.75)',
          color: '#f8fafc',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 20px 45px rgba(8, 15, 40, 0.45)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        } satisfies React.CSSProperties,
        statusChipBase: {
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          color: '#f8fafc',
        },
        statusChipActive: {
          backgroundColor: 'rgba(34, 197, 94, 0.35)',
          color: '#bbf7d0',
          boxShadow: '0 10px 25px rgba(34, 197, 94, 0.45)',
        },
        utilityButton: {
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: '#f8fafc',
        },
        selectStyle: {
          padding: '10px 16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.45)',
          minWidth: '200px',
        } satisfies React.CSSProperties,
        searchInput: {
          padding: '12px 18px',
          borderRadius: '14px',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          color: '#f8fafc',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        } satisfies React.CSSProperties,
        tableContainer: {
          backgroundColor: 'rgba(6, 18, 43, 0.65)',
          borderRadius: '26px',
          padding: '28px',
          border: '1px solid rgba(148, 163, 184, 0.28)',
          boxShadow: '0 18px 48px rgba(8, 15, 40, 0.5)',
          backdropFilter: 'blur(8px)',
        } satisfies React.CSSProperties,
        tableStyle: {
          width: '100%',
          borderCollapse: 'collapse',
          color: '#f8fafc',
          fontSize: '0.95rem',
        } satisfies React.CSSProperties,
        theadStyle: {
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: 'rgba(13, 44, 95, 0.95)',
          boxShadow: '0 6px 16px -8px rgba(0, 0, 0, 0.4)',
        } satisfies React.CSSProperties,
        thStyle: {
          padding: '12px 16px',
          textAlign: 'left',
          borderBottom: '1px solid rgba(255, 255, 255, 0.24)',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          fontSize: '0.85rem',
          letterSpacing: '0.04em',
        } satisfies React.CSSProperties,
        tdStyle: {
          padding: '12px 16px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
          borderRight: '1px solid rgba(148, 163, 184, 0.18)',
        } satisfies React.CSSProperties,
        actionButton: (isActive: boolean, disabled?: boolean): React.CSSProperties => ({
          padding: '7px 17px',
          borderRadius: '9999px',
          backgroundColor: isActive ? 'rgba(34, 197, 94, 0.85)' : 'rgba(15, 23, 42, 0.75)',
          color: '#f8fafc',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          fontWeight: 600,
          letterSpacing: '0.03em',
          fontSize: '0.82rem',
          boxShadow: isActive
            ? '0 12px 32px rgba(34, 197, 94, 0.35)'
            : '0 12px 32px rgba(15, 23, 42, 0.45)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }),
        rowStyle: (guest: Guest): React.CSSProperties => {
          if (guest.giftReceived) {
            return {
              backgroundColor: 'rgba(20, 184, 166, 0.88)',
              color: '#082f49',
            };
          }
          if (guest.checkInGuest) {
            return {
              backgroundColor: 'rgba(34, 197, 94, 0.78)',
              color: '#022c22',
            };
          }
          return {
            backgroundColor: 'rgba(13, 44, 95, 0.78)',
            color: '#f8fafc',
          };
        },
        footerStyle: {
          backgroundColor: 'rgba(6, 18, 43, 0.85)',
          color: '#e2e8f0',
          borderTop: '1px solid rgba(148, 163, 184, 0.3)',
          backdropFilter: 'blur(6px)',
        } satisfies React.CSSProperties,
        searchInputClass: 'search-input search-input-v1',
        variantRowClass: 'data-row',
      } as const;
    }

    return {
      headerCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        color: '#0f172a',
        borderRadius: '28px',
        padding: '32px',
        boxShadow: '0 28px 60px rgba(15, 23, 42, 0.22)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.55)',
        fontWeight: 600,
      } satisfies React.CSSProperties,
      statusChipBase: {
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        border: '1px solid rgba(15, 23, 42, 0.12)',
        color: '#0f172a',
      },
      statusChipActive: {
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        color: '#f1f5f9',
        boxShadow: '0 14px 30px rgba(15, 23, 42, 0.35)',
      },
      utilityButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        color: '#0f172a',
      },
      selectStyle: {
        padding: '10px 16px',
        borderRadius: '14px',
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        color: '#0f172a',
        border: '1px solid rgba(15, 23, 42, 0.16)',
        minWidth: '220px',
      } satisfies React.CSSProperties,
      searchInput: {
        padding: '12px 18px',
        borderRadius: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        color: '#f8fafc',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
      } satisfies React.CSSProperties,
      tableContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: '28px',
        padding: '28px',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        boxShadow: '0 26px 60px rgba(15, 23, 42, 0.28)',
        backdropFilter: 'blur(18px)',
      } satisfies React.CSSProperties,
      tableStyle: {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        color: '#f8fafc',
        fontSize: '0.95rem',
      } satisfies React.CSSProperties,
      theadStyle: {
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        color: '#0f172a',
        boxShadow: '0 6px 16px -8px rgba(15, 23, 42, 0.35)',
      } satisfies React.CSSProperties,
      thStyle: {
        padding: '12px 16px',
        textAlign: 'left',
        borderBottom: '1px solid rgba(255, 255, 255, 0.45)',
        borderRight: '1px solid rgba(255, 255, 255, 0.3)',
        fontSize: '0.82rem',
        letterSpacing: '0.04em',
        color: '#0f172a',
      } satisfies React.CSSProperties,
      tdStyle: {
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
        borderRight: '1px solid rgba(255, 255, 255, 0.3)',
        backgroundColor: 'transparent',
      } satisfies React.CSSProperties,
      actionButton: (isActive: boolean, disabled?: boolean): React.CSSProperties => ({
        padding: '7px 17px',
        borderRadius: '9999px',
        backgroundColor: isActive ? 'rgba(34, 197, 94, 0.6)' : 'rgba(255, 255, 255, 0.15)',
        color: '#f8fafc',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        fontWeight: 600,
        letterSpacing: '0.03em',
        fontSize: '0.82rem',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.35)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }),
      rowStyle: (guest: Guest): React.CSSProperties => {
        if (guest.giftReceived) {
          return {
            backgroundColor: 'rgba(45, 212, 191, 0.32)',
            color: '#ecfeff',
          };
        }
        if (guest.checkInGuest) {
          return {
            backgroundColor: 'rgba(34, 197, 94, 0.28)',
            color: '#f0fdf4',
          };
        }
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          color: '#f8fafc',
        };
      },
      footerStyle: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        color: '#f8fafc',
        borderTop: '1px solid rgba(255, 255, 255, 0.35)',
        backdropFilter: 'blur(12px)',
      } satisfies React.CSSProperties,
      searchInputClass: 'search-input search-input-v2',
      variantRowClass: 'data-row variant2-row',
    } as const;
  }, [variant]);

  const errorBannerStyle = useMemo(() => {
    if (variant === 'v1') {
      return {
        marginBottom: '16px',
        padding: '12px 16px',
        borderRadius: '14px',
        backgroundColor: 'rgba(248, 113, 113, 0.2)',
        color: '#fecaca',
        border: '1px solid rgba(248, 113, 113, 0.4)',
        fontWeight: 500,
        backdropFilter: 'blur(6px)',
      } satisfies React.CSSProperties;
    }

    return {
      marginBottom: '16px',
      padding: '12px 16px',
      borderRadius: '14px',
      backgroundColor: 'rgba(248, 113, 113, 0.28)',
      color: '#fee2e2',
      border: '1px solid rgba(248, 113, 113, 0.45)',
      fontWeight: 500,
      backdropFilter: 'blur(8px)',
    } satisfies React.CSSProperties;
  }, [variant]);

  const emptyMessageStyle = useMemo(() => {
    const base: React.CSSProperties = {
      padding: '24px',
      textAlign: 'center',
      fontSize: '0.95rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
      borderRight: '1px solid rgba(255, 255, 255, 0.12)',
    };

    if (variant === 'v1') {
      return {
        ...base,
        color: '#bfdbfe',
        backgroundColor: 'rgba(13, 44, 95, 0.55)',
      } satisfies React.CSSProperties;
    }

    return {
      ...base,
      color: '#e2e8f0',
      backgroundColor: 'rgba(15, 23, 42, 0.35)',
    } satisfies React.CSSProperties;
  }, [variant]);

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

  const responsibleOptions = useMemo(() => {
    const counts = guests.reduce<Record<string, { total: number; pmzCount: number }>>((acc, guest) => {
      const responsible = guest.responsible?.trim();
      if (!responsible) {
        return acc;
      }

      const entry = acc[responsible] ?? { total: 0, pmzCount: 0 };
      entry.total += 1;
      if ((guest.company ?? '').trim().toLowerCase() === 'philip morris zagreb') {
        entry.pmzCount += 1;
      }
      acc[responsible] = entry;
      return acc;
    }, {});

    return Object.entries(counts)
      .filter(([, info]) => !(info.total === 1 && info.pmzCount === 1))
      .map(([name]) => name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [guests]);

  const filteredGuests = useMemo(() => {
    const includesInsensitive = (value: string | undefined, search: string) =>
      (value ?? '').toLowerCase().includes(search.toLowerCase());

    const searchNeedle = searchTerm.trim().toLowerCase();

    return guests.filter((guest) => {
      if (searchNeedle) {
        const guestName = (guest.guestName ?? '').toLowerCase();
        const nameParts = guestName.split(/\s+/).filter(Boolean);
        const matchesFullName = guestName.startsWith(searchNeedle);
        const matchesAnyPart = nameParts.some((part) => part.startsWith(searchNeedle));

        if (!matchesFullName && !matchesAnyPart) {
          return false;
        }
      }

      if (statusFilter === 'arrived' && !guest.checkInGuest) {
        return false;
      }

      if (statusFilter === 'expected' && guest.checkInGuest) {
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
  }, [guests, columnFilters, searchTerm, statusFilter]);

  const sortedGuests = useMemo(() => {
    const data = [...filteredGuests];

    const compare = (a: Guest, b: Guest) => {
      const isARecent = recentlyAddedSet.has(a.id);
      const isBRecent = recentlyAddedSet.has(b.id);

      if (isARecent !== isBRecent) {
        return isARecent ? -1 : 1;
      }

      const directionFactor = sortDirection === 'asc' ? 1 : -1;

      const getValue = (guest: Guest): string | number | boolean => {
        switch (sortKey) {
          case 'responsible':
            return guest.responsible.toLowerCase();
          case 'company':
            return guest.company.toLowerCase();
          case 'guestName':
            return guest.guestName.toLowerCase();
          case 'companionName':
            return (guest.companionName ?? '').toLowerCase();
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
  }, [filteredGuests, sortDirection, sortKey, recentlyAddedSet]);

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

  const getCompanionValue = (guest: Guest) => companionDrafts[guest.id] ?? guest.companionName ?? '';

  async function persistCompanionName(guest: Guest) {
    const draftValue = companionDrafts[guest.id];
    const targetValue = draftValue !== undefined ? draftValue : guest.companionName ?? '';
    const normalizedValue = targetValue.trim();
    const previousValue = guest.companionName ?? '';

    if (normalizedValue === previousValue.trim()) {
      setCompanionDrafts((prev) => {
        const next = { ...prev };
        delete next[guest.id];
        return next;
      });
      return;
    }

    setGuests((prev) =>
      prev.map((current) =>
        current.id === guest.id
          ? {
              ...current,
              companionName: normalizedValue.length > 0 ? normalizedValue : undefined,
            }
          : current
      )
    );

    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: guest.id, name: normalizedValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to save plus one');
      }

      setCompanionDrafts((prev) => {
        const next = { ...prev };
        delete next[guest.id];
        return next;
      });
    } catch (err) {
      console.error(err);
      setGuests((prev) =>
        prev.map((current) =>
          current.id === guest.id
            ? { ...current, companionName: previousValue.length > 0 ? previousValue : undefined }
            : current
        )
      );

      setCompanionDrafts((prev) => ({
        ...prev,
        [guest.id]: previousValue,
      }));
    }
  }

  // Helper for POST requests
  async function markArrived(recordId: string, field: 'guest' | 'plusOne' | 'gift', value: boolean) {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, field, value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error(data?.body || data?.message || 'Failed');
    return data;
  }

  // Optimistic handler
  async function handleArrived(rowId: string, field: 'guest' | 'plusOne' | 'gift', to: boolean) {
    const previousGuest = guests.find((guest) => guest.id === rowId);
    const optimisticTimestamp =
      to && (field === 'guest' || field === 'plusOne') ? new Date().toISOString() : undefined;

    // Optimistic UI update
    setGuests((prev) =>
      prev.map((g) => {
        if (g.id !== rowId) return g;

        const next: Guest = { ...g };

        if (field === 'guest') {
          next.checkInGuest = to;
        } else if (field === 'plusOne') {
          next.checkInCompanion = to;
        } else {
          next.giftReceived = to;
        }

        if (field === 'guest' || field === 'plusOne') {
          if (to) {
            next.checkInTime = optimisticTimestamp;
          } else {
            const guestAfter = field === 'guest' ? to : next.checkInGuest;
            const companionAfter = field === 'plusOne' ? to : next.checkInCompanion;

            if (!guestAfter && !companionAfter) {
              next.checkInTime = undefined;
            } else if (previousGuest?.checkInTime) {
              next.checkInTime = previousGuest.checkInTime;
            }
          }
        }

        return next;
      })
    );

    try {
      await markArrived(rowId, field, to);
    } catch (err) {
      console.error(err);
      // Rollback on failure
      setGuests((prev) =>
        prev.map((g) => {
          if (g.id !== rowId) return g;

          if (!previousGuest) {
            if (field === 'guest') return { ...g, checkInGuest: !to };
            if (field === 'plusOne') return { ...g, checkInCompanion: !to };
            return { ...g, giftReceived: !to };
          }

          return {
            ...g,
            checkInGuest: previousGuest.checkInGuest,
            checkInCompanion: previousGuest.checkInCompanion,
            giftReceived: previousGuest.giftReceived,
            checkInTime: previousGuest.checkInTime,
          };
        })
      );
    }
  }

  function handleGuestCreated(row: {
    id: string;
    department?: string;
    responsible?: string;
    company?: string;
    guest: string;
    plusOne?: string;
  }) {
    setGuests((prev) => [
      {
        id: row.id,
        department: row.department ?? '',
        responsible: row.responsible ?? '',
        company: row.company ?? '',
        guestName: row.guest,
        companionName: row.plusOne ? row.plusOne : undefined,
        arrivalConfirmation: 'UNKNOWN',
        checkInGuest: false,
        checkInCompanion: false,
        checkInTime: undefined,
        giftReceived: false,
        giftReceivedTime: undefined,
      },
      ...prev,
    ]);
    setRecentlyAddedIds((prev) => [row.id, ...prev.filter((id) => id !== row.id)]);
  }

  return (
    <div
      className={iqosRegular.className}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: `url(${backgroundLista.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <header
        style={{
          width: '100%',
          minHeight: '58vh',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '32px 5% 32px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1040px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {(
              [
                { label: 'Verzija 1', value: 'v1' as const },
                { label: 'Verzija 2', value: 'v2' as const },
              ] satisfies { label: string; value: 'v1' | 'v2' }[]
            ).map((option) => {
              const isActive = variant === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setVariant(option.value)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '9999px',
                    border: isActive
                      ? '1px solid rgba(255, 255, 255, 0.65)'
                      : '1px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: isActive
                      ? 'rgba(15, 23, 42, 0.75)'
                      : 'rgba(255, 255, 255, 0.15)',
                    color: isActive ? '#f8fafc' : '#e2e8f0',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease, transform 0.2s ease',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div style={theme.headerCard}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {(
                [
                  { label: 'All', value: 'all' },
                  { label: 'Arrived', value: 'arrived' },
                  { label: 'Expected', value: 'expected' },
                ] as const
              ).map((option) => {
                const isActive = statusFilter === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className="status-chip"
                    style={{
                      ...(theme.statusChipBase as React.CSSProperties),
                      ...(isActive ? (theme.statusChipActive as React.CSSProperties) : {}),
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '12px',
              }}
            >
              <button
                type="button"
                onClick={handleOpenNewGuestModal}
                className="status-chip"
                style={{
                  ...(theme.statusChipBase as React.CSSProperties),
                  ...(theme.utilityButton as React.CSSProperties),
                  fontWeight: 600,
                }}
              >
                + Dodaj gosta
              </button>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Pretraga po gostu (ime ili prezime)..."
              id="guest-search-input"
              className={theme.searchInputClass}
              style={theme.searchInput}
            />
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginTop: '16px',
              }}
            >
              <button
                className="status-chip"
                style={{
                  ...(theme.statusChipBase as React.CSSProperties),
                  ...(theme.utilityButton as React.CSSProperties),
                }}
                onClick={() => {
                  setSearchTerm('');
                  setColumnFilters({ ...initialFilters });
                  setStatusFilter('all');
                }}
              >
                Reset filters
              </button>
              <button
                className="status-chip"
                style={{
                  ...(theme.statusChipBase as React.CSSProperties),
                  ...(theme.utilityButton as React.CSSProperties),
                }}
                onClick={() => setIsResponsibleOpen((prev) => !prev)}
              >
                PMZ Responsible
              </button>
              {isResponsibleOpen && (
                <select
                  value={columnFilters.responsible}
                  onChange={(event) => handleFilterChange('responsible', event.target.value)}
                  style={theme.selectStyle}
                >
                  <option value="">Svi odgovorni</option>
                  {responsibleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </header>
      <main
        style={{
          flexGrow: 1,
          padding: '24px 5% 64px',
          boxSizing: 'border-box',
          marginTop: '-120px',
        }}
      >
        {error && <div style={errorBannerStyle}>{error}</div>}
        <div className="table-container" style={theme.tableContainer}>
          <table className="guest-table" style={theme.tableStyle}>
            <thead style={theme.theadStyle}>
              <tr>
                <th style={theme.thStyle} onClick={() => handleSort('responsible')}>
                  PMZ Responsible
                </th>
                <th style={theme.thStyle} onClick={() => handleSort('company')}>
                  Company
                </th>
                <th style={theme.thStyle} onClick={() => handleSort('guestName')}>
                  Guest name
                </th>
                <th style={theme.thStyle} onClick={() => handleSort('companionName')}>
                  Plus one name
                </th>
                <th style={theme.thStyle} onClick={() => handleSort('checkInGuest')}>
                  Guest CheckIn
                </th>
                <th style={theme.thStyle} onClick={() => handleSort('checkInCompanion')}>
                  Plus one CheckIn
                </th>
                <th style={theme.thStyle} onClick={() => handleSort('checkInTime')}>
                  CheckIn Time
                </th>
                <th
                  style={{ ...theme.thStyle, textAlign: 'center' }}
                  onClick={() => handleSort('giftReceived')}
                  aria-label="Gift status column"
                >
                  <span aria-hidden="true">🎁</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={emptyMessageStyle}>
                    Učitavanje gostiju…
                  </td>
                </tr>
              ) : sortedGuests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={emptyMessageStyle}>
                    Nema rezultata za odabrane filtere.
                  </td>
                </tr>
              ) : (
                sortedGuests.map((guest) => {
                  const rowStyle = theme.rowStyle(guest);
                  const displayCheckInTime = formatToZagreb(guest.checkInTime);
                  return (
                    <tr key={guest.id} className={theme.variantRowClass} style={rowStyle}>
                      <td style={theme.tdStyle}>
                        <span className="truncate-cell" title={guest.responsible}>
                          {guest.responsible}
                        </span>
                      </td>
                      <td style={theme.tdStyle}>
                        <span className="truncate-cell" title={guest.company}>
                          {guest.company}
                        </span>
                      </td>
                      <td style={theme.tdStyle}>
                        <span className="truncate-cell" title={guest.guestName}>
                          {guest.guestName}
                        </span>
                      </td>
                      <td style={{ ...theme.tdStyle, minWidth: '220px' }}>
                        <input
                          value={getCompanionValue(guest)}
                          onChange={(event) =>
                            setCompanionDrafts((prev) => ({ ...prev, [guest.id]: event.target.value }))
                          }
                          onFocus={() => setFocusedCompanionId(guest.id)}
                          onBlur={() => {
                            setFocusedCompanionId((prev) => (prev === guest.id ? null : prev));
                            void persistCompanionName(guest);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.currentTarget.blur();
                            }
                            if (event.key === 'Escape') {
                              setCompanionDrafts((prev) => {
                                const next = { ...prev };
                                delete next[guest.id];
                                return next;
                              });
                              event.currentTarget.blur();
                            }
                          }}
                          placeholder="Upiši ime i prezime"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border:
                              focusedCompanionId === guest.id
                                ? '1px solid rgba(15, 23, 42, 0.35)'
                                : '1px solid transparent',
                            backgroundColor:
                              focusedCompanionId === guest.id
                                ? variant === 'v2'
                                  ? 'rgba(255, 255, 255, 0.85)'
                                  : 'rgba(255, 255, 255, 0.9)'
                                : 'transparent',
                            color:
                              focusedCompanionId === guest.id
                                ? variant === 'v2'
                                  ? '#082f49'
                                  : '#0f172a'
                                : 'inherit',
                            transition: 'background-color 0.2s ease, border-color 0.2s ease',
                          }}
                        />
                      </td>
                      <td style={theme.tdStyle}>
                        <button
                          style={theme.actionButton(guest.checkInGuest)}
                          onClick={() => handleArrived(guest.id, 'guest', !guest.checkInGuest)}
                        >
                          {guest.checkInGuest ? 'Undo guest' : 'Arrival'}
                        </button>
                      </td>
                      <td style={theme.tdStyle}>
                        <button
                          style={theme.actionButton(
                            guest.checkInCompanion,
                            getCompanionValue(guest).trim().length === 0
                          )}
                          disabled={getCompanionValue(guest).trim().length === 0}
                          onClick={() =>
                            getCompanionValue(guest).trim().length > 0 &&
                            handleArrived(guest.id, 'plusOne', !guest.checkInCompanion)
                          }
                        >
                          {guest.checkInCompanion ? 'Undo plus one' : 'Arrive'}
                        </button>
                      </td>
                      <td style={theme.tdStyle}>
                        <span className="truncate-cell" title={guest.checkInTime ?? ''}>
                          {displayCheckInTime ?? guest.checkInTime ?? ''}
                        </span>
                      </td>
                      <td style={{ ...theme.tdStyle, textAlign: 'center' }}>
                        <button
                          className={`gift-button${guest.giftReceived ? ' gift-button--active' : ''}`}
                          style={theme.actionButton(guest.giftReceived)}
                          onClick={() => handleArrived(guest.id, 'gift', !guest.giftReceived)}
                          aria-label={guest.giftReceived ? 'Undo gift' : 'Gift handed'}
                        >
                          <span className="gift-icon" aria-hidden="true">
                            🎁
                          </span>
                          {guest.giftReceived && <span className="gift-label">Undo</span>}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
      <footer
        style={{
          ...theme.footerStyle,
          position: 'sticky',
          bottom: 0,
          padding: '16px 5%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span>Arrived total: 10</span>
        <span>Gifts given: 5</span>
        <span style={{ color: variant === 'v2' ? '#4ade80' : '#86efac', fontWeight: 600 }}>Latency: Good</span>
      </footer>
      {isNewGuestModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-guest-modal-title"
          onClick={handleCloseNewGuestModal}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 2000,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: 'rgba(8, 15, 40, 0.92)',
              borderRadius: '24px',
              border: '1px solid rgba(148, 163, 184, 0.35)',
              boxShadow: '0 28px 60px rgba(8, 15, 40, 0.55)',
              padding: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h2
                id="new-guest-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  color: '#f8fafc',
                  letterSpacing: '0.02em',
                }}
              >
                Dodaj gosta
              </h2>
              <button
                type="button"
                onClick={handleCloseNewGuestModal}
                aria-label="Close add guest dialog"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <NewGuestForm
              onCreated={(row) => {
                handleGuestCreated(row);
                handleCloseNewGuestModal();
              }}
              onCancel={handleCloseNewGuestModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaPage;
