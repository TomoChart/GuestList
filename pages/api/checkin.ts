import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { toggleCheckIn } from "../../lib/airtable";

const bodySchema = z.object({
  recordId: z.string().min(1),
  guest: z.boolean(),
  plusOne: z.boolean(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const parsed = bodySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const record = await toggleCheckIn(parsed.data);
    res.status(200).json({ record });
  } catch (error) {
    console.error("Error updating check-in", error);
    res.status(500).json({
      error: "Unable to update check-in status. Please retry.",
    });
  }
}
