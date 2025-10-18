// pages/api/checkin.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const FIELDS = {
  guest: 'Guest CheckIn',
  plusOne: 'Plus one CheckIn',
  gift: 'Farewell gift',
} as const;

const Body = z.object({
  recordId: z.string().min(1),
  field: z.enum(['guest', 'plusOne', 'gift']),
  value: z.boolean(),
});

type AirtableFieldValue = string | boolean | number | null;
interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}
const API = 'https://api.airtable.com/v0';

function env(n: string): string {
  const v = process.env[n];
  if (!v) throw new Error(`Missing env ${n}`);
  return v;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { recordId, field, value } = Body.parse(req.body);
    const base = env('AIRTABLE_BASE_ID');
    const table = env('AIRTABLE_TABLE_NAME');

    const fields: Record<string, AirtableFieldValue> = { [FIELDS[field]]: value };

    const r = await fetch(
      `${API}/${encodeURIComponent(base)}/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${env('AIRTABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    );

    const text = await r.text();
    if (!r.ok) {
      return res.status(500).json({ error: 'Airtable error', status: r.status, body: text });
    }
    const data = JSON.parse(text) as AirtableRecord;
    return res.status(200).json({ ok: true, id: data.id, fields });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[checkin] ', msg);
    return res.status(500).json({ error: 'Internal', message: msg });
  }
}
