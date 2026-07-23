import { types } from "pg";
import type { NormalizedRepo } from "./github";

// GitHub repo ids are well under 2^53; parse bigint columns back to numbers so that
// `r.id` is numeric (matching the search API), not the pg-default string.
types.setTypeParser(types.builtins.INT8, (v: string) => Number(v));

function parseConn(cs: string): { host: string; port: number; user: string; password: string; database: string } {
  // postgres://user:password@host:port/database
  const u = new URL(cs);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: Number(u.port) || 5432,
    database: u.pathname.replace(/^\//, ""),
  };
}

/**
 * Upserts a repo and appends a star snapshot using a single connection.
 */
export async function upsertAndSnapshot(repos: NormalizedRepo[], connStr: string): Promise<void> {
  const { Client } = await import("pg");
  const cfg = parseConn(connStr);
  const client = new Client(cfg);
  await client.connect();
  try {
    await client.query("BEGIN");
    for (const r of repos) {
      await client.query(
        `INSERT INTO repos (id, full_name, description, language, topics, stars_total, forks, created_at, pushed_at, license, owner_avatar, html_url, updated_from_gh)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
         ON CONFLICT (id) DO UPDATE SET
           full_name=excluded.full_name, description=excluded.description, language=excluded.language,
           topics=excluded.topics, stars_total=excluded.stars_total, forks=excluded.forks,
           pushed_at=excluded.pushed_at, license=excluded.license, owner_avatar=excluded.owner_avatar,
           html_url=excluded.html_url, updated_from_gh=now()`,
        [r.id, r.fullName, r.description, r.language, r.topics, r.starsTotal, r.forks, r.createdAt, r.pushedAt, r.license, r.ownerAvatar, r.htmlUrl]
      );
      await client.query(
        `INSERT INTO star_snapshots (repo_id, captured_at, stars) VALUES ($1, now(), $2)
         ON CONFLICT (repo_id, captured_at) DO NOTHING`,
        [r.id, r.starsTotal]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch { /* rollback failed; surface original error */ }
    throw e;
  } finally {
    await client.end();
  }
}

export async function queryRisers(connStr: string, windowDays: number, limit: number): Promise<
  (NormalizedRepo & { starDelta: number; history: number[] })[]
> {
  const { Client } = await import("pg");
  const client = new Client(parseConn(connStr));
  await client.connect();
  try {
    const res = await client.query(
      `WITH latest AS (
         SELECT repo_id, stars, captured_at
         FROM star_snapshots
         WHERE captured_at = (SELECT MAX(captured_at) FROM star_snapshots)
       ),
       past AS (
         SELECT DISTINCT ON (repo_id) repo_id, stars AS past_stars
         FROM star_snapshots
         WHERE captured_at >= now() - ($1 || ' days')::interval
         ORDER BY repo_id, captured_at ASC
       )
       SELECT r.id, r.full_name AS "fullName", r.description, r.language, r.topics,
              r.stars_total AS "starsTotal", r.forks, r.created_at AS "createdAt",
              r.pushed_at AS "pushedAt", r.license, r.owner_avatar AS "ownerAvatar",
              r.html_url AS "htmlUrl",
              (latest.stars - COALESCE(past.past_stars, latest.stars)) AS delta
       FROM latest
       JOIN repos r ON r.id = latest.repo_id
       LEFT JOIN past ON past.repo_id = latest.repo_id
       ORDER BY delta DESC
       LIMIT $2`,
      [String(windowDays), limit]
    );
    const rows = res.rows as (NormalizedRepo & { delta: number })[];
    const ids = rows.map((r) => r.id);
    const historyMap: Record<number, number[]> = {};
    if (ids.length) {
      const hist = await client.query(
        `SELECT repo_id, array_agg(stars ORDER BY captured_at) AS pts
         FROM star_snapshots
         WHERE repo_id = ANY($1::bigint[]) AND captured_at >= now() - '7 days'::interval
         GROUP BY repo_id`,
        [ids]
      );
      for (const h of hist.rows) historyMap[h.repo_id as number] = h.pts as number[];
    }
    return rows.map((r) => ({ ...r, starDelta: r.delta, history: historyMap[r.id] ?? [] }));
  } finally {
    await client.end();
  }
}

/** Reads a star-history sparkline for one repo. */
export async function queryHistory(connStr: string, repoId: number, days: number): Promise<number[]> {
  const { Client } = await import("pg");
  const client = new Client(parseConn(connStr));
  await client.connect();
  try {
    const res = await client.query(
      `SELECT stars FROM star_snapshots
       WHERE repo_id = $1 AND captured_at >= now() - ($2 || ' days')::interval
       ORDER BY captured_at`,
      [repoId, String(days)]
    );
    return res.rows.map((r) => r.stars as number);
  } finally {
    await client.end();
  }
}
