import React, { useEffect, useMemo, useState } from 'react';

import BarList, { BarDatum } from '../components/BarList';
import ProgressRing from '../components/ProgressRing';
import StatCard from '../components/StatCard';
import backgroundLista from './background/background_lista.jpg';
import { Guest } from '../types/Guest';

const EXCLUDE_COMPANY_PREFIX = 'philip morris';
const MIN_DEPARTMENT_INVITED = 4;

function normalizeCompany(value: string | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function hasValue(value: string | undefined) {
  return value !== undefined && value.trim().length > 0;
}

export default function Admin() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includePMZ, setIncludePMZ] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchGuests = async () => {
      setIsLoading(true);

      try {
        const response = await fetch('/api/guests');

        if (!response.ok) {
          throw new Error('Nije moguće dohvatiti goste.');
        }

        const data: Guest[] = await response.json();

        if (mounted) {
          setGuests(data);
          setError(null);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Dogodila se pogreška.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchGuests();

    return () => {
      mounted = false;
    };
  }, []);

  const relevantGuests = useMemo(
    () =>
      includePMZ
        ? guests
        : guests.filter((guest) => !normalizeCompany(guest.company).startsWith(EXCLUDE_COMPANY_PREFIX)),
    [guests, includePMZ]
  );

  const { invitedTotal, guestsArrived, plusOnesArrived, arrivedTotal } = useMemo(() => {
    let invited = 0;
    let guestArrivals = 0;
    let companionArrivals = 0;

    relevantGuests.forEach((guest) => {
      if (hasValue(guest.guestName)) {
        invited += 1;
      }

      if (hasValue(guest.companionName)) {
        invited += 1;
      }

      if (guest.checkInGuest) {
        guestArrivals += 1;
      }

      if (guest.checkInCompanion) {
        companionArrivals += 1;
      }
    });

    return {
      invitedTotal: invited,
      guestsArrived: guestArrivals,
      plusOnesArrived: companionArrivals,
      arrivedTotal: guestArrivals + companionArrivals,
    };
  }, [relevantGuests]);

  const arrivalPercent = useMemo(() => {
    if (invitedTotal === 0) {
      return 0;
    }

    return (arrivedTotal / invitedTotal) * 100;
  }, [arrivedTotal, invitedTotal]);

  const top5ByResponse: BarDatum[] = useMemo(() => {
    const departmentBuckets = new Map<string, { invited: number; arrived: number }>();

    guests
      .filter((guest) => !normalizeCompany(guest.company).startsWith(EXCLUDE_COMPANY_PREFIX))
      .forEach((guest) => {
        const departmentName = guest.department?.trim() || 'Nepoznato';
        const bucket = departmentBuckets.get(departmentName) ?? { invited: 0, arrived: 0 };

        if (hasValue(guest.guestName)) {
          bucket.invited += 1;
        }

        if (hasValue(guest.companionName)) {
          bucket.invited += 1;
        }

        if (guest.checkInGuest) {
          bucket.arrived += 1;
        }

        if (guest.checkInCompanion) {
          bucket.arrived += 1;
        }

        departmentBuckets.set(departmentName, bucket);
      });

    return Array.from(departmentBuckets.entries())
      .filter(([, bucket]) => bucket.invited >= MIN_DEPARTMENT_INVITED)
      .map(([name, bucket]) => ({
        name,
        invited: bucket.invited,
        arrived: bucket.arrived,
        pct: bucket.invited === 0 ? 0 : Math.round((bucket.arrived / bucket.invited) * 100),
      }))
      .sort((a, b) => {
        if (b.pct === a.pct) {
          return b.arrived - a.arrived;
        }

        return b.pct - a.pct;
      })
      .slice(0, 5);
  }, [guests]);

  const showTopDepartments = arrivedTotal >= 300 && top5ByResponse.length > 0;

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${backgroundLista.src})` }}
    >
      <main className="min-h-screen bg-slate-900/40 px-4 py-8 sm:px-6 flex items-start justify-center">
        <div className="w-full max-w-[680px] space-y-6">
          <div className="flex items-center justify-center gap-3 rounded-full bg-white/50 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setIncludePMZ(true)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 sm:text-sm ${
                includePMZ
                  ? 'bg-sky-500 text-white shadow-lg'
                  : 'bg-transparent text-slate-700 hover:bg-white/60'
              }`}
              aria-pressed={includePMZ}
            >
              PMZ DA
            </button>
            <button
              type="button"
              onClick={() => setIncludePMZ(false)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 sm:text-sm ${
                !includePMZ
                  ? 'bg-sky-500 text-white shadow-lg'
                  : 'bg-transparent text-slate-700 hover:bg-white/60'
              }`}
              aria-pressed={!includePMZ}
            >
              PMZ NE
            </button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-300/60 bg-rose-100/70 p-4 text-center text-sm font-medium text-rose-700 shadow-lg">
              {error}
            </div>
          ) : null}

          <section className="w-full space-y-4 rounded-2xl border border-white/40 bg-white/70 p-5 shadow-lg backdrop-blur-md sm:p-6">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="h-40 w-40 animate-pulse rounded-full bg-white/60" />
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/60" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <ProgressRing percent={Math.min(100, arrivalPercent)} label="Ukupni broj dolazaka">
                  {arrivedTotal}
                </ProgressRing>
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatCard label="Gosti" value={guestsArrived} />
                  <StatCard label="Pratnja" value={plusOnesArrived} />
                  <StatCard label="Ukupan broj pozvanih" value={invitedTotal} />
                </div>
              </div>
            )}
          </section>

          {showTopDepartments ? (
            <section className="rounded-2xl border border-white/40 bg-white/70 p-5 shadow-lg backdrop-blur-md sm:p-6">
              <h2 className="mb-4 text-center text-base font-semibold uppercase tracking-[0.3em] text-slate-700 sm:text-lg">
                Top 5 odjela po odazivu (bez PM zaposlenih)
              </h2>
              <BarList data={top5ByResponse} maxBars={5} />
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
