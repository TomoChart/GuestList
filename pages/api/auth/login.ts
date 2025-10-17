import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const BodySchema = z.object({
  role: z.enum(['hostess', 'admin']),
  pin: z.string().min(1),
});

type Role = z.infer<typeof BodySchema>['role'];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body' });
  }

  const { role, pin } = parsed.data;

  const validPins: Record<Role, string> = {
    hostess: process.env.HOSTESS_PIN ?? '',
    admin: process.env.ADMIN_PIN ?? '',
  };

  if (validPins[role] === pin) {
    // HttpOnly cookie with role
    res.setHeader('Set-Cookie', `role=${role}; HttpOnly; Path=/; SameSite=Lax`);
    return res.status(200).json({ message: 'Login successful' });
  }

  return res.status(401).json({ error: 'Invalid PIN' });
}