import axios from "axios";
import dayjs from "dayjs";

import {
  GuestBreakdownEntry,
  GuestListMetrics,
  GuestListResponse,
  GuestRecord,
} from "../types/Guest";

const tableName = process.env.AIRTABLE_TABLE_NAME ?? "Final list";
const baseId = process.env.AIRTABLE_BASE_ID;
const apiKey = process.env.AIRTABLE_API_KEY;

if (!baseId) {
  throw new Error("Missing AIRTABLE_BASE_ID environment variable");
}

if (!apiKey) {
  throw new Error("Missing AIRTABLE_API_KEY environment variable");
}

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
const DEFAULT_PAGE_SIZE = 100;
const METADATA_CACHE_TTL = 1000 * 60; // 1 minute

const HEADERS = {
  Authorization: `Bearer ${apiKey}`,
};

type AirtableFields = Record<string, unknown>;

interface AirtableRecordDto {
  id: string;
  fields: AirtableFields;
}

interface AirtableListResponse {
  records: AirtableRecordDto[];
  offset?: string;
}

interface MetadataCache {
  timestamp: number;
  departments: string[];
  responsibles: string[];
  total: number;
  metrics: GuestListMetrics;
  breakdowns: {
    byDepartment: GuestBreakdownEntry[];
    byResponsible: GuestBreakdownEntry[];
  };
}

const FIELD_NAMES = {
  pmzDepartment: "PMZ Deparment",
  pmzResponsible: "PMZ Responsible",
  company: "Company",
  guest: "Guest",
  plusOne: "Plus one",
  arrivalConfirmation: "Arrival Confirmation",
  guestCheckIn: "Guest CheckIn",
  plusOneCheckIn: "Plus one CheckIn",
  checkInTime: "CheckIn Time",
  farewellGift: "Farewell gift",
  farewellTime: "Farewell time",
} as const;

let metadataCache: MetadataCache | null = null;

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

function buildFilterFormula({
  q,
  department,
  responsible,
}: {
  q?: string;
  department?: string;
  responsible?: string;
}): string | undefined {
  const clauses: string[] = [];

  if (q) {
    const escapedQuery = escapeFormulaValue(q.toLowerCase());
    const searchTargets = [
      FIELD_NAMES.guest,
      FIELD_NAMES.plusOne,
      FIELD_NAMES.pmzResponsible,
      FIELD_NAMES.company,
    ]
      .map(
        (fieldName) =>
          `FIND('${escapedQuery}', LOWER({${fieldName}}))`
      )
      .join(",");

    clauses.push(`OR(${searchTargets})`);
  }

  if (department) {
    clauses.push(
      `{${FIELD_NAMES.pmzDepartment}} = '${escapeFormulaValue(department)}'`
    );
  }

  if (responsible) {
    clauses.push(
      `{${FIELD_NAMES.pmzResponsible}} = '${escapeFormulaValue(responsible)}'`
    );
  }

  if (!clauses.length) {
    return undefined;
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return `AND(${clauses.join(",")})`;
}

function mapArrivalConfirmation(value: unknown): GuestRecord["arrivalConfirmation"] {
  const normalized = (value ?? "").toString().trim().toUpperCase();

  if (normalized === "YES" || normalized === "DA") {
    return "YES";
  }

  if (normalized === "NO" || normalized === "NE") {
    return "NO";
  }

  return "UNKNOWN";
}

function getStringField(fields: AirtableFields, key: string): string | undefined {
  const value = fields[key];
  return typeof value === "string" ? value : undefined;
}

function getBooleanField(fields: AirtableFields, key: string): boolean {
  const value = fields[key];
  return typeof value === "boolean" ? value : false;
}

function mapRecord(record: AirtableRecordDto): GuestRecord {
  const { fields } = record;

  return {
    id: record.id,
    pmzDepartment: getStringField(fields, FIELD_NAMES.pmzDepartment) ?? "",
    pmzResponsible: getStringField(fields, FIELD_NAMES.pmzResponsible) ?? "",
    company: getStringField(fields, FIELD_NAMES.company) ?? "",
    guest: getStringField(fields, FIELD_NAMES.guest) ?? "",
    plusOne: getStringField(fields, FIELD_NAMES.plusOne),
    arrivalConfirmation: mapArrivalConfirmation(
      fields[FIELD_NAMES.arrivalConfirmation]
    ),
    guestCheckIn: getBooleanField(fields, FIELD_NAMES.guestCheckIn),
    plusOneCheckIn: getBooleanField(fields, FIELD_NAMES.plusOneCheckIn),
    checkInTime: getStringField(fields, FIELD_NAMES.checkInTime),
    farewellGift: getBooleanField(fields, FIELD_NAMES.farewellGift),
    farewellTime: getStringField(fields, FIELD_NAMES.farewellTime),
  };
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429 && attempt < 3) {
      const waitTime = 250 * 2 ** attempt;
      await delay(waitTime);
      return requestWithRetry(fn, attempt + 1);
    }

    throw error;
  }
}

