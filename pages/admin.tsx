import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Guest } from '../types/Guest';
import backgroundLista from './background/background_lista.jpg';

const pmzCompanyName = 'philip morris zagreb';

const heroHeaderStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '29vh',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '32px 5% 32px',
  boxSizing: 'border-box',
  position: 'relative',
  zIndex: 1,
};

const heroInnerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '1040px',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
};

const heroCardStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  borderRadius: '28px',
  padding: '36px',
  background: 'linear-gradient(135deg, rgba(9, 20, 48, 0.92), rgba(14, 34, 72, 0.78))',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  boxShadow: '0 32px 95px rgba(8, 15, 40, 0.55)',
  color: '#f8fafc',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '32px',
  textAlign: 'center',
  overflow: 'hidden',
  backdropFilter: 'blur(16px)',
};

const heroCardOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  background:
    'radial-gradient(circle at top, rgba(59, 130, 246, 0.28), transparent 55%), radial-gradient(circle at bottom, rgba(16, 185, 129, 0.24), transparent 45%)',
  pointerEvents: 'none',
};

const heroCardContentStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '28px',
};

const metricsGridStyle: React.CSSProperties = {
  width: '100%',
  display: 'grid',
  gap: '18px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
};

const metricBoxStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '24px',
  padding: '28px 24px',
  background: 'rgba(13, 31, 70, 0.65)',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  boxShadow: '0 24px 64px rgba(8, 15, 40, 0.5)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
};

const progressSectionStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  alignItems: 'center',
};

const progressTrackStyle: React.CSSProperties = {
  width: '100%',
  height: '16px',
  borderRadius: '999px',
  background: 'rgba(148, 163, 184, 0.28)',
  overflow: 'hidden',
};

const topDepartmentsStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '26px',
  background: 'rgba(10, 26, 58, 0.7)',
  border: '1px solid rgba(148, 163, 184, 0.26)',
  boxShadow: '0 24px 72px rgba(8, 15, 40, 0.48)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  textAlign: 'left',
};

const actionButtonStyle: React.CSSProperties = {
  padding: '12px 28px',
  borderRadius: '9999px',
  border: '1px solid rgba(255, 255, 255, 0.45)',
  background: 'rgba(255, 255, 255, 0.22)',
  color: '#f8fafc',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontSize: '0.78rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  backdropFilter: 'blur(6px)',
  boxShadow: '0 18px 38px rgba(15, 23, 42, 0.35)',
};

const refreshButtonStyle: React.CSSProperties = {
  ...actionButtonStyle,
  background: 'rgba(13, 31, 70, 0.78)',
  border: '1px solid rgba(148, 163, 184, 0.45)',
  boxShadow: '0 18px 36px rgba(15, 23, 42, 0.55)',
};

const toggleGroupStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px',
  borderRadius: '9999px',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  background: 'rgba(13, 31, 70, 0.55)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
};

const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 22px',
  borderRadius: '9999px',
  border: active ? '1px solid rgba(255, 255, 255, 0.75)' : '1px solid rgba(255, 255, 255, 0.25)',
  background: active ? 'rgba(255, 255, 255, 0.92)' : 'transparent',
  color: active ? '#0f172a' : 'rgba(248, 250, 252, 0.78)',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontSize: '0.72rem',
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  boxShadow: active ? '0 14px 36px rgba(148, 197, 255, 0.45)' : 'none',
});

