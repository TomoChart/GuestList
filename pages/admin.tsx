import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import KpiCard from '../components/KpiCard';
import { Guest } from '../types/Guest';
import backgroundLista from './background/background_lista.jpg';

const TARGET_ARRIVALS = 300;

const AdminPage: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includePMZ, setIncludePMZ] = useState(false);

  const fetchGuests = useCallback(async () => {
    setLoadingGuests(true);
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
      setError('Nismo uspjeli učitati podatke. Molimo pokušajte ponovno.');
    } finally {
      setLoadingGuests(false);
    }
  }, []);

  useEffect(() => {
    void fetchGuests();
  }, [fetchGuests]);

  const filterOutPMZ = useCallback((guest: Guest) => {
    const company = guest.company?.trim().toLowerCase() ?? '';
    return company !== 'philip morris zagreb';
  }, []);

  const {
    totalArrivals,
    totalInvitedGuests,
    guestCount,
    guestsWithoutCompanion,
    companionCount,
    arrivedGuestCount,
    arrivedCompanionCount,
  } = useMemo(() => {
    const relevantGuests = includePMZ ? guests : guests.filter(filterOutPMZ);

    let companionTotal = 0;
    let guestsWithoutCompanionTotal = 0;
    let arrivedGuestsTotal = 0;
    let arrivedCompanionsTotal = 0;

    relevantGuests.forEach((guest) => {
      if (guest.companionName) {
        companionTotal += 1;
      } else {
        guestsWithoutCompanionTotal += 1;
      }

      if (guest.checkInGuest) {
        arrivedGuestsTotal += 1;
      }

      if (guest.checkInCompanion) {
        arrivedCompanionsTotal += 1;
      }
    });

    const guestTotal = relevantGuests.length;
    const totalInvited = guestTotal + companionTotal;
    const totalArrivalsCount = arrivedGuestsTotal + arrivedCompanionsTotal;

    return {
      totalArrivals: totalArrivalsCount,
      totalInvitedGuests: totalInvited,
      guestCount: guestTotal,
      guestsWithoutCompanion: guestsWithoutCompanionTotal,
      companionCount: companionTotal,
      arrivedGuestCount: arrivedGuestsTotal,
      arrivedCompanionCount: arrivedCompanionsTotal,
    };
  }, [guests, includePMZ, filterOutPMZ]);

  const topDepartments = useMemo(() => {
    const departmentMap = new Map<
      string,
      { invited: number; arrived: number }
    >();

    guests.filter(filterOutPMZ).forEach((guest) => {
      const department = guest.department?.trim() || 'Nepoznat odjel';
      const invited = 1 + (guest.companionName ? 1 : 0);
      const arrived =
        (guest.checkInGuest ? 1 : 0) + (guest.checkInCompanion ? 1 : 0);

      const current = departmentMap.get(department) ?? {
        invited: 0,
        arrived: 0,
      };

      current.invited += invited;
      current.arrived += arrived;

      departmentMap.set(department, current);
    });

    return Array.from(departmentMap.entries())
      .filter(([, data]) => data.invited > 0)
      .map(([department, data]) => ({
        department,
        invited: data.invited,
        arrived: data.arrived,
        rate: data.arrived / data.invited,
      }))
      .sort((a, b) => {
        if (b.rate === a.rate) {
          return b.arrived - a.arrived;
        }

        return b.rate - a.rate;
      })
      .slice(0, 5);
  }, [guests, filterOutPMZ]);

  const arrivalProgressPercentage = Math.min(
    100,
    Math.round((totalArrivals / TARGET_ARRIVALS) * 100)
  );
  const arrivalsRemaining = Math.max(0, TARGET_ARRIVALS - totalArrivals);
  const showTopDepartments = totalArrivals >= TARGET_ARRIVALS;

  const pageBackgroundStyle = useMemo<React.CSSProperties>(
    () => ({
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundImage: `url(${backgroundLista.src})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }),
    []
  );

  const pmzButtonClasses = (active: boolean) =>
    [
      'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
      active
        ? 'bg-white text-[#0b1f46] shadow-lg focus-visible:outline-white'
        : 'bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white/60',
    ].join(' ');

  return (
    <div style={pageBackgroundStyle}>
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-3xl space-y-6 rounded-[40px] border border-white/35 bg-[#0b1f46]/75 p-6 text-white shadow-[0_40px_120px_rgba(8,15,40,0.65)] backdrop-blur-2xl sm:p-8">
          <header className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                Admin dashboard
              </p>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">
                IQOS Event Control Center
              </h1>
              <p className="max-w-prose text-sm text-white/80 sm:text-base">
                Mobilni pregled ključnih metrika događaja s fokusom na brzu
                analizu i cilj od {TARGET_ARRIVALS} dolazaka.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em]">
                <span className="rounded-full bg-emerald-400/90 px-3 py-1 text-[0.7rem] font-semibold text-emerald-950 shadow">
                  {arrivalProgressPercentage}%
                </span>
                <span>Cilj: {TARGET_ARRIVALS} dolazaka</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchGuests()}
                  className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loadingGuests}
                >
                  {loadingGuests ? 'Učitavanje…' : 'Osvježi podatke'}
                </button>
                <Link
                  href="/lista"
                  className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Lista gostiju
                </Link>
              </div>
            </div>
          </header>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-[28px] border border-white/20 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                  Uključiti Philip Morris Zagreb u metrike?
                </p>
                <p className="text-xs text-white/70 sm:text-sm">
                  Kontrolirajte prikaz KPI kartica bez utjecaja na analizu top
                  odjela.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIncludePMZ(true)}
                  className={pmzButtonClasses(includePMZ)}
                  aria-pressed={includePMZ}
                >
                  DA
                </button>
                <button
                  type="button"
                  onClick={() => setIncludePMZ(false)}
                  className={pmzButtonClasses(!includePMZ)}
                  aria-pressed={!includePMZ}
                >
                  NE
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-3xl border border-red-400/60 bg-red-500/20 p-4 text-sm text-red-50 shadow-lg backdrop-blur">
                {error}
              </div>
            )}

            {loadingGuests && guests.length === 0 ? (
              <div className="rounded-3xl border border-white/20 bg-white/5 p-6 text-center text-sm text-white/70">
                Učitavanje podataka…
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <KpiCard
                  title="Ukupni broj dolazaka"
                  value={
                    <>
                      <span className="block text-6xl font-black sm:text-7xl">
                        {totalArrivals}
                      </span>
                    </>
                  }
                  description={
                    <div className="space-y-1 text-sm text-white/80 sm:text-base">
                      <p>
                        Gosti: {arrivedGuestCount} • Pratnja: {arrivedCompanionCount}
                      </p>
                      <p>
                        {showTopDepartments
                          ? 'Cilj ostvaren! Analiza odjela je otključana.'
                          : `Nedostaje još ${arrivalsRemaining} dolazaka do cilja.`}
                      </p>
                    </div>
                  }
                />
                <KpiCard
                  title="Ukupan broj pozvanih (gosti + pratnja)"
                  value={
                    <>
                      <span className="block text-5xl font-black sm:text-6xl">
                        {totalInvitedGuests}
                      </span>
                      {!includePMZ && (
                        <span className="mt-1 block text-xs uppercase tracking-[0.3em] text-white/60">
                          bez Philip Morris Zagreb
                        </span>
                      )}
                    </>
                  }
                  description={
                    <p>
                      Trenutno pokriveno {guestCount} gostiju i {companionCount}{' '}
                      pratnji.
                    </p>
                  }
                />
                <KpiCard
                  title="Gosti"
                  value={
                    <>
                      <span className="block text-5xl font-black sm:text-6xl">
                        {guestCount}
                      </span>
                    </>
                  }
                  description={
                    <p>
                      {guestsWithoutCompanion} bez pratnje •{' '}
                      {guestCount - guestsWithoutCompanion} s pratnjom.
                    </p>
                  }
                />
                <KpiCard
                  title="Pratnja"
                  value={
                    <span className="block text-5xl font-black sm:text-6xl">
                      {companionCount}
                    </span>
                  }
                  description={<p>Aktivno pozvanih plus one gostiju.</p>}
                />
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold uppercase tracking-[0.3em] text-white/80">
                Top 5 odjela po odazivu
              </h2>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-white/70">
                {showTopDepartments ? 'Aktivno' : 'Čeka cilj'}
              </span>
            </div>

            {showTopDepartments ? (
              <ol className="space-y-3">
                {topDepartments.map((department, index) => (
                  <li
                    key={department.department}
                    className="flex items-center justify-between rounded-3xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner backdrop-blur"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-base font-semibold text-white sm:text-lg">
                          {department.department}
                        </p>
                        <p className="text-xs text-white/70 sm:text-sm">
                          {department.arrived}/{department.invited} dolazaka •{' '}
                          {(department.rate * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="hidden h-2 w-32 overflow-hidden rounded-full bg-white/15 sm:block">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(department.rate * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-5 text-sm text-white/70 shadow-inner backdrop-blur">
                Analiza će se prikazati nakon {TARGET_ARRIVALS} dolazaka. Trenutno
                nedostaje još {arrivalsRemaining} dolazaka.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
