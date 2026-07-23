import type { VercelRequest, VercelResponse } from "@vercel/node";
import { githubSearch, type SearchQuery } from "./_lib/github";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const qs = req.query as Record<string, string | string[]>;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const token = process.env.GITHUB_SERVER_TOKEN ?? "";
  if (!token) {
    res.status(500).json({ error: "GITHUB_SERVER_TOKEN not set" });
    return;
  }

  const topicsRaw = one(qs.topics);
  const topics = topicsRaw ? topicsRaw.split(",").filter(Boolean) : undefined;
  const query: SearchQuery = {
    q: one(qs.q) ?? "",
    language: one(qs.language) || undefined,
    topics,
    minStars: one(qs.minStars) ? Number(one(qs.minStars)) : undefined,
    createdSinceDays: one(qs.createdSinceDays) ? Number(one(qs.createdSinceDays)) : undefined,
    sort: one(qs.sort),
    page: one(qs.page) ? Number(one(qs.page)) : undefined,
  };

  if (!query.q) {
    res.status(400).json({ error: "q is required" });
    return;
  }

  try {
    const result = await githubSearch(query, token);
    res.status(200).json({ items: result.items, total: result.total });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "search failed";
    const status = msg.startsWith("GitHub 403") ? 429 : 500;
    res.status(status).json({ error: msg });
  }
}
