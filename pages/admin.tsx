import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import Fuse from "fuse.js";
import clsx from "clsx";
import toast from "react-hot-toast";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as XLSX from "xlsx";

import AdminBarChart from "../components/AdminBarChart";
import KpiCard from "../components/KpiCard";
import SmartCheckbox from "../components/SmartCheckbox";
import FilterChips from "../components/FilterChips";
import {
  normalizeText,
  updateRecordInPages,
  useDebouncedValue,
} from "../lib/guest-utils";
import {
  GuestBreakdownEntry,
  GuestListResponse,
  GuestRecord,
} from "../types/Guest";

const PAGE_SIZE = 150;

type AdminTab = "department" | "responsible" | "list";

interface ColumnFilters {
  guest: string;
  plusOne: string;
  company: string;
  responsible: string;
  department: string;
  arrival: "" | "YES" | "NO" | "UNKNOWN";
  guestCheckIn: "" | "yes" | "no";
  plusOneCheckIn: "" | "yes" | "no";
  gift: "" | "yes" | "no";
}

const initialColumnFilters: ColumnFilters = {
  guest: "",
  plusOne: "",
  company: "",
  responsible: "",
  department: "",
  arrival: "",
  guestCheckIn: "",
  plusOneCheckIn: "",
  gift: "",
};

interface StatsResponse {
  metrics: GuestListResponse["metrics"];
  breakdowns: {
    byDepartment: GuestBreakdownEntry[];
    byResponsible: GuestBreakdownEntry[];
  };
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("department");
  const [search, setSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(
    initialColumnFilters
  );
  const [filters, setFilters] = useState<{ department: string | null; responsible: string | null }>(
    { department: null, responsible: null }
  );

  const debouncedSearch = useDebouncedValue(search, 250);

  const { data: statsData, error: statsError } = useSWR<StatsResponse>(
    "/api/stats",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const shouldLoadList = activeTab === "list";

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

  const listFetcher = useCallback(
    (url: string) => fetcher<GuestListResponse>(url),
    []
  );

  const getListKey = useCallback(
    (pageIndex: number, previousPageData: GuestListResponse | null) => {
      if (!shouldLoadList) {
        return null;
      }

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
    [baseQuery, shouldLoadList]
  );

  const {
    data: pages = [],
    error: listError,
    isLoading: listLoading,
    isValidating: listValidating,
    setSize,
    mutate,
  } = useSWRInfinite<GuestListResponse>(
    getListKey,
    listFetcher,
    { revalidateOnFocus: false, revalidateFirstPage: false }
  );

  const records = useMemo(
    () => pages.flatMap((page) => page.records),
    [pages]
  );
  const departments = pages[0]?.departments ?? [];
  const responsibles = pages[0]?.responsibles ?? [];
  const hasMore = Boolean(pages[pages.length - 1]?.offset);

  useEffect(() => {
    if (!shouldLoadList) {
      return;
    }
    void setSize(1);
  }, [baseQuery, setSize, shouldLoadList]);

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

  const searchedRecords = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return records;
    }
    return fuse.search(normalizeText(debouncedSearch)).map((entry) => entry.item);
  }, [debouncedSearch, fuse, records]);

  const filteredRecords = useMemo(() => {
    return searchedRecords.filter((record) => {
      const matchesText = (
        value: string | null | undefined,
        searchValue: string
      ) =>
        searchValue.trim()
          ? normalizeText(value ?? "").includes(normalizeText(searchValue))
          : true;

      if (!matchesText(record.guest, columnFilters.guest)) {
        return false;
      }

      if (!matchesText(record.plusOne ?? "", columnFilters.plusOne)) {
        return false;
      }

      if (!matchesText(record.company, columnFilters.company)) {
        return false;
      }

      if (!matchesText(record.pmzResponsible, columnFilters.responsible)) {
        return false;
      }

      if (!matchesText(record.pmzDepartment, columnFilters.department)) {
        return false;
      }

      if (columnFilters.arrival && record.arrivalConfirmation !== columnFilters.arrival) {
        return false;
      }

      if (
        columnFilters.guestCheckIn === "yes" && !record.guestCheckIn
      ) {
        return false;
      }

      if (columnFilters.guestCheckIn === "no" && record.guestCheckIn) {
        return false;
      }

      if (
        columnFilters.plusOneCheckIn === "yes" && !record.plusOneCheckIn
      ) {
        return false;
      }

      if (
        columnFilters.plusOneCheckIn === "no" && record.plusOneCheckIn
      ) {
        return false;
      }

      if (columnFilters.gift === "yes" && !record.farewellGift) {
        return false;
      }

      if (columnFilters.gift === "no" && record.farewellGift) {
        return false;
      }

      return true;
    });
  }, [columnFilters, searchedRecords]);

