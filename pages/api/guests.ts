import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { listGuests } from "../../lib/airtable";

const querySchema = z.object({
  q: z.string().optional(),
  department: z.string().optional(),
  responsible: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : undefined)),
  offset: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }

    const { limit, ...rest } = parsed.data;
    const response = await listGuests({
      ...rest,
      limit: limit && Number.isFinite(limit) ? Math.max(Math.min(limit, 200), 10) : undefined,
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching guests", error);
    res.status(500).json({
      error: "Unable to fetch guest list. Please try again shortly.",
    });
  }
}