const topDepartmentItemStyle: React.CSSProperties = {
  borderRadius: '22px',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: 'rgba(16, 38, 82, 0.65)',
  padding: '18px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  color: '#f8fafc',
};

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

  const arrivalEligibleGuests = useMemo(
    () => guests.filter((guest) => guest.arrivalConfirmation !== 'NO'),
    [guests]
  );

  const { totalArrivals, totalInvitedGuests, guestCount, arrivedGuestCount, arrivedCompanionCount } = useMemo(() => {
    const relevantGuests = includePMZ
      ? arrivalEligibleGuests
      : arrivalEligibleGuests.filter((guest) => !isPmzEmployee(guest));

    let companionTotal = 0;
    let arrivedGuestsTotal = 0;
    let arrivedCompanionsTotal = 0;

    relevantGuests.forEach((guest) => {
      if (guest.companionName) {
        companionTotal += 1;
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
      arrivedGuestCount: arrivedGuestsTotal,
      arrivedCompanionCount: arrivedCompanionsTotal,
    };
  }, [arrivalEligibleGuests, includePMZ, isPmzEmployee]);

  const guestArrivalPercentage = guestCount === 0 ? 0 : (arrivedGuestCount / guestCount) * 100;
  const guestArrivalProgressWidth = Math.min(100, guestArrivalPercentage);

  const { nonPmArrivals, topDepartments } = useMemo(() => {
    const departmentMap = new Map<
      string,
      {
        invited: number;
        arrived: number;
      }
    >();

    let arrivalTotal = 0;

    arrivalEligibleGuests.forEach((guest) => {
      if (isPmzEmployee(guest)) {
        return;
      }

      const department = guest.department?.trim() || 'Neraspoređeno';
      const invited = 1;
      const arrived = guest.checkInGuest ? 1 : 0;

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
  }, [arrivalEligibleGuests, isPmzEmployee]);

  const showTopDepartments = nonPmArrivals >= 100 && topDepartments.length > 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundImage: `url(${backgroundLista.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          background: 'linear-gradient(135deg, rgba(4, 12, 38, 0.9), rgba(13, 27, 60, 0.78))',
        }}
        aria-hidden="true"
      />
      <header style={heroHeaderStyle}>
        <div style={heroInnerStyle}>
          <div style={heroCardStyle}>
            <div style={heroCardOverlayStyle} aria-hidden="true" />
            <div style={heroCardContentStyle}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'center',
                  maxWidth: '720px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.68rem',
                    letterSpacing: '0.4em',
                    textTransform: 'uppercase',
                    color: 'rgba(191, 219, 254, 0.9)',
                    fontWeight: 600,
                  }}
                >
                  Power Analytics
                </span>
                <h1
                  style={{
                    fontSize: '2.4rem',
                    fontWeight: 800,
                    letterSpacing: '-0.015em',
                    margin: 0,
                  }}
                >
                  Admin Dashboard
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    color: 'rgba(226, 232, 240, 0.75)',
                  }}
                >
                  Pregled ključnih metrika u stvarnom vremenu uz naglasak na brzom uvidu u odaziv gostiju.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '12px',
                  width: '100%',
                }}
              >
                <Link href="/lista" style={actionButtonStyle}>
                  Otvori listu gostiju
                </Link>
                <button
                  type="button"
                  onClick={fetchGuests}
                  disabled={loadingGuests}
                  style={{
                    ...refreshButtonStyle,
                    opacity: loadingGuests ? 0.6 : 1,
                    cursor: loadingGuests ? 'wait' : 'pointer',
                  }}
                >
                  {loadingGuests ? 'Osvježavanje…' : 'Osvježi podatke'}
                </button>
              </div>

              {error && (
                <div
                  style={{
                    width: '100%',
                    borderRadius: '20px',
                    border: '1px solid rgba(248, 113, 113, 0.6)',
                    background: 'rgba(239, 68, 68, 0.25)',
                    padding: '14px 18px',
                    fontSize: '0.9rem',
                    color: '#fee2e2',
                    boxShadow: '0 14px 32px rgba(220, 38, 38, 0.35)',
                  }}
                >
                  {error}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '18px',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.35em',
                      textTransform: 'uppercase',
                      color: 'rgba(191, 219, 254, 0.7)',
                      fontWeight: 600,
                    }}
                  >
                    Philip Morris Zagreb
                  </span>
                  <div style={toggleGroupStyle}>
                    <button
                      type="button"
                      onClick={() => setIncludePMZ(true)}
                      style={toggleButtonStyle(includePMZ)}
                      aria-pressed={includePMZ}
                    >
                      Uključi
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludePMZ(false)}
                      style={toggleButtonStyle(!includePMZ)}
                      aria-pressed={!includePMZ}
                    >
                      Isključi
                    </button>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      color: 'rgba(226, 232, 240, 0.7)',
                      maxWidth: '360px',
                      textAlign: 'center',
                    }}
                  >
                    {includePMZ
                      ? 'Prikazane metrike uključuju PMZ zaposlenike.'
                      : 'PMZ zaposlenici su isključeni iz prikaza metrika.'}
                  </p>
                </div>

                <div style={metricsGridStyle}>
                  <div style={metricBoxStyle}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        letterSpacing: '0.32em',
                        textTransform: 'uppercase',
                        color: 'rgba(191, 219, 254, 0.75)',
                        fontWeight: 600,
                      }}
                    >
                      Ukupni broj dolazaka
                    </span>
                    <span
                      style={{
                        fontSize: '3.4rem',
                        fontWeight: 900,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {numberFormatter.format(totalArrivals)}
                    </span>
                    <span
                      style={{
                        fontSize: '0.92rem',
                        color: 'rgba(148, 197, 255, 0.85)',
                        fontWeight: 500,
                      }}
                    >
                      ({numberFormatter.format(arrivedGuestCount)} gosti · {numberFormatter.format(arrivedCompanionCount)} pratnja)
                    </span>
                  </div>

                  <div style={metricBoxStyle}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        letterSpacing: '0.32em',
                        textTransform: 'uppercase',
                        color: 'rgba(191, 219, 254, 0.75)',
                        fontWeight: 600,
                      }}
                    >
                      Ukupan broj pozvanih (gosti + pratnja)
                    </span>
                    <span
                      style={{
                        fontSize: '3.1rem',
                        fontWeight: 900,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {numberFormatter.format(totalInvitedGuests)}
                    </span>
                    {!includePMZ && (
                      <span
                        style={{
                          fontSize: '0.82rem',
                          color: 'rgba(226, 232, 240, 0.72)',
                          fontWeight: 500,
                        }}
                      >
                        (bez Philip Morris Zagreb)
                      </span>
                    )}
                  </div>
                </div>

                <div style={progressSectionStyle}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        letterSpacing: '0.32em',
                        textTransform: 'uppercase',
                        color: 'rgba(191, 219, 254, 0.75)',
                        fontWeight: 600,
                      }}
                    >
                      Napredak dolaska gostiju (bez pratnje)
                    </span>
                    <span
                      style={{
                        fontSize: '0.9rem',
                        color: 'rgba(226, 232, 240, 0.82)',
                      }}
                    >
                      {numberFormatter.format(arrivedGuestCount)} / {numberFormatter.format(guestCount)} gostiju evidentirano
                    </span>
                  </div>
                  <div style={progressTrackStyle}>
                    <div
                      style={{
                        height: '100%',
                        width: `${guestArrivalProgressWidth}%`,
                        borderRadius: 'inherit',
                        background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.85), rgba(16, 185, 129, 0.88))',
                        boxShadow: '0 8px 18px rgba(45, 212, 191, 0.35)',
                        transition: 'width 0.4s ease',
                      }}
                      aria-hidden="true"
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '0.92rem',
                      color: 'rgba(190, 242, 255, 0.88)',
                      fontWeight: 600,
                    }}
                  >
                    {guestArrivalPercentage.toFixed(1)}%
                  </span>
                </div>

                <div style={topDepartmentsStyle}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#f8fafc',
                      }}
                    >
                      Top odjeli prema odazivu
                    </h2>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        letterSpacing: '0.28em',
                        textTransform: 'uppercase',
                        color: 'rgba(148, 197, 255, 0.7)',
                        fontWeight: 600,
                      }}
                    >
                      Bez zaposlenika PMZ
                    </span>
                  </div>
                  {showTopDepartments ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      }}
                    >
                      {topDepartments.map((department, index) => {
                        const percentage = department.responseRate * 100;
                        return (
                          <div key={department.department} style={topDepartmentItemStyle}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '16px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '14px',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '2rem',
                                    fontWeight: 800,
                                    color: 'rgba(191, 219, 254, 0.9)',
                                  }}
                                >
                                  {index + 1}.
                                </span>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '1rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {department.department}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.85rem',
                                      color: 'rgba(226, 232, 240, 0.75)',
                                    }}
                                  >
                                    {numberFormatter.format(department.arrived)} / {numberFormatter.format(department.invited)} dolazaka
                                  </span>
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: '2.2rem',
                                  fontWeight: 800,
                                  color: '#bbf7d0',
                                }}
                              >
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div
                              style={{
                                width: '100%',
                                height: '10px',
                                borderRadius: '9999px',
                                background: 'rgba(148, 163, 184, 0.35)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, percentage)}%`,
                                  height: '100%',
                                  borderRadius: 'inherit',
                                  background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.85), rgba(34, 197, 94, 0.85))',
                                  boxShadow: '0 8px 16px rgba(34, 197, 94, 0.35)',
                                  transition: 'width 0.4s ease',
                                }}
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        color: 'rgba(226, 232, 240, 0.75)',
                      }}
                    >
                      Top lista postaje dostupna nakon što evidentiramo najmanje 100 dolazaka (trenutno {numberFormatter.format(nonPmArrivals)}).
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};

export default AdminPage;
