export type ArrivalConfirmation = "YES" | "NO" | "UNKNOWN";

export interface GuestRecord {
  id: string;
  pmzDepartment: string;
  pmzResponsible: string;
  company: string;
  guest: string;
  plusOne?: string | null;
  arrivalConfirmation: ArrivalConfirmation;
  guestCheckIn: boolean;
  plusOneCheckIn: boolean;
  checkInTime?: string | null;
  farewellGift: boolean;
  farewellTime?: string | null;
}

export interface GuestListMetrics {
  arrivedTotal: number;
  giftsGiven: number;
  totalInvited: number;
}

export interface GuestBreakdownEntry {
  label: string;
  invited: number;
  arrived: number;
}

export interface GuestListResponse {
  records: GuestRecord[];
  offset?: string;
  limit: number;
  total: number;
  departments: string[];
  responsibles: string[];
  metrics: GuestListMetrics;
  breakdowns: {
    byDepartment: GuestBreakdownEntry[];
    byResponsible: GuestBreakdownEntry[];
  };
}
