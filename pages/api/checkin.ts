import { NextApiRequest, NextApiResponse } from 'next';
import { checkInGuest } from '../../lib/airtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { recordId, guestArrived, companionArrived } = req.body;

  if (!recordId || guestArrived === undefined || companionArrived === undefined) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  try {
    await checkInGuest({ recordId, guestArrived, companionArrived });
    res.status(200).json({ message: 'Check-in successful' });
  } catch (error) {
    console.error('Error checking in guest:', error);
    res.status(500).json({ error: 'Failed to check in guest' });
  }
}