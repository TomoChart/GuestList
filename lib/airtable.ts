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

const FIELD_ALIASES = {
  department: ['PMZ Deparment', 'PMZ Department', 'PMZ odjel'],
  responsible: ['PMZ Responsible', 'Odgovorna osoba'],
  company: ['Company', 'Tvrtka'],
  guestName: ['Guest', 'Gost ime i prezime'],
  companionName: ['Plus one', 'Pratnja'],
  arrivalConfirmation: ['Arrival Confirmation ', 'Arrival Confirmation'],
  checkInGuest: ['Guest CheckIn', 'Check In Gost'],
  checkInCompanion: ['Plus one CheckIn', 'Check In Pratnja'],
  checkInTime: ['CheckIn Time', 'Vrijeme CheckIna'],
  giftReceived: ['Farewell gift', 'Poklon'],
  giftReceivedTime: ['Farewell time', 'Vrijeme preuzimanja poklona'],
} as const;

interface AirtableErrorResponse {
  error?: {
    type?: string;
  };
}

function isUnknownFieldError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const errorType = (error.response?.data as AirtableErrorResponse | undefined)?.error?.type;
  return errorType === 'INVALID_REQUEST_UNKNOWN_FIELD_NAME';
}

function getFieldValue<T>(
  getter: (fields: AirtableFields, key: string) => T,
  fields: AirtableFields,
  aliases: readonly string[]
): T {
  for (const name of aliases) {
    const value = getter(fields, name);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return getter(fields, aliases[0]);
}

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
    department: getFieldValue(getStringField, fields, FIELD_ALIASES.department) ?? '',
    responsible: getFieldValue(getStringField, fields, FIELD_ALIASES.responsible) ?? '',
    company: getFieldValue(getStringField, fields, FIELD_ALIASES.company) ?? '',
    guestName: getFieldValue(getStringField, fields, FIELD_ALIASES.guestName) ?? '',
    companionName: getFieldValue(getStringField, fields, FIELD_ALIASES.companionName) ?? undefined,
    arrivalConfirmation: mapArrivalConfirmation(
      fields[FIELD_ALIASES.arrivalConfirmation[0]] ?? fields[FIELD_ALIASES.arrivalConfirmation[1]]
    ),
    checkInGuest:
      getBooleanField(fields, FIELD_ALIASES.checkInGuest[0]) ||
      getBooleanField(fields, FIELD_ALIASES.checkInGuest[1]),
    checkInCompanion:
      getBooleanField(fields, FIELD_ALIASES.checkInCompanion[0]) ||
      getBooleanField(fields, FIELD_ALIASES.checkInCompanion[1]),
    checkInTime:
      getFieldValue(getStringField, fields, FIELD_ALIASES.checkInTime) ?? undefined,
    giftReceived:
      getBooleanField(fields, FIELD_ALIASES.giftReceived[0]) ||
      getBooleanField(fields, FIELD_ALIASES.giftReceived[1]),
    giftReceivedTime:
      getFieldValue(getStringField, fields, FIELD_ALIASES.giftReceivedTime) ?? undefined,
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
  const checkInTimestamp = guestArrived || companionArrived ? dayjs().toISOString() : null;
  let lastUnknownFieldError: unknown;

  for (const guestField of FIELD_ALIASES.checkInGuest) {
    for (const companionField of FIELD_ALIASES.checkInCompanion) {
      for (const timeField of FIELD_ALIASES.checkInTime) {
        const fields: AirtableUpdateFields = {
          [guestField]: guestArrived,
          [companionField]: companionArrived,
          [timeField]: checkInTimestamp,
        };

        try {
          const { data } = await axios.patch<AirtableRecord>(
            `${AIRTABLE_API_URL}/${recordId}`,
            { fields },
            {
              headers: {
                ...HEADERS,
                'Content-Type': 'application/json',
              },
            }
          );

          return mapRecordToGuest(data);
        } catch (error) {
          if (isUnknownFieldError(error)) {
            lastUnknownFieldError = error;
            continue;
          }

          throw error;
        }
      }
    }
  }

  throw lastUnknownFieldError ?? new Error('Failed to update guest check-in fields');
}

export async function toggleGift({ recordId, value }: { recordId: string; value: boolean }): Promise<Guest> {
  const giftTimestamp = value ? dayjs().toISOString() : null;
  let lastUnknownFieldError: unknown;

  for (const giftField of FIELD_ALIASES.giftReceived) {
    for (const giftTimeField of FIELD_ALIASES.giftReceivedTime) {
      const fields: AirtableUpdateFields = {
        [giftField]: value,
        [giftTimeField]: giftTimestamp,
      };

      try {
        const { data } = await axios.patch<AirtableRecord>(
          `${AIRTABLE_API_URL}/${recordId}`,
          { fields },
          {
            headers: {
              ...HEADERS,
              'Content-Type': 'application/json',
            },
          }
        );

        return mapRecordToGuest(data);
      } catch (error) {
        if (isUnknownFieldError(error)) {
          lastUnknownFieldError = error;
          continue;
        }

        throw error;
      }
    }
  }

  throw lastUnknownFieldError ?? new Error('Failed to update gift fields');
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