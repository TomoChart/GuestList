import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { role, pin } = req.body;

  if (!role || !pin) {
    return res.status(400).json({ error: 'Role and PIN are required' });
  }

  const validPins = {
    hostess: process.env.HOSTESS_PIN,
    admin: process.env.ADMIN_PIN,
  };

  if (validPins[role] === pin) {
    res.setHeader('Set-Cookie', `role=${role}; HttpOnly; Path=/`);
    return res.status(200).json({ message: 'Login successful' });
  }

  return res.status(401).json({ error: 'Invalid PIN' });
}