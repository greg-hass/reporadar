import express from "express";
import path from "node:path";
import cron from "node-cron";
import { githubSearch, githubRepo, githubRepoById, githubReadme, type NormalizedRepo, type SearchQuery } from "../api/_lib/github";
import {
  upsertAndSnapshot,
  queryRisers,
  queryHistory,
  queryStats,
  ensureSchema,
  queryRepoByName,
  queryFavourites,
  listFavouriteIds,
  addFavourite,
  removeFavourite,
} from "../api/_lib/db";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const ONE = (v: unknown): string | undefined => (Array.isArray(v) ? v[0] : (v as string | undefined));

app.use(express.json());

// ──────────────────────────────────────────────────────────────
// API routes
// ──────────────────────────────────────────────────────────────

// GET /api/search?q=&language=&topics=&minStars=&createdSinceDays=&sort=&page=
app.get("/api/search", async (req, res) => {
  const token = process.env.GITHUB_SERVER_TOKEN ?? "";
  if (!token) {
    res.status(500).json({ error: "GITHUB_SERVER_TOKEN not set" });
    return;
  }
  const q = ONE(req.query.q);
  if (!q) {
    res.status(400).json({ error: "q is required" });
    return;
  }
  const topicsRaw = ONE(req.query.topics);
  const query: SearchQuery = {
    q,
    language: ONE(req.query.language) || undefined,
    topics: topicsRaw ? topicsRaw.split(",").filter(Boolean) : undefined,
    minStars: req.query.minStars ? Number(ONE(req.query.minStars)) : undefined,
    createdSinceDays: req.query.createdSinceDays ? Number(ONE(req.query.createdSinceDays)) : undefined,
    sort: ONE(req.query.sort),
    page: req.query.page ? Number(ONE(req.query.page)) : undefined,
  };
  try {
    const result = await githubSearch(query, token);
    res.json({ items: result.items, total: result.total });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "search failed";
    res.status(msg.startsWith("GitHub 403") ? 429 : 500).json({ error: msg });
  }
});

// GET /api/risers?window=1d|7d|30d&page=
app.get("/api/risers", async (req, res) => {
  const connStr = process.env.POSTGRES_URL ?? "";
  if (!connStr) {
    res.status(500).json({ error: "POSTGRES_URL not set" });
    return;
  }
  const windowRaw = ONE(req.query.window) ?? "7d";
  const windowDays = windowRaw === "1d" ? 1 : windowRaw === "30d" ? 30 : 7;
  const page = Math.max(1, Number(ONE(req.query.page)) || 1);
  const limit = 50;
  try {
    const { items, total } = await queryRisers(connStr, windowDays, limit, (page - 1) * limit);
    res.json({ items, total });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "risers failed" });
  }
});

// GET /api/stats — dashboard counters (repos tracked, snapshots today, stars gained, last run)
app.get("/api/stats", async (_req, res) => {
  const connStr = process.env.POSTGRES_URL ?? "";
  if (!connStr) {
    res.status(500).json({ error: "POSTGRES_URL not set" });
    return;
  }
  try {
    res.json(await queryStats(connStr));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "stats failed" });
  }
});

// GET /api/repos/:id/history?days=
app.get("/api/repos/:id/history", async (req, res) => {
  const connStr = process.env.POSTGRES_URL ?? "";
  if (!connStr) {
    res.status(500).json({ error: "POSTGRES_URL not set" });
    return;
  }
  const idNum = Number(req.params.id);
  if (!Number.isFinite(idNum)) {
    res.status(400).json({ error: "repo id must be a number" });
    return;
  }
  const days = req.query.days ? Number(ONE(req.query.days)) : 30;
  try {
    const points = await queryHistory(connStr, idNum, days);
    res.json({ points });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "history failed" });
  }
});