async function fetchAllRecords(): Promise<AirtableRecordDto[]> {
  const results: AirtableRecordDto[] = [];
  let offset: string | undefined;

  do {
    const response = await requestWithRetry(() =>
      axios.get<AirtableListResponse>(AIRTABLE_API_URL, {
        headers: HEADERS,
        params: {
          offset,
        },
      })
    );

    results.push(...response.data.records);
    offset = response.data.offset;
  } while (offset);

  return results;
}

async function getMetadata(): Promise<MetadataCache> {
  if (metadataCache && Date.now() - metadataCache.timestamp < METADATA_CACHE_TTL) {
    return metadataCache;
  }

  const records = await fetchAllRecords();
  const mapped = records.map(mapRecord);

  const departments = new Set<string>();
  const responsibles = new Set<string>();
  const byDepartment = new Map<string, { invited: number; arrived: number }>();
  const byResponsible = new Map<string, { invited: number; arrived: number }>();

  const metrics = mapped.reduce<GuestListMetrics>(
    (acc, guest) => {
      const invited = 1 + (guest.plusOne ? 1 : 0);
      const arrived = (guest.guestCheckIn ? 1 : 0) + (guest.plusOneCheckIn ? 1 : 0);

      acc.arrivedTotal += arrived;
      acc.giftsGiven += guest.farewellGift ? 1 : 0;
      acc.totalInvited += invited;

      if (guest.pmzDepartment) {
        departments.add(guest.pmzDepartment);
        const current = byDepartment.get(guest.pmzDepartment) ?? { invited: 0, arrived: 0 };
        current.invited += invited;
        current.arrived += arrived;
        byDepartment.set(guest.pmzDepartment, current);
      }

      if (guest.pmzResponsible) {
        responsibles.add(guest.pmzResponsible);
        const current = byResponsible.get(guest.pmzResponsible) ?? { invited: 0, arrived: 0 };
        current.invited += invited;
        current.arrived += arrived;
        byResponsible.set(guest.pmzResponsible, current);
      }

      return acc;
    },
    { arrivedTotal: 0, giftsGiven: 0, totalInvited: 0 }
  );

  const mapToBreakdown = (
    input: Map<string, { invited: number; arrived: number }>
  ): GuestBreakdownEntry[] =>
    Array.from(input.entries())
      .map(([label, value]) => ({ label, invited: value.invited, arrived: value.arrived }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

  metadataCache = {
    timestamp: Date.now(),
    departments: Array.from(departments).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    ),
    responsibles: Array.from(responsibles).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    ),
    total: mapped.length,
    metrics,
    breakdowns: {
      byDepartment: mapToBreakdown(byDepartment),
      byResponsible: mapToBreakdown(byResponsible),
    },
  };

  return metadataCache;
}

