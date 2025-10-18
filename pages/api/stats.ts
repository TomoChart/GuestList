import type { NextApiRequest, NextApiResponse } from "next";

import { listGuests } from "../../lib/airtable";

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
    const response = await listGuests({ limit: 1 });
    res.status(200).json({
      metrics: response.metrics,
      breakdowns: response.breakdowns,
    });
  } catch (error) {
    console.error("Error fetching stats", error);
    res.status(500).json({ error: "Unable to load statistics." });
  }
}
