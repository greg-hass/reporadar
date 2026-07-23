import type { VercelRequest, VercelResponse } from "@vercel/node";
import { queryRisers } from "./_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const connStr = process.env.POSTGRES_URL ?? "";
  if (!connStr) {
    res.status(500).json({ error: "POSTGRES_URL not set" });
    return;
  }

  const windowRaw = (req.query.window as string | undefined) ?? "7d";
  const windowDays = windowRaw === "1d" ? 1 : windowRaw === "30d" ? 30 : 7;
  // Pagination param reserved for Phase 2; currently a single page of `limit` results.
  void Number(req.query.page ?? 1);
  const limit = 30;

  try {
    const items = await queryRisers(connStr, windowDays, limit);
    res.status(200).json({ items, total: items.length });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "risers failed" });
  }
}
