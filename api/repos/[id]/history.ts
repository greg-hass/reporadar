import type { VercelRequest, VercelResponse } from "@vercel/node";
import { queryHistory } from "../../_lib/db";

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

  const idRaw = req.query.id as string | undefined;
  const daysRaw = req.query.days as string | undefined;
  if (!idRaw) {
    res.status(400).json({ error: "repo id required" });
    return;
  }
  const idNum = Number(idRaw);
  if (!Number.isFinite(idNum)) {
    res.status(400).json({ error: "repo id must be a number" });
    return;
  }
  const days = daysRaw ? Number(daysRaw) : 30;

  try {
    const points = await queryHistory(connStr, idNum, days);
    res.status(200).json({ points });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "repos_history failed" });
  }
}
