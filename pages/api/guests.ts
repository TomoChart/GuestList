import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { Fields as F, getGuests } from '../../lib/airtable';

const API = 'https://api.airtable.com/v0';
function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const CreateBody = z.object({
  department: z.string().optional(), // PMZ Deparment
  responsible: z.string().optional(), // PMZ Responsible
  company: z.string().optional(), // Company
  guest: z.string().min(1), // Guest (required)
  plusOne: z.string().optional(), // Plus one
});

async function createAirtableRecord(fields: Record<string, unknown>) {
  const base = env('AIRTABLE_BASE_ID');
  const table = env('AIRTABLE_TABLE_NAME');

  const res = await fetch(
    `${API}/${encodeURIComponent(base)}/${encodeURIComponent(table)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env('AIRTABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      // ✅ Sigurni format: "records: [{ fields: {...} }]"
      body: JSON.stringify({
        records: [{ fields }],
        typecast: true, // dopusti Airtableu da mapira vrijednosti (npr. u single select)
      }),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    // Vrati cijeli Airtable response u erroru da znamo točan razlog
    throw new Error(`Airtable create failed: ${res.status} ${res.statusText} :: ${text}`);
  }

  const data = JSON.parse(text) as {
    records: { id: string; fields: Record<string, unknown> }[];
  };
  const rec = data.records?.[0];
  return rec;
}

// === GET: fetch guests from Airtable ===
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const guests = await getGuests({});
    return res.status(200).json(guests);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[guests:GET] ', msg);
    return res.status(500).json({ error: 'Failed to fetch guests', message: msg });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'POST') {
    try {
      const body = CreateBody.parse(req.body);

      // ✅ Šaljemo SAMO “sigurna” polja (bez single-select vrijednosti poput Arrival Confirmation)
      const fields: Record<string, unknown> = {
        [F.department]: body.department ?? '',
        [F.responsible]: body.responsible ?? '',
        [F.company]: body.company ?? '',
        [F.guest]: body.guest,
        [F.plusOne]: body.plusOne ?? '',
        // ne šaljemo checkboxe: prazno = false u Airtableu
        // ne šaljemo "Arrival Confirmation" (single select može odbiti nepostojeću opciju)
      };

      const created = await createAirtableRecord(fields);
      return res.status(201).json({ ok: true, id: created.id, fields: created.fields });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[guests:POST] ', msg);
      return res.status(500).json({ error: 'Airtable create failed', message: msg });
    }
  }

  // …ostavi tvoj postojeći GET ovdje (ne diramo)
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}