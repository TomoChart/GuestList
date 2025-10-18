import { NextApiRequest, NextApiResponse } from 'next';
import { toggleGift } from '../../lib/airtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { recordId, value } = req.body;

  if (!recordId || value === undefined) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  try {
    await toggleGift({ recordId, value });
    res.status(200).json({ message: 'Gift status updated successfully' });
  } catch (error) {
    console.error('Error updating gift status:', error);
    res.status(500).json({ error: 'Failed to update gift status' });
  }
}