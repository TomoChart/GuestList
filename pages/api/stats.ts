import { NextApiRequest, NextApiResponse } from 'next';
import { getGuests } from '../../lib/airtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const stats = await getGuests({}); // Adjust parameters as needed
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}