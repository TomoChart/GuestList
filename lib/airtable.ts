import axios from 'axios';
import dayjs from 'dayjs';

import { Guest } from '../types/Guest';

export const Fields = {
  department: 'PMZ Department',
  responsible: 'PMZ Responsible',
  company: 'Company',
  guest: 'Guest',
  plusOne: 'Plus one',
  arrival: 'Arrival Confirmation',
  guestIn: 'Guest CheckIn',
  plusOneIn: 'Plus one CheckIn',
  gift: 'Farewell gift',
} as const;

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
  department: [Fields.department, 'PMZ Deparment'],
  responsible: [Fields.responsible],
  company: [Fields.company],
  guestName: [Fields.guest],
  companionName: [Fields.plusOne],
  arrivalConfirmation: [Fields.arrival, 'Arrival Confirmation '],
  checkInGuest: [Fields.guestIn],
  checkInCompanion: [Fields.plusOneIn],
  checkInTime: ['CheckIn Time'],
  giftReceived: [Fields.gift],
  giftReceivedTime: ['Farewell time'],
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
      fields[FIELD_ALIASES.arrivalConfirmation[0]]
    ),
    checkInGuest: getBooleanField(fields, FIELD_ALIASES.checkInGuest[0]),
    checkInCompanion: getBooleanField(fields, FIELD_ALIASES.checkInCompanion[0]),
    checkInTime: getFieldValue(getStringField, fields, FIELD_ALIASES.checkInTime) ?? undefined,
    giftReceived: getBooleanField(fields, FIELD_ALIASES.giftReceived[0]),
    giftReceivedTime: getFieldValue(getStringField, fields, FIELD_ALIASES.giftReceivedTime) ?? undefined,
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

    console.log('Airtable API Response:', response.data); // Log the API response

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

export async function toggleGift({ recordId, value }: { recordId: string; value: boolean }): Promise<Guest | undefined> {
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

  if (lastUnknownFieldError) {
    throw lastUnknownFieldError;
  }

  return undefined;
}

function validateFieldAliases() {
  const requiredFields: (keyof typeof FIELD_ALIASES)[] = [
    'department',
    'responsible',
    'company',
    'guestName',
    'companionName',
    'arrivalConfirmation',
    'checkInGuest',
    'checkInCompanion',
    'checkInTime',
    'giftReceived',
    'giftReceivedTime',
  ];

  const missingFields = requiredFields.filter(
    (field) => !FIELD_ALIASES[field]
  );

  if (missingFields.length > 0) {
    throw new Error(`Missing required Airtable fields: ${missingFields.join(', ')}`);
  }
}

validateFieldAliases();