  const scrollParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: hasMore ? filteredRecords.length + 1 : filteredRecords.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!shouldLoadList || !hasMore || listValidating) {
      return;
    }

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= filteredRecords.length - 1) {
      void setSize((current) => current + 1);
    }
  }, [filteredRecords.length, hasMore, listValidating, setSize, shouldLoadList, virtualItems]);

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
        toast.success("Poklon ažuriran");
      } catch {
        toast.error("Greška pri spremanju poklona");
        await mutate(undefined, { revalidate: true });
      }
    },
    [mutate]
  );

  const handleExport = useCallback(() => {
    if (!filteredRecords.length) {
      toast.error("Nema podataka za izvoz");
      return;
    }

    const exportData = filteredRecords.map((record) => ({
      Guest: record.guest,
      "Plus one": record.plusOne ?? "",
      Company: record.company,
      "PMZ Responsible": record.pmzResponsible,
      "PMZ Department": record.pmzDepartment,
      "Arrival Confirmation": record.arrivalConfirmation,
      "Guest CheckIn": record.guestCheckIn ? "YES" : "NO",
      "Plus one CheckIn": record.plusOneCheckIn ? "YES" : "NO",
      "Farewell gift": record.farewellGift ? "YES" : "NO",
      "CheckIn Time": record.checkInTime
        ? dayjs(record.checkInTime).format("YYYY-MM-DD HH:mm")
        : "",
      "Farewell time": record.farewellTime
        ? dayjs(record.farewellTime).format("YYYY-MM-DD HH:mm")
        : "",
    }));

    const sheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Guest list");
    XLSX.writeFile(workbook, `guest-list-${dayjs().format("YYYYMMDD-HHmm")}.xlsx`);
    toast.success("Izvoz završen");
  }, [filteredRecords]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8 text-white">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-[0.6em] text-white/90">
          PMZ 20 YEARS — Admin
        </h1>
        <p className="text-sm uppercase tracking-[0.3em] text-white/70">
          Kontrolna soba za doček gostiju
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Ukupno pozvano"
          value={statsData?.metrics.totalInvited ?? 0}
        />
        <KpiCard
          label="Pristigli"
          value={statsData?.metrics.arrivedTotal ?? 0}
          subtitle="uključujući pratnje"
        />
        <KpiCard
          label="Podijeljeni pokloni"
          value={statsData?.metrics.giftsGiven ?? 0}
        />
      </section>

      <nav className="flex gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("department")}
          className={clsx(
            "rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition",
            activeTab === "department"
              ? "bg-white text-brand"
              : "bg-white/10 text-white/80 hover:bg-white/20"
          )}
        >
          By PMZ Department
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("responsible")}
          className={clsx(
            "rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition",
            activeTab === "responsible"
              ? "bg-white text-brand"
              : "bg-white/10 text-white/80 hover:bg-white/20"
          )}
        >
          By PMZ Responsible
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={clsx(
            "rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition",
            activeTab === "list"
              ? "bg-white text-brand"
              : "bg-white/10 text-white/80 hover:bg-white/20"
          )}
        >
          Full list
        </button>
      </nav>

      {activeTab === "department" && statsData ? (
        <AdminBarChart title="Dolazak po odjelima" data={statsData.breakdowns.byDepartment} />
      ) : null}
      {activeTab === "responsible" && statsData ? (
        <AdminBarChart title="Dolazak po odgovornima" data={statsData.breakdowns.byResponsible} />
      ) : null}

      {activeTab === "list" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-white/40 bg-white/30 p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-2 lg:w-1/2">
              <label
                htmlFor="admin-search"
                className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70"
              >
                Globalna pretraga
              </label>
              <input
                id="admin-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-white/40 bg-white/20 px-5 py-3 text-base text-white placeholder-white/60 shadow-inner focus:outline-none focus:ring-2 focus:ring-white/60"
                placeholder="Ime, tvrtka, odgovorni..."
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <FilterChips
                label="Odjel"
                options={departments}
                value={filters.department}
                onSelect={(value) => setFilters((current) => ({ ...current, department: value }))}
              />
              <FilterChips
                label="Odgovorni"
                options={responsibles}
                value={filters.responsible}
                onSelect={(value) => setFilters((current) => ({ ...current, responsible: value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/40 bg-white/10 p-3 text-xs uppercase tracking-[0.2em] text-white/70 shadow-inner">
            <div className="grid grid-cols-[repeat(5,minmax(160px,1fr))_repeat(4,120px)_repeat(2,160px)] gap-3">
              <input
                value={columnFilters.guest}
                onChange={(event) =>
                  setColumnFilters((current) => ({
                    ...current,
                    guest: event.target.value,
                  }))
                }
                placeholder="Guest"
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <input
                value={columnFilters.plusOne}
                onChange={(event) =>
                  setColumnFilters((current) => ({
                    ...current,
                    plusOne: event.target.value,
                  }))
                }
                placeholder="Plus one"
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <input
                value={columnFilters.company}
                onChange={(event) =>
                  setColumnFilters((current) => ({
                    ...current,
                    company: event.target.value,
                  }))
                }
                placeholder="Company"
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <input
                value={columnFilters.responsible}
                onChange={(event) =>
                  setColumnFilters((current) => ({
                    ...current,
                    responsible: event.target.value,
                  }))
                }
                placeholder="Responsible"
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <input
                value={columnFilters.department}
                onChange={(event) =>
                  setColumnFilters((current) => ({
                    ...current,
                    department: event.target.value,
                  }))
                }
                placeholder="Department"
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <select
                value={columnFilters.arrival}
                onChange={(event) =>
                  setColumnFilters((current) => ({
                    ...current,
                    arrival: event.target.value as ColumnFilters["arrival"],
                  }))
                }
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="">Arrival</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
              <select
                value={columnFilters.guestCheckIn}
                onChange={(event) =>
                  setColumnFilters((current) => ({
                    ...current,
                    guestCheckIn: event.target.value as ColumnFilters["guestCheckIn"],
                  }))
                }
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="">Guest check-in</option>
                <option value="yes">Checked</option>
                <option value="no">Not checked</option>
              </select>
              <select
                value={columnFilters.plusOneCheckIn}
                onChange={(event) =>
                  setColumnFilters((current) => ({
                    ...current,
                    plusOneCheckIn: event.target.value as ColumnFilters["plusOneCheckIn"],
                  }))
                }
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="">Plus one</option>
                <option value="yes">Checked</option>
                <option value="no">Not checked</option>
              </select>
              <select
                value={columnFilters.gift}
                onChange={(event) =>
                  setColumnFilters((current) => ({
                    ...current,
                    gift: event.target.value as ColumnFilters["gift"],
                  }))
                }
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="">Gift</option>
                <option value="yes">Given</option>
                <option value="no">Pending</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setColumnFilters(initialColumnFilters)}
                className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 hover:bg-white/20"
              >
                Reset filters
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="uppercase tracking-[0.3em] text-white/70">
              {filteredRecords.length} results
            </span>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-white/20"
            >
              Export CSV
            </button>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/60">
            <div className="sticky top-0 z-20 grid grid-cols-[minmax(220px,1.2fr)_minmax(160px,0.9fr)_minmax(200px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(140px,0.6fr)_minmax(160px,0.7fr)_minmax(180px,0.8fr)_minmax(160px,0.8fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)] border-b border-white/60 bg-white/30 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 backdrop-blur-md">
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
            <div ref={scrollParentRef} className="max-h-[60vh] overflow-auto">
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
                        key={`admin-loader-${virtualRow.key}`}
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
                    "absolute inset-x-0 grid grid-cols-[minmax(220px,1.2fr)_minmax(160px,0.9fr)_minmax(200px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(140px,0.6fr)_minmax(160px,0.7fr)_minmax(180px,0.8fr)_minmax(160px,0.8fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)]",
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
                      key={`admin-${record.id}`}
                      className={rowClass}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="sticky left-0 z-10 flex items-center gap-3 bg-inherit pr-4">
                        <div className="flex flex-col">
                          <span className="text-base font-semibold">
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

          {listLoading ? (
            <div className="flex h-24 items-center justify-center text-white/60">
              Učitavanje...
            </div>
          ) : null}
          {listError ? (
            <div className="rounded-xl border border-rose-400/60 bg-rose-500/20 px-4 py-3 text-sm">
              Ne možemo dohvatiti listu. Pokušajte ponovno kasnije.
            </div>
          ) : null}
        </section>
      ) : null}

      {statsError ? (
        <div className="rounded-xl border border-rose-400/60 bg-rose-500/20 px-4 py-3 text-sm">
          Ne možemo dohvatiti statistiku.
        </div>
      ) : null}
    </div>
  );
}