// GET /api/repo/:owner/:name — tracked repos from the DB, anything else live from GitHub.
app.get("/api/repo/:owner/:name", async (req, res) => {
  const connStr = process.env.POSTGRES_URL ?? "";
  const fullName = `${req.params.owner}/${req.params.name}`;
  try {
    if (connStr) {
      const cached = await queryRepoByName(connStr, fullName);
      if (cached) {
        res.json(cached);
        return;
      }
    }
    const token = process.env.GITHUB_SERVER_TOKEN ?? "";
    if (!token) {
      res.status(404).json({ error: "repo not tracked and GITHUB_SERVER_TOKEN not set" });
      return;
    }
    res.json(await githubRepo(req.params.owner, req.params.name, token));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "repo lookup failed";
    res.status(msg.startsWith("GitHub 404") ? 404 : 500).json({ error: msg });
  }
});

// GET /api/repo/:owner/:name/readme — GitHub-rendered README HTML (sanitized client-side).
app.get("/api/repo/:owner/:name/readme", async (req, res) => {
  const token = process.env.GITHUB_SERVER_TOKEN ?? "";
  if (!token) {
    res.status(500).json({ error: "GITHUB_SERVER_TOKEN not set" });
    return;
  }
  try {
    res.json({ html: await githubReadme(req.params.owner, req.params.name, token) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "readme failed" });
  }
});

// GET /api/favourites?window=1d|7d|30d — riser-shaped list of favourited repos.
app.get("/api/favourites", async (req, res) => {
  const connStr = process.env.POSTGRES_URL ?? "";
  if (!connStr) {
    res.status(500).json({ error: "POSTGRES_URL not set" });
    return;
  }
  const windowRaw = ONE(req.query.window) ?? "7d";
  const windowDays = windowRaw === "1d" ? 1 : windowRaw === "30d" ? 30 : 7;
  try {
    const items = await queryFavourites(connStr, windowDays);
    res.json({ items, total: items.length });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "favourites failed" });
  }
});

// GET /api/favourites/ids — lightweight toggle state.
app.get("/api/favourites/ids", async (_req, res) => {
  const connStr = process.env.POSTGRES_URL ?? "";
  if (!connStr) {
    res.status(500).json({ error: "POSTGRES_URL not set" });
    return;
  }
  try {
    res.json({ ids: await listFavouriteIds(connStr) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "favourites failed" });
  }
});

// PUT /api/favourites/:id — body: NormalizedRepo JSON.
app.put("/api/favourites/:id", async (req, res) => {
  const connStr = process.env.POSTGRES_URL ?? "";
  if (!connStr) {
    res.status(500).json({ error: "POSTGRES_URL not set" });
    return;
  }
  const repo = req.body as NormalizedRepo | undefined;
  if (!repo || !Number.isFinite(repo?.id) || typeof repo.fullName !== "string") {
    res.status(400).json({ error: "repo payload required" });
    return;
  }
  try {
    await addFavourite(connStr, repo);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "favourite failed" });
  }
});

// DELETE /api/favourites/:id
app.delete("/api/favourites/:id", async (req, res) => {
  const connStr = process.env.POSTGRES_URL ?? "";
  if (!connStr) {
    res.status(500).json({ error: "POSTGRES_URL not set" });
    return;
  }
  try {
    await removeFavourite(connStr, Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "unfavourite failed" });
  }
});

// ──────────────────────────────────────────────────────────────
// Frontend: serve the built Vite assets (SPA with history fallback)
// ──────────────────────────────────────────────────────────────
// __dirname is native to CommonJS (the server compiles to CJS).
// dist-server/server/index.js → ../../dist (the built frontend).
const distDir = path.resolve(__dirname, "..", "..", "dist");
app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

