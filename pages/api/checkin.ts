// pages/api/checkin.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

/** Airtable field names (exact, per your base) */
const FIELDS = {
  guestCheckIn: 'Guest CheckIn',
  plusOneCheckIn: 'Plus one CheckIn',
  checkInTime: 'CheckIn Time',
  farewellGift: 'Farewell gift',
  farewellTime: 'Farewell time',
} as const;

/** Request body shape */
const BodySchema = z.object({
  recordId: z.string().min(1),
  guest: z.boolean().optional(),
  plusOne: z.boolean().optional(),
  farewellGift: z.boolean().optional(),
});
type Body = z.infer<typeof BodySchema>;

/** Supported field value types for Airtable PATCH */
type AirtableFieldValue = string | boolean | number | null;

/** Response for a single Airtable record */
interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

const AIRTABLE_API = 'https://api.airtable.com/v0';

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function patchAirtable(
  recordId: string,
  fields: Record<string, AirtableFieldValue>
): Promise<AirtableRecord> {
  const baseId = getEnv('AIRTABLE_BASE_ID');
  const table = getEnv('AIRTABLE_TABLE_NAME');

  const res = await fetch(
    `${AIRTABLE_API}/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}/${encodeURIComponent(
      recordId
    )}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${getEnv('AIRTABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Airtable PATCH failed: ${res.status} ${res.statusText} ${text}`);
  }
  const data = (await res.json()) as AirtableRecord;
  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const { recordId, guest, plusOne, farewellGift } = parsed.data as Body;

    // at least one field must change
    if (guest === undefined && plusOne === undefined && farewellGift === undefined) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const fields: Record<string, AirtableFieldValue> = {};

    // check-in toggles
    if (guest !== undefined) fields[FIELDS.guestCheckIn] = guest;
    if (plusOne !== undefined) fields[FIELDS.plusOneCheckIn] = plusOne;

    // set check-in time if any becomes true
    const setCheckInTime = guest === true || plusOne === true;
    if (setCheckInTime) {
      fields[FIELDS.checkInTime] = new Date().toISOString();
    }

    // gift toggle
    if (farewellGift !== undefined) {
      fields[FIELDS.farewellGift] = farewellGift;
      fields[FIELDS.farewellTime] = farewellGift ? new Date().toISOString() : null;
    }

    const result = await patchAirtable(recordId, fields);

    return res.status(200).json({ ok: true, record: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // This shows up in Vercel logs for debugging
    console.error('[checkin] error:', msg);
    return res.status(500).json({ error: 'Internal error', message: msg });
  }
}
