export interface Guest {
  id: string;
  department: string;
  responsible: string;
  company: string;
  guestName: string;
  companionName?: string;
  arrivalConfirmation: 'YES' | 'NO' | 'UNKNOWN';
  checkInGuest: boolean;
  checkInCompanion: boolean;
  checkInTime?: string;
  giftReceived: boolean;
  giftReceivedTime?: string;
}