// pages/api/checkin.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// ✅ prilagodi: točni nazivi polja u Airtableu
const FIELDS = {
  guestCheckIn: 'Guest CheckIn',
  plusOneCheckIn: 'Plus one CheckIn',
  checkInTime: 'CheckIn Time',
  farewellGift: 'Farewell gift',
  farewellTime: 'Farewell time',
} as const;

const BodySchema = z.object({
  recordId: z.string().min(1),
  // što mijenjamo ovim pozivom (barem jedno mora doći)
  guest: z.boolean().optional(),
  plusOne: z.boolean().optional(),
  farewellGift: z.boolean().optional(),
});

const AIRTABLE_API = 'https://api.airtable.com/v0';

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function patchAirtable(recordId: string, fields: Record<string, any>) {
  const baseId = getEnv('AIRTABLE_BASE_ID');
  const table = getEnv('AIRTABLE_TABLE_NAME');

  const res = await fetch(
    `${AIRTABLE_API}/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`,
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
  return res.json();
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
    const { recordId, guest, plusOne, farewellGift } = parsed.data;

    // Minimalna validacija – mora postojati barem jedno polje za izmjenu
    if (guest === undefined && plusOne === undefined && farewellGift === undefined) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    // Priprema fields objekta za Airtable
    const fields: Record<string, any> = {};

    // Check-in update
    if (guest !== undefined) fields[FIELDS.guestCheckIn] = guest;
    if (plusOne !== undefined) fields[FIELDS.plusOneCheckIn] = plusOne;

    // Ako je bilo koji check-in postavljen na true, upiši vrijeme (ako je false, ne diramo vrijeme)
    const setCheckInTime = (guest === true) || (plusOne === true);
    if (setCheckInTime) {
      fields[FIELDS.checkInTime] = new Date().toISOString();
    }

    // Gift update
    if (farewellGift !== undefined) {
      fields[FIELDS.farewellGift] = farewellGift;
      fields[FIELDS.farewellTime] = farewellGift ? new Date().toISOString() : null; // poništi vrijeme ako maknemo gift
    }

    const result = await patchAirtable(recordId, fields);

    return res.status(200).json({ ok: true, result });
  } catch (err: any) {
    // 👇 ovo će ti pomoći vidjeti pravi razlog 500 greške u Vercel logsima
    console.error('[checkin] error:', err?.message || err);
    return res.status(500).json({ error: 'Internal error', message: String(err?.message || err) });
  }
}
