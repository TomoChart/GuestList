import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const Body = z.object({
  recordId: z.string().min(1),
  name: z.string().optional(),
});

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { recordId, name } = Body.parse(req.body);
    const base = env('AIRTABLE_BASE_ID');
    const table = env('AIRTABLE_TABLE_NAME');
    const fieldName = 'Plus one';

    const payload = {
      fields: {
        [fieldName]: name && name.trim().length > 0 ? name.trim() : null,
      },
    };

    const response = await fetch(
      `https://api.airtable.com/v0/${encodeURIComponent(base)}/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${env('AIRTABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await response.text();
    if (!response.ok) {
      return res.status(500).json({ error: 'Airtable error', status: response.status, body: text });
    }

    return res.status(200).json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[companion] ', message);
    return res.status(500).json({ error: 'Internal', message });
  }
}
