import { NextApiRequest, NextApiResponse } from 'next';
import { getGuests } from '../../lib/airtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { q, department, responsible, limit, offset } = req.query;

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