import axios from 'axios';
import dayjs from 'dayjs';

import { Guest } from '../types/Guest';

const tableName = process.env.AIRTABLE_TABLE_NAME ?? 'Final list';
const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;

if (!baseId) {
  throw new Error('Missing AIRTABLE_BASE_ID environment variable');
}

if (!apiKey) {
  throw new Error('Missing AIRTABLE_API_KEY environment variable');
}

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
const HEADERS = {
  Authorization: `Bearer ${apiKey}`,
};

type AirtableFields = Record<string, unknown>;

interface AirtableRecord {
  id: string;
  fields: AirtableFields;
}

type AirtableUpdateFields = Record<string, boolean | string | null>;

function mapArrivalConfirmation(value: unknown): Guest['arrivalConfirmation'] {
  const raw = (value ?? '').toString().trim().toUpperCase();

  if (raw === 'YES' || raw === 'DA') {
    return 'YES';
  }

  if (raw === 'NO' || raw === 'NE') {
    return 'NO';
  }

  return 'UNKNOWN';
}

function getStringField(fields: AirtableFields, key: string): string | undefined {
  const value = fields[key];
  return typeof value === 'string' ? value : undefined;
}

function getBooleanField(fields: AirtableFields, key: string): boolean {
  const value = fields[key];
  return typeof value === 'boolean' ? value : false;
}

function mapRecordToGuest(record: AirtableRecord): Guest {
  const fields = record.fields ?? {};

  return {
    id: record.id,
    department: getStringField(fields, 'PMZ odjel') ?? '',
    responsible: getStringField(fields, 'Odgovorna osoba') ?? '',
    company: getStringField(fields, 'Company') ?? getStringField(fields, 'Tvrtka') ?? '',
    guestName: getStringField(fields, 'Gost ime i prezime') ?? '',
    companionName: getStringField(fields, 'Pratnja') ?? undefined,
    arrivalConfirmation: mapArrivalConfirmation(fields['Arrival Confirmation']),
    checkInGuest: getBooleanField(fields, 'Check In Gost'),
    checkInCompanion: getBooleanField(fields, 'Check In Pratnja'),
    checkInTime: getStringField(fields, 'Vrijeme CheckIna') ?? undefined,
    giftReceived: getBooleanField(fields, 'Poklon'),
    giftReceivedTime: getStringField(fields, 'Vrijeme preuzimanja poklona') ?? undefined,
  };
}

async function fetchAllRecords(params: Record<string, string | number | undefined> = {}) {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const response = await axios.get<{ records: AirtableRecord[]; offset?: string }>(AIRTABLE_API_URL, {
      headers: HEADERS,
      params: {
        pageSize: 100,
        ...params,
        offset,
      },
    });

    records.push(...response.data.records);
    offset = response.data.offset;
  } while (offset);

  return records;
}

function includesInsensitive(value: string | undefined, search: string) {
  return (value ?? '').toLowerCase().includes(search.toLowerCase());
}

export async function getGuests({
  q,
  department,
  responsible,
}: {
  q?: string;
  department?: string;
  responsible?: string;
}): Promise<Guest[]> {
  const records = await fetchAllRecords();
  const guests = records.map(mapRecordToGuest);

  return guests.filter((guest) => {
    const matchesQuery = q ? [guest.guestName, guest.companionName, guest.responsible, guest.company].some((value) => includesInsensitive(value, q)) : true;
    const matchesDepartment = department ? guest.department === department : true;
    const matchesResponsible = responsible ? guest.responsible === responsible : true;

    return matchesQuery && matchesDepartment && matchesResponsible;
  });
}

export async function checkInGuest({
  recordId,
  guestArrived,
  companionArrived,
}: {
  recordId: string;
  guestArrived: boolean;
  companionArrived: boolean;
}): Promise<Guest> {
  const fields: AirtableUpdateFields = {
    'Check In Gost': guestArrived,
    'Check In Pratnja': companionArrived,
    'Vrijeme CheckIna': guestArrived || companionArrived ? dayjs().toISOString() : null,
  };

  const { data } = await axios.patch<AirtableRecord>(`${AIRTABLE_API_URL}/${recordId}`, { fields }, {
    headers: {
      ...HEADERS,
      'Content-Type': 'application/json',
    },
  });

  return mapRecordToGuest(data);
}

export async function toggleGift({ recordId, value }: { recordId: string; value: boolean }): Promise<Guest> {
  const fields: AirtableUpdateFields = {
    Poklon: value,
    'Vrijeme preuzimanja poklona': value ? dayjs().toISOString() : null,
  };

  const { data } = await axios.patch<AirtableRecord>(`${AIRTABLE_API_URL}/${recordId}`, { fields }, {
    headers: {
      ...HEADERS,
      'Content-Type': 'application/json',
    },
  });

  return mapRecordToGuest(data);
}

export async function getStats(): Promise<{
  totalInvited: number;
  totalArrived: number;
  totalGifts: number;
  arrivalsByDepartment: { department: string; arrived: number }[];
}> {
  const records = await fetchAllRecords();
  const guests = records.map(mapRecordToGuest);

  const totals = guests.reduce(
    (acc, guest) => {
      const invitedCount = 1 + (guest.companionName ? 1 : 0);
      const arrivedCount = (guest.checkInGuest ? 1 : 0) + (guest.checkInCompanion ? 1 : 0);

      acc.totalInvited += invitedCount;
      acc.totalArrived += arrivedCount;
      acc.totalGifts += guest.giftReceived ? 1 : 0;

      const departmentKey = guest.department || 'Unassigned';
      acc.arrivalsByDepartment[departmentKey] = (acc.arrivalsByDepartment[departmentKey] ?? 0) + arrivedCount;

      return acc;
    },
    {
      totalInvited: 0,
      totalArrived: 0,
      totalGifts: 0,
      arrivalsByDepartment: {} as Record<string, number>,
    }
  );

  const arrivalsByDepartment = Object.entries(totals.arrivalsByDepartment).map(([departmentName, arrived]) => ({
    department: departmentName,
    arrived,
  }));

  return {
    totalInvited: totals.totalInvited,
    totalArrived: totals.totalArrived,
    totalGifts: totals.totalGifts,
    arrivalsByDepartment,
  };
}