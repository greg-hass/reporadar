import type { VercelRequest, VercelResponse } from "@vercel/node";
import { githubSearch, type NormalizedRepo } from "../_lib/github";
import { upsertAndSnapshot } from "../_lib/db";

// Vercel Cron endpoint. Protected by CRON_SECRET — Vercel sends it in the
// Authorization header. The route is invoked hourly via vercel.json crons.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>"; verify it to prevent
  // public invocation of this expensive job. Fail CLOSED: a missing CRON_SECRET
  // is treated as misconfigured (reject), not as "auth disabled."
  const authHeader = req.headers.authorization;
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const token = process.env.GITHUB_SERVER_TOKEN ?? "";
  const connStr = process.env.POSTGRES_URL ?? "";
  if (!token || !connStr) {
    res.status(500).json({ error: "GITHUB_SERVER_TOKEN and POSTGRES_URL must be set" });
    return;
  }

  // Candidate pool: recently created repos with traction, across a few popular queries.
  // Keep it light — a few hundred repos per tick to respect rate limits.
  const queries = ["stars:>50", "stars:>100 topic:ai", "stars:>100 topic:cli"];
  const seen = new Set<number>();
  const candidates: NormalizedRepo[] = [];

  try {
    for (const q of queries) {
      const { items } = await githubSearch(
        { q, createdSinceDays: 7, sort: "stars", page: 1 },
        token
      );
      for (const r of items) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          candidates.push(r);
        }
        if (candidates.length >= 200) break;
      }
      if (candidates.length >= 200) break;
    }

    await upsertAndSnapshot(candidates, connStr);
    res.status(200).json({ ok: true, processed: candidates.length });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "trackStars failed" });
  }
}
