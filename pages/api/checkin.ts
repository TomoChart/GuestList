// pages/api/checkin.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { airtableClient, AIRTABLE_TABLE_PATH } from '../../lib/airtableClient';

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
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { recordId, field, value } = Body.parse(req.body);

    const fields: Record<string, AirtableFieldValue> = { [FIELDS[field]]: value };
    const { data } = await airtableClient.patch<AirtableRecord>(
      `${AIRTABLE_TABLE_PATH}/${encodeURIComponent(recordId)}`,
      { fields },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(200).json({ ok: true, id: data.id, fields });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[checkin] ', msg);
    return res.status(500).json({ error: 'Internal', message: msg });
  }
}
