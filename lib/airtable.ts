import axios from 'axios';
import dayjs from 'dayjs';

import type { Guest } from '../types/Guest';

type AirtableFieldValue = string | boolean | number | null | undefined;

type AirtableFields = {
  'Gost ime i prezime'?: string;
  Pratnja?: string;
  'Odgovorna osoba'?: string;
  'PMZ odjel'?: string;
  'Arrival Confirmation'?: string;
  'Check In Gost'?: boolean;
  'Check In Pratnja'?: boolean;
  'Vrijeme CheckIna'?: string;
  Poklon?: boolean;
  'Vrijeme Poklona'?: string;
  Company?: string;
  [key: string]: AirtableFieldValue;
};

type AirtableRecord = {
  id: string;
  fields: AirtableFields;
};

type GuestFilters = {
  q?: string;
  department?: string;
  responsible?: string;
};

const tableName = encodeURIComponent(process.env.AIRTABLE_TABLE_NAME ?? 'Final list');
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${tableName}`;

const HEADERS = {
  Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

function escapeFormulaValue(value: string) {
  return value.replace(/'/g, "\\'");
}

async function fetchAllRecords(params: Record<string, string | number | undefined> = {}) {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const queryParams: Record<string, string | number> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams[key] = value;
      }
    });
    if (offset) {
      queryParams.offset = offset;
    }

    const { data } = await axios.get<{ records: AirtableRecord[]; offset?: string }>(AIRTABLE_API_URL, {
      headers: HEADERS,
      params: queryParams,
    });

    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

function mapRecordToGuest(record: AirtableRecord): Guest {
  const fields = record.fields ?? {};

  const arrivalConfirmationRaw = (fields['Arrival Confirmation'] as string | undefined)?.toUpperCase();
  const arrivalConfirmation = arrivalConfirmationRaw === 'YES' || arrivalConfirmationRaw === 'NO' ? arrivalConfirmationRaw : 'UNKNOWN';

  return {
    id: record.id,
    department: String(fields['PMZ odjel'] ?? ''),
    responsible: String(fields['Odgovorna osoba'] ?? ''),
    company: String(fields['Company'] ?? ''),
    guestName: String(fields['Gost ime i prezime'] ?? ''),
    companionName: fields['Pratnja'] ? String(fields['Pratnja']) : undefined,
    arrivalConfirmation,
    checkInGuest: Boolean(fields['Check In Gost']),
    checkInCompanion: Boolean(fields['Check In Pratnja']),
    checkInTime: fields['Vrijeme CheckIna'] ? String(fields['Vrijeme CheckIna']) : undefined,
    giftReceived: Boolean(fields['Poklon']),
    giftReceivedTime: fields['Vrijeme Poklona'] ? String(fields['Vrijeme Poklona']) : undefined,
  };
}

function buildFilterFormula({ q, department, responsible }: GuestFilters) {
  const clauses: string[] = [];

  if (q) {
    const escaped = escapeFormulaValue(q);
    clauses.push(
      `OR(SEARCH(LOWER('${escaped}'), LOWER({Gost ime i prezime})), SEARCH(LOWER('${escaped}'), LOWER({Pratnja})))`
    );
  }

  if (department) {
    clauses.push(`{PMZ odjel} = '${escapeFormulaValue(department)}'`);
  }

  if (responsible) {
    clauses.push(`{Odgovorna osoba} = '${escapeFormulaValue(responsible)}'`);
  }

  if (!clauses.length) {
    return undefined;
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return `AND(${clauses.join(',')})`;
}

export async function getGuests({ q, department, responsible }: GuestFilters) {
  const filterByFormula = buildFilterFormula({ q, department, responsible });
  const records = await fetchAllRecords({ filterByFormula });

  return records.map(mapRecordToGuest);
}

export async function checkInGuest({
  recordId,
  guestArrived,
  companionArrived,
}: {
  recordId: string;
  guestArrived: boolean;
  companionArrived: boolean;
}) {
  const now = dayjs().toISOString();

  await axios.patch(
    `${AIRTABLE_API_URL}/${recordId}`,
    {
      fields: {
        'Check In Gost': guestArrived,
        'Check In Pratnja': companionArrived,
        'Vrijeme CheckIna': now,
      },
    },
    { headers: HEADERS }
  );
}

export async function toggleGift({ recordId, value }: { recordId: string; value: boolean }) {
  await axios.patch(
    `${AIRTABLE_API_URL}/${recordId}`,
    {
      fields: {
        Poklon: value,
      },
    },
    { headers: HEADERS }
  );
}

export async function getStats() {
  const records = await fetchAllRecords();

  let totalInvited = 0;
  let totalArrived = 0;
  let totalGifts = 0;
  const arrivalsByDepartment: Record<string, number> = {};

  records.forEach((record) => {
    const fields = record.fields ?? {};
    const department = String(fields['PMZ odjel'] ?? 'Unknown');

    totalInvited += 1;

    const guestArrived = Boolean(fields['Check In Gost']);
    const companionArrived = Boolean(fields['Check In Pratnja']);
    const recordArrivedCount = Number(guestArrived) + Number(companionArrived);

    totalArrived += recordArrivedCount;

    if (fields['Poklon']) {
      totalGifts += 1;
    }

    if (!arrivalsByDepartment[department]) {
      arrivalsByDepartment[department] = 0;
    }

    arrivalsByDepartment[department] += recordArrivedCount;
  });

  const chartData = Object.entries(arrivalsByDepartment).map(([department, arrived]) => ({
    department,
    arrived,
  }));

  return {
    totals: {
      invited: totalInvited,
      arrived: totalArrived,
      gifts: totalGifts,
    },
    arrivalsByDepartment: chartData,
  };
}
