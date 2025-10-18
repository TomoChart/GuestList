import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { Fields as F, getGuests } from '../../lib/airtable';

const API_BASE = 'https://api.airtable.com/v0';

const CreateBody = z.object({
  department: z.string().optional(),
  responsible: z.string().optional(),
  company: z.string().optional(),
  guest: z.string().min(1),
  plusOne: z.string().optional(),
});

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const parsed = CreateBody.safeParse(req.body);

      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Invalid body';
        return res.status(400).json({ error: message });
      }

      const { department, responsible, company, guest, plusOne } = parsed.data;
      const trimmedGuest = guest.trim();
      if (!trimmedGuest) {
        return res.status(400).json({ error: 'Guest name is required' });
      }
      const payload = {
        fields: {
          [F.department]: department?.trim() ?? '',
          [F.responsible]: responsible?.trim() ?? '',
          [F.company]: company?.trim() ?? '',
          [F.guest]: trimmedGuest,
          [F.plusOne]: plusOne?.trim() ?? '',
          [F.arrival]: 'UNKNOWN',
          [F.guestIn]: false,
          [F.plusOneIn]: false,
          [F.gift]: false,
        },
      } as const;

      const baseId = encodeURIComponent(env('AIRTABLE_BASE_ID'));
      const tableName = encodeURIComponent(env('AIRTABLE_TABLE_NAME'));

      const response = await fetch(`${API_BASE}/${baseId}/${tableName}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env('AIRTABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();

      if (!response.ok) {
        console.error('[api/guests] Airtable create failed', response.status, text);
        return res.status(500).json({ error: 'Airtable create failed', status: response.status, body: text });
      }

      const created = JSON.parse(text) as { id: string; fields: Record<string, unknown> };
      return res.status(200).json({ ok: true, id: created.id, fields: created.fields });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[api/guests] create error', message);
      return res.status(500).json({ error: 'Airtable create failed', message });
    }
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { q, department, responsible } = req.query;

  try {
    const guests = await getGuests({
      q: q as string,
      department: department as string,
      responsible: responsible as string,
    });
    res.status(200).json(guests);
  } catch (error) {
    console.error('Error fetching guests:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to fetch guests', details: errorMessage });
  }
}