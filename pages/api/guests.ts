import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { Fields as F, getGuests } from '../../lib/airtable';

const CreateBody = z.object({
  department: z.string().optional(),
  responsible: z.string().optional(),
  company: z.string().optional(),
  guest: z.string().min(1),
  plusOne: z.string().optional(),
});

type AirtableCreateResponse = {
  id: string;
  fields: Record<string, unknown>;
};

const API = 'https://api.airtable.com/v0';

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'POST') {
    return handlePost(req, res);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { q, department, responsible } = req.query;

  try {
    const guests = await getGuests({
      q: q as string,
      department: department as string,
      responsible: responsible as string,
    });
    return res.status(200).json(guests);
  } catch (error) {
    console.error('Error fetching guests:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to fetch guests', details: errorMessage });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body = CreateBody.parse(req.body);
    const guestName = body.guest.trim();
    if (!guestName) {
      return res.status(400).json({ error: 'Invalid body', message: 'Guest is required' });
    }

    const base = env('AIRTABLE_BASE_ID');
    const table = env('AIRTABLE_TABLE_NAME');

    const payload = {
      fields: {
        [F.department]: body.department?.trim() ?? '',
        [F.responsible]: body.responsible?.trim() ?? '',
        [F.company]: body.company?.trim() ?? '',
        [F.guest]: guestName,
        [F.plusOne]: body.plusOne?.trim() ?? '',
        [F.arrival]: 'UNKNOWN',
        [F.guestIn]: false,
        [F.plusOneIn]: false,
        [F.gift]: false,
      },
    } as const;

    const response = await fetch(
      `${API}/${encodeURIComponent(base)}/${encodeURIComponent(table)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env('AIRTABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await response.text();
    if (!response.ok) {
      console.error('[guests.create] Airtable error', response.status, text);
      return res
        .status(500)
        .json({ error: 'Airtable create failed', status: response.status, body: text });
    }

    const created = JSON.parse(text) as AirtableCreateResponse;
    return res.status(201).json({ ok: true, id: created.id, fields: created.fields });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid body', issues: error.flatten() });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[guests.create] unexpected error', message);
    return res.status(500).json({ error: 'Internal error', message });
  }
}