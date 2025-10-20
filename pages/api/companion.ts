import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { airtableClient, AIRTABLE_TABLE_PATH } from '../../lib/airtableClient';

const Body = z.object({
  recordId: z.string().min(1),
  name: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { recordId, name } = Body.parse(req.body);
    const fieldName = 'Plus one';

    const payload = {
      fields: {
        [fieldName]: name && name.trim().length > 0 ? name.trim() : null,
      },
    };
    await airtableClient.patch(
      `${AIRTABLE_TABLE_PATH}/${encodeURIComponent(recordId)}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(200).json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[companion] ', message);
    return res.status(500).json({ error: 'Internal', message });
  }
}
