import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import KpiCard from '../components/KpiCard';
import { Guest } from '../types/Guest';
import backgroundLista from './background/background_lista.jpg';

const pmzCompanyName = 'philip morris zagreb';

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
      setError('Unable to load guests. Please try again.');
    } finally {
      setLoadingGuests(false);
    }
  }, []);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const isPmzEmployee = useCallback((guest: Guest) => {
    const company = guest.company?.trim().toLowerCase() ?? '';
    return company === pmzCompanyName;
  }, []);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('hr-HR'), []);

  const {
    totalArrivals,
    totalInvitedGuests,
    guestCount,
    guestsWithoutCompanion,
    companionCount,
    arrivedGuestCount,
    arrivedCompanionCount,
  } = useMemo(() => {
    const relevantGuests = includePMZ ? guests : guests.filter((guest) => !isPmzEmployee(guest));

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
  }, [guests, includePMZ, isPmzEmployee]);

  const { nonPmArrivals, topDepartments } = useMemo(() => {
    const departmentMap = new Map<
      string,
      {
        invited: number;
        arrived: number;
      }
    >();

    let arrivalTotal = 0;

    guests.forEach((guest) => {
      if (isPmzEmployee(guest)) {
        return;
      }

      const department = guest.department?.trim() || 'Neraspoređeno';
      const invited = 1 + (guest.companionName ? 1 : 0);
      const arrived = (guest.checkInGuest ? 1 : 0) + (guest.checkInCompanion ? 1 : 0);

      arrivalTotal += arrived;

      const current = departmentMap.get(department) ?? { invited: 0, arrived: 0 };
      current.invited += invited;
      current.arrived += arrived;
      departmentMap.set(department, current);
    });

    const departments = Array.from(departmentMap.entries())
      .map(([department, counts]) => ({
        department,
        invited: counts.invited,
        arrived: counts.arrived,
        responseRate: counts.invited === 0 ? 0 : counts.arrived / counts.invited,
      }))
      .filter((entry) => entry.invited > 0)
      .sort((a, b) => {
        if (b.responseRate === a.responseRate) {
          return b.arrived - a.arrived;
        }
        return b.responseRate - a.responseRate;
      })
      .slice(0, 5);

    return {
      nonPmArrivals: arrivalTotal,
      topDepartments: departments,
    };
  }, [guests, isPmzEmployee]);

  const showTopDepartments = nonPmArrivals >= 300 && topDepartments.length > 0;

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundImage: `url(${backgroundLista.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#040c26]/85 via-[#081637]/75 to-[#0f1d3f]/80" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full rounded-[40px] border border-white/30 bg-white/15 p-6 shadow-[0_45px_140px_rgba(8,22,55,0.55)] backdrop-blur-2xl sm:p-10">
          <div className="flex flex-col items-center gap-8 text-center text-white sm:text-left">
            <div className="flex w-full flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                  Power Analytics
                </span>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Admin Dashboard</h1>
                <p className="max-w-xl text-sm text-white/70 sm:text-base">
                  Pregled ključnih metrika u stvarnom vremenu uz naglasak na brzom uvidu u odaziv gostiju.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
                <Link
                  href="/lista"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/50 bg-white/20 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                >
                  Otvori listu gostiju
                </Link>
                <button
                  type="button"
                  onClick={fetchGuests}
                  disabled={loadingGuests}
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/30 bg-[#081637]/60 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#0c255f]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loadingGuests ? 'Osvježavanje…' : 'Osvježi podatke'}
                </button>
              </div>
            </div>

            {error && (
              <div className="w-full rounded-3xl border border-red-400/60 bg-red-500/20 px-4 py-3 text-sm text-red-100 shadow-lg backdrop-blur">
                {error}
              </div>
            )}

            <div className="flex w-full flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Philip Morris Zagreb</span>
                <div className="inline-flex rounded-full border border-white/30 bg-white/20 p-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setIncludePMZ(true)}
                    className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      includePMZ
                        ? 'bg-white/90 text-[#081637] shadow-xl'
                        : 'bg-transparent text-white/80 hover:bg-white/20'
                    }`}
                    aria-pressed={includePMZ}
                  >
                    Uključi
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludePMZ(false)}
                    className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      !includePMZ
                        ? 'bg-white/90 text-[#081637] shadow-xl'
                        : 'bg-transparent text-white/80 hover:bg-white/20'
                    }`}
                    aria-pressed={!includePMZ}
                  >
                    Isključi
                  </button>
                </div>
                <p className="text-xs text-white/60">
                  {includePMZ ? 'Prikazane metrike uključuju PMZ zaposlenike.' : 'PMZ zaposlenici su isključeni iz prikaza metrika.'}
                </p>
              </div>

              <div className="grid w-full gap-4 sm:grid-cols-2">
                <KpiCard
                  title="Ukupni broj dolazaka"
                  value={
                    <>
                      <span className="block text-6xl font-black tracking-tight sm:text-7xl">
                        {numberFormatter.format(totalArrivals)}
                      </span>
                      <span className="block text-sm font-medium text-[#1f3f86]/80 sm:text-base">
                        ({numberFormatter.format(arrivedGuestCount)} gosti · {numberFormatter.format(arrivedCompanionCount)} pratnja)
                      </span>
                    </>
                  }
                />
                <KpiCard
                  title="Gosti"
                  value={
                    <>
                      <span className="block text-5xl font-black tracking-tight sm:text-6xl">
                        {numberFormatter.format(guestCount)}
                      </span>
                      <span className="block text-xs font-medium text-[#1f3f86]/80 sm:text-sm">
                        {numberFormatter.format(guestsWithoutCompanion)} bez pratnje
                      </span>
                    </>
                  }
                />
                <KpiCard
                  title="Pratnja"
                  value={
                    <span className="block text-5xl font-black tracking-tight sm:text-6xl">
                      {numberFormatter.format(companionCount)}
                    </span>
                  }
                />
                <KpiCard
                  title="Ukupan broj pozvanih (gosti + pratnja)"
                  value={
                    <>
                      <span className="block text-5xl font-black tracking-tight sm:text-6xl">
                        {numberFormatter.format(totalInvitedGuests)}
                      </span>
                      {!includePMZ && (
                        <span className="block text-xs font-medium text-[#1f3f86]/80 sm:text-sm">
                          (bez Philip Morris Zagreb)
                        </span>
                      )}
                    </>
                  }
                />
              </div>
            </div>

            <div className="w-full rounded-[32px] border border-white/30 bg-[#081637]/70 p-6 text-left shadow-[0_28px_70px_rgba(8,22,55,0.45)] backdrop-blur-xl">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold text-white">Top odjeli prema odazivu</h2>
                  <span className="text-xs font-medium uppercase tracking-[0.25em] text-white/50">
                    Bez zaposlenika PMZ · Cilj: 300 dolazaka
                  </span>
                </div>
                {showTopDepartments ? (
                  <div className="space-y-4">
                    {topDepartments.map((department, index) => {
                      const percentage = department.responseRate * 100;
                      const formattedPercentage = `${percentage.toFixed(1)}%`;
                      return (
                        <div
                          key={department.department}
                          className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-inner backdrop-blur"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-3xl font-black text-white/70">{index + 1}.</span>
                              <div>
                                <p className="text-base font-semibold text-white sm:text-lg">{department.department}</p>
                                <p className="text-xs text-white/70 sm:text-sm">
                                  {numberFormatter.format(department.arrived)} / {numberFormatter.format(department.invited)} dolazaka
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-3xl font-black text-emerald-200 sm:text-4xl">{formattedPercentage}</div>
                          </div>
                          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-lime-300"
                              style={{ width: `${Math.min(100, percentage)}%` }}
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-white/70">
                    Top lista postaje dostupna nakon što evidentiramo najmanje 300 dolazaka (trenutno {numberFormatter.format(nonPmArrivals)}).
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
