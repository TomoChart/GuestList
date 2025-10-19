import React, { useCallback, useEffect, useMemo, useState } from 'react';

import BarList, { BarDatum } from '../components/BarList';
import ProgressRing from '../components/ProgressRing';
import StatCard from '../components/StatCard';
import { Guest } from '../types/Guest';
import backgroundLista from './background/background_lista.jpg';

const EXCLUDE_COMPANY_PREFIX = 'philip morris';

const isPmzEmployee = (company?: string) =>
  (company ?? '').trim().toLowerCase().startsWith(EXCLUDE_COMPANY_PREFIX);

const hasPlusOne = (name?: string) => Boolean(name && name.trim().length > 0);

const MIN_DEPARTMENT_SIZE = 4;
const ARRIVALS_THRESHOLD = 300;

const Admin: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includePMZ, setIncludePMZ] = useState(false);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/guests');

      if (!response.ok) {
        throw new Error('Neuspjelo učitavanje podataka.');
      }

      const data: Guest[] = await response.json();
      setGuests(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Dogodila se greška prilikom učitavanja podataka. Pokušajte ponovno.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await fetchGuests();
      } catch (error_) {
        if (isMounted) {
          console.error(error_);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [fetchGuests]);

  const relevantGuests = useMemo(
    () => guests.filter((guest) => includePMZ || !isPmzEmployee(guest.company)),
    [guests, includePMZ]
  );

  const { invitedTotal, arrivedTotal, guestsArrived, plusOnesArrived, responsePercent } = useMemo(() => {
    let invited = 0;
    let arrivedGuests = 0;
    let arrivedCompanions = 0;

    relevantGuests.forEach((guest) => {
      invited += 1;

      if (guest.checkInGuest) {
        arrivedGuests += 1;
      }

      if (hasPlusOne(guest.companionName)) {
        invited += 1;
        if (guest.checkInCompanion) {
          arrivedCompanions += 1;
        }
      }
    });

    const totalArrived = arrivedGuests + arrivedCompanions;
    const percent = invited > 0 ? (totalArrived / invited) * 100 : 0;

    return {
      invitedTotal: invited,
      arrivedTotal: totalArrived,
      guestsArrived: arrivedGuests,
      plusOnesArrived: arrivedCompanions,
      responsePercent: percent,
    };
  }, [relevantGuests]);

  const top5ByResponse: BarDatum[] = useMemo(() => {
    const departmentMap = new Map<string, { invited: number; arrived: number }>();

    guests.forEach((guest) => {
      if (isPmzEmployee(guest.company)) {
        return;
      }

      const departmentName = guest.department?.trim() || 'Neraspoređeno';
      const current = departmentMap.get(departmentName) ?? { invited: 0, arrived: 0 };

      current.invited += 1;
      if (guest.checkInGuest) {
        current.arrived += 1;
      }

      if (hasPlusOne(guest.companionName)) {
        current.invited += 1;
        if (guest.checkInCompanion) {
          current.arrived += 1;
        }
      }

      departmentMap.set(departmentName, current);
    });

    return Array.from(departmentMap.entries())
      .map(([name, stats]) => ({
        name,
        invited: stats.invited,
        arrived: stats.arrived,
        pct: stats.invited > 0 ? Math.round((stats.arrived / stats.invited) * 100) : 0,
      }))
      .filter((item) => item.invited >= MIN_DEPARTMENT_SIZE)
      .sort((a, b) => {
        if (b.pct !== a.pct) {
          return b.pct - a.pct;
        }

        return b.arrived - a.arrived;
      })
      .slice(0, 5);
  }, [guests]);

  const showTopDepartments = arrivedTotal >= ARRIVALS_THRESHOLD && top5ByResponse.length > 0;

  const pageBackgroundStyle: React.CSSProperties = useMemo(
    () => ({
      backgroundImage: `url(${backgroundLista.src})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }),
    []
  );

  const responsePercentDisplay = Math.round(responsePercent);

  const renderHeroContent = () => {
    if (loading) {
      return (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="h-40 w-40 animate-pulse rounded-full bg-white/60" />
          <div className="grid w-full grid-cols-2 gap-3">
            {[...Array(2)].map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/60" />
            ))}
          </div>
          <div className="h-20 w-full animate-pulse rounded-2xl bg-white/60" />
        </div>
      );
    }

    return (
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <ProgressRing percent={responsePercent} label="Ukupni broj dolazaka">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-4xl font-bold text-slate-900 sm:text-5xl">{arrivedTotal}</span>
            <span className="text-xs font-medium text-slate-600 sm:text-sm">
              {invitedTotal > 0 ? `${responsePercentDisplay}% odaziv` : 'Bez pozvanih'}
            </span>
          </div>
        </ProgressRing>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md">
            <StatCard label="Gosti" value={guestsArrived} sublabel="Dolazak zabilježen" />
          </div>
          <div className="rounded-2xl border border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md">
            <StatCard label="Pratnja" value={plusOnesArrived} sublabel="Dolazak zabilježen" />
          </div>
        </div>
        <div className="w-full rounded-2xl border border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md">
          <StatCard
            label="Ukupan broj pozvanih"
            value={invitedTotal}
            sublabel={invitedTotal > 0 ? 'Gosti + pratnja' : undefined}
          />
        </div>
      </div>
    );
  };

  return (
    <main
      className="min-h-screen p-4 sm:p-6"
      style={pageBackgroundStyle}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[680px] items-start justify-center">
        <div className="w-full space-y-4 py-4">
          <section className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl p-4 sm:p-6 shadow-lg">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-600">PMZ</span>
                <div className="flex items-center gap-2 rounded-full border border-white/50 bg-white/60 p-1 shadow-inner backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setIncludePMZ(true)}
                    className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      includePMZ
                        ? 'bg-emerald-500 text-white shadow-lg focus-visible:outline-emerald-200'
                        : 'bg-white/0 text-slate-600 hover:bg-white/40 focus-visible:outline-slate-200'
                    }`}
                    aria-pressed={includePMZ}
                  >
                    DA
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludePMZ(false)}
                    className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      !includePMZ
                        ? 'bg-emerald-500 text-white shadow-lg focus-visible:outline-emerald-200'
                        : 'bg-white/0 text-slate-600 hover:bg-white/40 focus-visible:outline-slate-200'
                    }`}
                    aria-pressed={!includePMZ}
                  >
                    NE
                  </button>
                </div>
              </div>

              {error ? (
                <div className="w-full rounded-2xl border border-red-200 bg-red-100/70 p-4 text-sm text-red-700">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={fetchGuests}
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-red-300 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-700 transition hover:bg-white"
                  >
                    Pokušaj ponovno
                  </button>
                </div>
              ) : null}

              {renderHeroContent()}
            </div>
          </section>

          {showTopDepartments ? (
            <section className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl p-4 sm:p-6 shadow-lg">
              <h2 className="mb-3 text-center text-lg font-semibold text-slate-800">
                Top 5 odjela po odazivu (bez PM zaposlenih)
              </h2>
              <BarList data={top5ByResponse} maxBars={5} />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
};

export default Admin;