function normalizeParams(params: Partial<ListGuestsParams>): Required<ListGuestsParams> {
  return {
    q: params.q?.trim() ?? "",
    department: params.department?.trim() ?? "",
    responsible: params.responsible?.trim() ?? "",
    limit: params.limit ?? DEFAULT_PAGE_SIZE,
    offset: params.offset ?? "",
  };
}

interface ListGuestsParams {
  q?: string;
  department?: string;
  responsible?: string;
  limit?: number;
  offset?: string;
}

export async function listGuests(params: ListGuestsParams = {}): Promise<GuestListResponse> {
  const { q, department, responsible, limit, offset } = normalizeParams(params);

  const airtableParams: Record<string, string> = {
    pageSize: limit.toString(),
  };

  if (offset) {
    airtableParams.offset = offset;
  }

  const filterFormula = buildFilterFormula({
    q: q || undefined,
    department: department || undefined,
    responsible: responsible || undefined,
  });

  if (filterFormula) {
    airtableParams.filterByFormula = filterFormula;
  }

  const response = await requestWithRetry(() =>
    axios.get<AirtableListResponse>(AIRTABLE_API_URL, {
      headers: HEADERS,
      params: airtableParams,
    })
  );

  const metadata = await getMetadata();

  return {
    records: response.data.records.map(mapRecord),
    offset: response.data.offset,
    limit,
    total: metadata.total,
    departments: metadata.departments,
    responsibles: metadata.responsibles,
    metrics: metadata.metrics,
    breakdowns: metadata.breakdowns,
  };
}

async function fetchRecord(recordId: string): Promise<AirtableRecordDto> {
  const response = await requestWithRetry(() =>
    axios.get<AirtableRecordDto>(`${AIRTABLE_API_URL}/${recordId}`, {
      headers: HEADERS,
    })
  );

  return response.data;
}

interface ToggleCheckInParams {
  recordId: string;
  guest: boolean;
  plusOne: boolean;
}

export async function toggleCheckIn({
  recordId,
  guest,
  plusOne,
}: ToggleCheckInParams): Promise<GuestRecord> {
  const existing = await fetchRecord(recordId);
  const previous = mapRecord(existing);

  const now = dayjs().toISOString();
  const anyChecked = guest || plusOne;
  const checkInTime = anyChecked
    ? previous.checkInTime ?? now
    : null;

  const { data } = await requestWithRetry(() =>
    axios.patch<AirtableRecordDto>(
      `${AIRTABLE_API_URL}/${recordId}`,
      {
        fields: {
          [FIELD_NAMES.guestCheckIn]: guest,
          [FIELD_NAMES.plusOneCheckIn]: plusOne,
          [FIELD_NAMES.checkInTime]: checkInTime,
        },
      },
      {
        headers: {
          ...HEADERS,
          "Content-Type": "application/json",
        },
      }
    )
  );

  metadataCache = null; // ensure metrics refresh

  return mapRecord(data);
}

interface ToggleGiftParams {
  recordId: string;
  value: boolean;
}

export async function toggleGift({
  recordId,
  value,
}: ToggleGiftParams): Promise<GuestRecord> {
  const existing = value ? await fetchRecord(recordId) : null;
  const previousTime = existing ? mapRecord(existing).farewellTime : null;
  const now = dayjs().toISOString();

  const { data } = await requestWithRetry(() =>
    axios.patch<AirtableRecordDto>(
      `${AIRTABLE_API_URL}/${recordId}`,
      {
        fields: {
          [FIELD_NAMES.farewellGift]: value,
          [FIELD_NAMES.farewellTime]: value ? previousTime ?? now : null,
        },
      },
      {
        headers: {
          ...HEADERS,
          "Content-Type": "application/json",
        },
      }
    )
  );

  metadataCache = null;

  return mapRecord(data);
}

export function clearMetadataCache(): void {
  metadataCache = null;
}