// ──────────────────────────────────────────────────────────────
// Daily star-tracking job (in-process, no separate cron container)
// ──────────────────────────────────────────────────────────────
async function runTrackingJob(): Promise<void> {
  const token = process.env.GITHUB_SERVER_TOKEN ?? "";
  const connStr = process.env.POSTGRES_URL ?? "";
  if (!token || !connStr) {
    console.error("[cron] skipping: GITHUB_SERVER_TOKEN and POSTGRES_URL must be set");
    return;
  }
  // Candidate discovery: a fixed base set plus a rotating slice picked by
  // hour-of-day, so the tracked pool diversifies over time without blowing
  // through the GitHub search rate limit (30 req/min authenticated).
  // `fresh` queries target newly-created repos; the rest target established
  // repos that are still active (pushed within the last 30 days).
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const baseQueries: { q: string; fresh?: boolean }[] = [
    { q: "stars:>50", fresh: true }, // broad net, recently created
    { q: "stars:>100 topic:ai", fresh: true },
    { q: "stars:>100 topic:cli", fresh: true },
    { q: `stars:>1000 pushed:>${monthAgo}` }, // established repos still active
  ];
  const rotatingQueries: { q: string; fresh?: boolean }[] = [
    { q: `stars:>500 language:typescript pushed:>${monthAgo}` },
    { q: `stars:>500 language:python pushed:>${monthAgo}` },
    { q: `stars:>500 language:rust pushed:>${monthAgo}` },
    { q: `stars:>500 language:go pushed:>${monthAgo}` },
    { q: "stars:>200 topic:llm", fresh: true },
    { q: "stars:>200 topic:agents", fresh: true },
    { q: "stars:>200 topic:mcp", fresh: true },
    { q: `stars:>200 topic:devtools pushed:>${monthAgo}` },
    { q: `stars:>200 topic:self-hosted pushed:>${monthAgo}` },
    { q: `stars:>200 topic:react pushed:>${monthAgo}` },
    { q: `stars:>200 topic:machine-learning pushed:>${monthAgo}` },
    { q: `stars:>200 topic:security pushed:>${monthAgo}` },
  ];
  const hour = new Date().getHours();
  const rotated = [
    rotatingQueries[hour % rotatingQueries.length],
    rotatingQueries[(hour + 4) % rotatingQueries.length],
    rotatingQueries[(hour + 8) % rotatingQueries.length],
  ];
  const queries = [...baseQueries, ...rotated];
  const seen = new Set<number>();
  const candidates: NormalizedRepo[] = [];
  for (const { q, fresh } of queries) {
    try {
      const { items } = await githubSearch(
        { q, createdSinceDays: fresh ? 7 : undefined, sort: "stars", page: 1 },
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
    } catch (e) {
      console.error(`[cron] query "${q}" failed:`, e instanceof Error ? e.message : e);
    }
  }
  if (candidates.length) {
    await upsertAndSnapshot(candidates, connStr);
    console.log(`[cron] snapshotted ${candidates.length} repos`);
  } else {
    console.log("[cron] no candidates this run");
  }
  // Refresh favourites so they get hourly velocity data regardless of discovery.
  try {
    const favIds = await listFavouriteIds(connStr);
    const favRepos: NormalizedRepo[] = [];
    for (const id of favIds) {
      try {
        favRepos.push(await githubRepoById(id, token));
      } catch (e) {
        console.error(`[cron] favourite ${id} refresh failed:`, e instanceof Error ? e.message : e);
      }
    }
    if (favRepos.length) {
      await upsertAndSnapshot(favRepos, connStr);
      console.log(`[cron] refreshed ${favRepos.length}/${favIds.length} favourites`);
    }
  } catch (e) {
    console.error("[cron] favourites refresh failed:", e instanceof Error ? e.message : e);
  }
}

// Schedule: top of every hour. node-cron uses 5-field cron.
// On startup, run once immediately so a fresh deploy has data without waiting an hour.
const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? "0 * * * *";
app.listen(PORT, async () => {
  console.log(`RepoRadar listening on :${PORT}`);
  // Self-provision the schema (idempotent) so fresh deployments work without a manual migration.
  const connStr = process.env.POSTGRES_URL ?? "";
  if (connStr) {
    try {
      await ensureSchema(connStr);
      console.log("[db] schema ready");
    } catch (e) {
      console.error("[db] schema init failed:", e instanceof Error ? e.message : e);
    }
  }
  if (cron.validate(CRON_SCHEDULE)) {
    cron.schedule(CRON_SCHEDULE, () => {
      runTrackingJob().catch((e) => console.error("[cron] job failed:", e));
    });
    console.log(`[cron] scheduled: ${CRON_SCHEDULE}`);
  } else {
    console.warn(`[cron] invalid CRON_SCHEDULE "${CRON_SCHEDULE}", skipping`);
  }
  // Seed run on boot (non-blocking)
  runTrackingJob().catch((e) => console.error("[cron] seed run failed:", e));
});
