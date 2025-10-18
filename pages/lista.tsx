import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import Fuse from "fuse.js";
import clsx from "clsx";
import toast from "react-hot-toast";
import useSWRInfinite from "swr/infinite";
import { useVirtualizer } from "@tanstack/react-virtual";

import FilterChips from "../components/FilterChips";
import SmartCheckbox from "../components/SmartCheckbox";
import StatsBar from "../components/StatsBar";
import {
  GuestListResponse,
  GuestRecord,
} from "../types/Guest";
import {
  normalizeText,
  updateRecordInPages,
  useDebouncedValue,
} from "../lib/guest-utils";

const PAGE_SIZE = 120;

interface FiltersState {
  department: string | null;
  responsible: string | null;
}

export default function ListaPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FiltersState>({ department: null, responsible: null });
  const [lastSuccessAt, setLastSuccessAt] = useState<Date | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(search, 250);

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams();

    if (debouncedSearch.trim()) {
      params.set("q", debouncedSearch.trim());
    }

    if (filters.department) {
      params.set("department", filters.department);
    }

    if (filters.responsible) {
      params.set("responsible", filters.responsible);
    }

    return params.toString();
  }, [debouncedSearch, filters.department, filters.responsible]);

  const fetcher = useCallback(
    async (url: string) => {
      const start = performance.now();
      const response = await fetch(url);

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to fetch guest list");
      }

      const data = (await response.json()) as GuestListResponse;
      setLatencyMs(performance.now() - start);
      setLastSuccessAt(new Date());
      return data;
    },
    []
  );

  const {
    data,
    error,
    isLoading,
    setSize,
    mutate,
    isValidating,
  } = useSWRInfinite<GuestListResponse>(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.offset) {
        return null;
      }

      const params = new URLSearchParams(baseQuery);
      params.set("limit", PAGE_SIZE.toString());

      if (pageIndex > 0 && previousPageData?.offset) {
        params.set("offset", previousPageData.offset);
      }

      return `/api/guests?${params.toString()}`;
    },
    fetcher,
    { revalidateOnFocus: false, revalidateFirstPage: false }
  );

  const records = useMemo(
    () => (data ?? []).flatMap((page) => page.records),
    [data]
  );
  const firstPage = data?.[0];
  const metrics = firstPage?.metrics;
  const departments = firstPage?.departments ?? [];
  const responsibles = firstPage?.responsibles ?? [];
  const total = firstPage?.total ?? 0;
  const hasMore = Boolean(data?.[data.length - 1]?.offset);

  const fuse = useMemo(() => {
    return new Fuse(records, {
      includeScore: true,
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "guest", weight: 0.5 },
        { name: "plusOne", weight: 0.2 },
        { name: "pmzResponsible", weight: 0.2 },
        { name: "company", weight: 0.1 },
      ],
      getFn: (obj, path) => {
        const value = (obj as Record<string, unknown>)[
          path as keyof GuestRecord
        ];

        if (Array.isArray(value)) {
          return value.map((entry) =>
            typeof entry === "string" ? normalizeText(entry) : entry
          );
        }

        return typeof value === "string" ? normalizeText(value) : value;
      },
    });
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return records;
    }

    const result = fuse.search(normalizeText(debouncedSearch));
    return result.map((item) => item.item);
  }, [debouncedSearch, fuse, records]);

  const resultCount = filteredRecords.length;

  const scrollParentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? filteredRecords.length + 1 : filteredRecords.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 76,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!hasMore || isValidating) {
      return;
    }

    const lastItem = virtualItems[virtualItems.length - 1];

    if (lastItem && lastItem.index >= filteredRecords.length - 1) {
      void setSize((current) => current + 1);
    }
  }, [filteredRecords.length, hasMore, isValidating, setSize, virtualItems]);

  useEffect(() => {
    void setSize(1);
  }, [baseQuery, setSize]);

  useEffect(() => {
    rowVirtualizer.scrollToIndex(0, { align: "start" });
    setFocusedIndex(null);
  }, [baseQuery, rowVirtualizer]);

  const handleToggleCheckIn = useCallback(
    async (record: GuestRecord, updates: { guest?: boolean; plusOne?: boolean }) => {
      const nextRecord: GuestRecord = {
        ...record,
        guestCheckIn:
          updates.guest !== undefined ? updates.guest : record.guestCheckIn,
        plusOneCheckIn:
          updates.plusOne !== undefined ? updates.plusOne : record.plusOneCheckIn,
      };

      const nextChecked =
        (nextRecord.guestCheckIn ? 1 : 0) + (nextRecord.plusOneCheckIn ? 1 : 0);
      nextRecord.checkInTime =
        nextChecked > 0 ? record.checkInTime ?? new Date().toISOString() : null;

      await mutate(
        (current) =>
          current ? updateRecordInPages(current, nextRecord, record) : current,
        { revalidate: false }
      );

      try {
        const response = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordId: record.id,
            guest: nextRecord.guestCheckIn,
            plusOne: nextRecord.plusOneCheckIn,
          }),
        });

        if (!response.ok) {
          throw new Error();
        }

        const { record: updatedRecord } = (await response.json()) as {
          record: GuestRecord;
        };

        await mutate(
          (current) =>
            current
              ? updateRecordInPages(current, updatedRecord, nextRecord)
              : current,
          { revalidate: false }
        );
        setLastSuccessAt(new Date());
        toast.success("Check-in ažuriran");
      } catch {
        toast.error("Greška pri spremanju dolaska");
        await mutate(undefined, { revalidate: true });
      }
    },
    [mutate]
  );

  const handleToggleGift = useCallback(
    async (record: GuestRecord, value: boolean) => {
      const optimisticRecord: GuestRecord = {
        ...record,
        farewellGift: value,
        farewellTime: value ? record.farewellTime ?? new Date().toISOString() : null,
      };

      await mutate(
        (current) =>
          current
            ? updateRecordInPages(current, optimisticRecord, record)
            : current,
        { revalidate: false }
      );

      try {
        const response = await fetch("/api/gift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId: record.id, value }),
        });

        if (!response.ok) {
          throw new Error();
        }

        const { record: updatedRecord } = (await response.json()) as {
          record: GuestRecord;
        };

        await mutate(
          (current) =>
            current
              ? updateRecordInPages(current, updatedRecord, optimisticRecord)
              : current,
          { revalidate: false }
        );
        setLastSuccessAt(new Date());
        toast.success("Poklon ažuriran");
      } catch {
        toast.error("Greška pri spremanju poklona");
        await mutate(undefined, { revalidate: true });
      }
    },
    [mutate]
  );

  const handleRowKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLDivElement>,
      index: number,
      record: GuestRecord
    ) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = Math.min(index + 1, filteredRecords.length - 1);
        setFocusedIndex(nextIndex);
        rowVirtualizer.scrollToIndex(nextIndex, { align: "center" });
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        setFocusedIndex(prevIndex);
        rowVirtualizer.scrollToIndex(prevIndex, { align: "center" });
      }

      if (event.key === " ") {
        event.preventDefault();
        void handleToggleCheckIn(record, { guest: !record.guestCheckIn });
      }
    },
    [filteredRecords.length, handleToggleCheckIn, rowVirtualizer]
  );

  useEffect(() => {
    if (focusedIndex == null) {
      return;
    }

    const node = scrollParentRef.current?.querySelector<HTMLElement>(
      `[data-row-index="${focusedIndex}"]`
    );

    node?.focus({ preventScroll: true });
  }, [focusedIndex, virtualItems]);

  return (
    <div className="flex min-h-screen flex-col bg-brand/40">
      <header className="sticky top-0 z-30 border-b border-white/30 bg-brand/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-6 text-center">
          <h1 className="text-2xl font-semibold tracking-[0.7em] text-white/90">
            PMZ 20 YEARS
          </h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/40 bg-white/30 p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full flex-col gap-2 md:w-1/2">
                <label className="text-sm font-medium uppercase tracking-[0.3em] text-white/70" htmlFor="search">
                  Traži goste
                </label>
                <div className="relative">
                  <input
                    id="search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Ime, pratnja, tvrtka..."
                    className="w-full rounded-xl border border-white/40 bg-white/20 px-5 py-3 text-base text-white placeholder-white/60 shadow-inner focus:outline-none focus:ring-2 focus:ring-white/60"
                  />
                  <span className="absolute inset-y-0 right-4 flex items-center text-xs uppercase tracking-[0.3em] text-white/60">
                    {resultCount}/{total}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-white">
                <FilterChips
                  label="Odjel"
                  options={departments}
                  value={filters.department}
                  onSelect={(value) =>
                    setFilters((current) => ({ ...current, department: value }))
                  }
                />
                <FilterChips
                  label="Odgovorni"
                  options={responsibles}
                  value={filters.responsible}
                  onSelect={(value) =>
                    setFilters((current) => ({ ...current, responsible: value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/60">
            <div className="sticky top-0 z-20 grid grid-cols-[minmax(240px,1.2fr)_minmax(160px,0.9fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(140px,0.6fr)_minmax(160px,0.7fr)_minmax(180px,0.8fr)_minmax(160px,0.8fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)] border-b border-white/60 bg-white/30 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 backdrop-blur-md">
              <span>Guest</span>
              <span>Plus one</span>
              <span>Company</span>
              <span>PMZ Responsible</span>
              <span>PMZ Department</span>
              <span>Arrival</span>
              <span>Guest Check-In</span>
              <span>Plus One Check-In</span>
              <span>Farewell gift</span>
              <span>Check-In Time</span>
              <span>Farewell time</span>
            </div>
            <div
              ref={scrollParentRef}
              className="max-h-[65vh] overflow-auto"
            >
              <div
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                className="relative"
              >
                {virtualItems.map((virtualRow) => {
                  const index = virtualRow.index;
                  const record = filteredRecords[index];

                  if (!record) {
                    return (
                      <div
                        key={`loader-${virtualRow.key}`}
                        className="absolute left-0 right-0 flex items-center justify-center border-b border-white/30 bg-white/10 text-sm text-white/70"
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {hasMore ? "Učitavanje..." : "Nema više rezultata"}
                      </div>
                    );
                  }

                  const checkInBackground = record.guestCheckIn;
                  const giftBackground = record.farewellGift;

                  const rowClass = clsx(
                    "group absolute inset-x-0 grid grid-cols-[minmax(240px,1.2fr)_minmax(160px,0.9fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(140px,0.6fr)_minmax(160px,0.7fr)_minmax(180px,0.8fr)_minmax(160px,0.8fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)]",
                    "items-center gap-3 border-b border-white/60 px-4 py-4 pr-6 text-sm text-white",
                    "before:absolute before:left-0 before:top-0 before:bottom-0 before:content-[''] before:rounded-l-xl",
                    checkInBackground && !giftBackground && "bg-green-500/25 before:bg-green-500 before:w-1",
                    giftBackground && !checkInBackground && "bg-cyan-400/25 before:bg-cyan-400 before:w-1",
                    giftBackground && checkInBackground &&
                      "bg-cyan-400/25 before:bg-green-500 before:w-[2px]",
                    !giftBackground && !checkInBackground && "before:bg-white/20 before:w-1"
                  );

                  return (
                    <div
                      key={record.id}
                      data-row-index={index}
                      tabIndex={0}
                      role="row"
                      onFocus={() => setFocusedIndex(index)}
                      onKeyDown={(event) => handleRowKeyDown(event, index, record)}
                      className={rowClass}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="sticky left-0 z-10 flex items-center gap-3 bg-inherit pr-4">
                        <div className="flex flex-col">
                          <span className="text-base font-semibold" role="rowheader">
                            {record.guest}
                          </span>
                          {record.plusOne ? (
                            <span className="text-xs uppercase tracking-[0.25em] text-white/60">
                              +1 {record.plusOne}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="truncate text-white/80">
                        {record.plusOne ?? "—"}
                      </span>
                      <span className="truncate text-white/80">{record.company}</span>
                      <span className="truncate text-white/80">
                        {record.pmzResponsible || "—"}
                      </span>
                      <span className="truncate text-white/80">
                        {record.pmzDepartment || "—"}
                      </span>
                      <span className="font-semibold uppercase tracking-[0.3em] text-white">
                        {record.arrivalConfirmation}
                      </span>
                      <div className="flex items-center">
                        <SmartCheckbox
                          ariaLabel={`Guest check-in for ${record.guest}`}
                          checked={record.guestCheckIn}
                          onChange={(value) =>
                            void handleToggleCheckIn(record, { guest: value })
                          }
                          accent="green"
                        />
                      </div>
                      <div className="flex items-center">
                        <SmartCheckbox
                          ariaLabel={`Plus one check-in for ${record.guest}`}
                          checked={record.plusOneCheckIn}
                          onChange={(value) =>
                            void handleToggleCheckIn(record, { plusOne: value })
                          }
                          accent="green"
                        />
                      </div>
                      <div className="flex items-center">
                        <SmartCheckbox
                          ariaLabel={`Farewell gift for ${record.guest}`}
                          checked={record.farewellGift}
                          onChange={(value) => void handleToggleGift(record, value)}
                          accent="cyan"
                        />
                      </div>
                      <span className="text-white/80">
                        {record.checkInTime
                          ? dayjs(record.checkInTime).format("DD.MM. HH:mm")
                          : "—"}
                      </span>
                      <span className="text-white/80">
                        {record.farewellTime
                          ? dayjs(record.farewellTime).format("DD.MM. HH:mm")
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-white/60">
              Učitavanje liste gostiju...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-400/60 bg-rose-500/20 px-4 py-3 text-sm text-white">
              Došlo je do problema pri dohvaćanju liste gostiju. Pokušajte ponovno.
            </div>
          ) : null}
        </div>
      </main>

      {metrics ? (
        <footer className="sticky bottom-0 z-20 mx-auto w-full max-w-5xl px-6 pb-8">
          <StatsBar
            arrivedTotal={metrics.arrivedTotal}
            giftsGiven={metrics.giftsGiven}
            updatedAt={lastSuccessAt}
            latencyMs={latencyMs}
          />
        </footer>
      ) : null}
    </div>
  );
}
