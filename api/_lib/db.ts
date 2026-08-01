import { Pool, types } from "pg";
import type { NormalizedRepo } from "./github";

// GitHub repo ids are well under 2^53; parse bigint columns back to numbers so that
// `r.id` is numeric (matching the search API), not the pg-default string.
types.setTypeParser(types.builtins.INT8, (v: string) => Number(v));

// This module IS the SQL layer. Every statement below is deliberately
// hand-written and fully parameterized ($1/$2 placeholders, never string
// interpolation) — an ORM/query builder for eight queries would be
// over-engineering. The `no-sql-in-code` rule is suppressed per statement.
//
// One Pool per connection string, reused for the app's lifetime. Opening and
// closing a fresh Client on every query (as this file once did) burns a TCP
// connection + auth handshake per call and falls over under any concurrency.
const pools = new Map<string, Pool>();

function getPool(connStr: string): Pool {
	let pool = pools.get(connStr);
	if (!pool) {
		pool = new Pool({ connectionString: connStr });
		pools.set(connStr, pool);
	}
	return pool;
}

// Schema DDL — keep in sync with supabase/migrations/001_init.sql.
// Applied automatically at server startup so fresh deployments self-provision
// (all statements are idempotent).
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS repos (
  id              bigint PRIMARY KEY,
  full_name       text NOT NULL,
  description     text,
  language        text,
  topics          text[] NOT NULL DEFAULT '{}',
  stars_total     integer NOT NULL DEFAULT 0,
  forks           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL,
  pushed_at       timestamptz NOT NULL,
  license         text,
  owner_avatar    text NOT NULL,
  html_url        text NOT NULL,
  updated_from_gh timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS star_snapshots (
  repo_id     bigint NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL,
  stars       integer NOT NULL,
  PRIMARY KEY (repo_id, captured_at)
);

CREATE INDEX IF NOT EXISTS idx_star_snap_repo_time ON star_snapshots (repo_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_star_snap_captured ON star_snapshots (captured_at);
CREATE INDEX IF NOT EXISTS idx_repos_language ON repos (language);

CREATE TABLE IF NOT EXISTS favourites (
  repo_id   bigint PRIMARY KEY,
  payload   jsonb NOT NULL,
  added_at  timestamptz NOT NULL DEFAULT now()
);
`;

/** Creates the schema if missing. Safe to call on every boot. */
export async function ensureSchema(connStr: string): Promise<void> {
	await getPool(connStr).query(SCHEMA_SQL);
}

/**
 * Upserts a repo and appends a star snapshot in a single transaction.
 */
export async function upsertAndSnapshot(
	repos: NormalizedRepo[],
	connStr: string,
): Promise<void> {
	const client = await getPool(connStr).connect();
	try {
		await client.query("BEGIN");
		for (const r of repos) {
			// pi-lens-ignore: no-sql-in-code
			await client.query(
				`INSERT INTO repos (id, full_name, description, language, topics, stars_total, forks, created_at, pushed_at, license, owner_avatar, html_url, updated_from_gh)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
         ON CONFLICT (id) DO UPDATE SET
           full_name=excluded.full_name, description=excluded.description, language=excluded.language,
           topics=excluded.topics, stars_total=excluded.stars_total, forks=excluded.forks,
           pushed_at=excluded.pushed_at, license=excluded.license, owner_avatar=excluded.owner_avatar,
           html_url=excluded.html_url, updated_from_gh=now()`,
				[
					r.id,
					r.fullName,
					r.description,
					r.language,
					r.topics,
					r.starsTotal,
					r.forks,
					r.createdAt,
					r.pushedAt,
					r.license,
					r.ownerAvatar,
					r.htmlUrl,
				],
			);
			// pi-lens-ignore: no-sql-in-code
			await client.query(
				`INSERT INTO star_snapshots (repo_id, captured_at, stars) VALUES ($1, now(), $2)
         ON CONFLICT (repo_id, captured_at) DO NOTHING`,
				[r.id, r.starsTotal],
			);
		}
		await client.query("COMMIT");
	} catch (e) {
		try {
			await client.query("ROLLBACK");
		} catch {
			/* rollback failed; surface original error */
		}
		throw e;
	} finally {
		client.release();
	}
}

export async function queryRisers(
	connStr: string,
	windowDays: number,
	limit: number,
	offset = 0,
): Promise<{
	items: (NormalizedRepo & { starDelta: number; history: number[] })[];
	/** total repos in the latest snapshot (i.e. how many risers exist overall) */
	total: number;
}> {
	const pool = getPool(connStr);
	// pi-lens-ignore: no-sql-in-code
	const res = await pool.query(
		`WITH latest AS (
         -- The tracker writes general candidates and favourites in separate
         -- transactions. Pick the newest snapshot for each repo instead of
         -- treating the later batch as the only global "latest" snapshot.
         SELECT DISTINCT ON (repo_id) repo_id, stars, captured_at
         FROM star_snapshots
         ORDER BY repo_id, captured_at DESC
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
       LIMIT $2 OFFSET $3`,
		[String(windowDays), limit, offset],
	);
	const rows = res.rows as (NormalizedRepo & { delta: number })[];
	const ids = rows.map((r) => r.id);
	const historyMap: Record<number, number[]> = {};
	if (ids.length) {
		// pi-lens-ignore: no-sql-in-code
		const hist = await pool.query(
			`SELECT repo_id, array_agg(stars ORDER BY captured_at) AS pts
         FROM star_snapshots
         WHERE repo_id = ANY($1::bigint[]) AND captured_at >= now() - '7 days'::interval
         GROUP BY repo_id`,
			[ids],
		);
		for (const h of hist.rows)
			historyMap[h.repo_id as number] = h.pts as number[];
	}
	// pi-lens-ignore: no-sql-in-code
	const countRes = await pool.query(
		`SELECT COUNT(DISTINCT repo_id)::int AS n FROM star_snapshots`,
	);
	return {
		items: rows.map((r) => ({
			...r,
			starDelta: r.delta,
			history: historyMap[r.id] ?? [],
		})),
		total: (countRes.rows[0]?.n as number) ?? 0,
	};
}

export interface RepoStats {
	reposTracked: number;
	snapshotsToday: number;
	starsGainedToday: number;
	lastSnapshotAt: string | null; // ISO
}

/** Dashboard counters for the Observatory stats band. */
export async function queryStats(connStr: string): Promise<RepoStats> {
	// pi-lens-ignore: no-sql-in-code
	const res = await getPool(connStr).query(
		`SELECT
         (SELECT count(*) FROM repos) AS "reposTracked",
         (SELECT count(*) FROM star_snapshots WHERE captured_at::date = now()::date) AS "snapshotsToday",
         (SELECT COALESCE(SUM(latest - earliest), 0) FROM (
            SELECT repo_id, max(stars) AS latest, min(stars) AS earliest
            FROM star_snapshots WHERE captured_at::date = now()::date GROUP BY repo_id
          ) t) AS "starsGainedToday",
         (SELECT max(captured_at) FROM star_snapshots) AS "lastSnapshotAt"`,
	);
	const r = res.rows[0];
	return {
		reposTracked: Number(r.reposTracked),
		snapshotsToday: Number(r.snapshotsToday),
		starsGainedToday: Number(r.starsGainedToday),
		lastSnapshotAt: r.lastSnapshotAt
			? new Date(r.lastSnapshotAt).toISOString()
			: null,
	};
}

/** Reads timestamped star history for one repo (chart tooltips). */
export interface HistoryPoint {
	t: string; // ISO
	stars: number;
}

export async function queryHistory(
	connStr: string,
	repoId: number,
	days: number,
): Promise<HistoryPoint[]> {
	// pi-lens-ignore: no-sql-in-code
	const res = await getPool(connStr).query(
		`SELECT captured_at AS t, stars FROM star_snapshots
       WHERE repo_id = $1 AND captured_at >= now() - ($2 || ' days')::interval
       ORDER BY captured_at`,
		[repoId, String(days)],
	);
	return res.rows.map((r) => ({
		t: new Date(r.t).toISOString(),
		stars: r.stars as number,
	}));
}

/** Single repo by full_name, or null when not tracked. */
export async function queryRepoByName(
	connStr: string,
	fullName: string,
): Promise<NormalizedRepo | null> {
	// pi-lens-ignore: no-sql-in-code
	const res = await getPool(connStr).query(
		`SELECT id, full_name AS "fullName", description, language, topics,
              stars_total AS "starsTotal", forks, created_at AS "createdAt",
              pushed_at AS "pushedAt", license, owner_avatar AS "ownerAvatar", html_url AS "htmlUrl"
       FROM repos WHERE full_name = $1`,
		[fullName],
	);
	return (res.rows[0] as NormalizedRepo | undefined) ?? null;
}

export async function listFavouriteIds(connStr: string): Promise<number[]> {
	// pi-lens-ignore: no-sql-in-code
	const res = await getPool(connStr).query(`SELECT repo_id FROM favourites`);
	return res.rows.map((r) => r.repo_id as number);
}

export async function addFavourite(
	connStr: string,
	repo: NormalizedRepo,
): Promise<void> {
	// pi-lens-ignore: no-sql-in-code
	await getPool(connStr).query(
		`INSERT INTO favourites (repo_id, payload) VALUES ($1, $2) ON CONFLICT (repo_id) DO NOTHING`,
		[repo.id, JSON.stringify(repo)],
	);
}

export async function removeFavourite(
	connStr: string,
	repoId: number,
): Promise<void> {
	// pi-lens-ignore: no-sql-in-code
	await getPool(connStr).query(`DELETE FROM favourites WHERE repo_id = $1`, [
		repoId,
	]);
}

/** Favourites with riser-style velocity; falls back to the stored payload when not yet snapshotted. */
export async function queryFavourites(
	connStr: string,
	windowDays: number,
): Promise<
	(NormalizedRepo & { starDelta: number | null; history: number[] })[]
> {
	const pool = getPool(connStr);
	// pi-lens-ignore: no-sql-in-code
	const res = await pool.query(
		`WITH latest AS (
         SELECT repo_id, stars FROM star_snapshots
         WHERE captured_at = (SELECT MAX(captured_at) FROM star_snapshots)
       ),
       past AS (
         SELECT DISTINCT ON (repo_id) repo_id, stars AS past_stars
         FROM star_snapshots
         WHERE captured_at >= now() - ($1 || ' days')::interval
         ORDER BY repo_id, captured_at ASC
       )
       SELECT f.repo_id AS id,
              COALESCE(r.full_name, f.payload->>'fullName') AS "fullName",
              COALESCE(r.description, f.payload->>'description') AS description,
              COALESCE(r.language, f.payload->>'language') AS language,
              COALESCE(r.topics, ARRAY(SELECT jsonb_array_elements_text(f.payload->'topics'))) AS topics,
              COALESCE(r.stars_total, (f.payload->>'starsTotal')::int) AS "starsTotal",
              COALESCE(r.forks, (f.payload->>'forks')::int) AS forks,
              COALESCE(r.created_at, (f.payload->>'createdAt')::timestamptz) AS "createdAt",
              COALESCE(r.pushed_at, (f.payload->>'pushedAt')::timestamptz) AS "pushedAt",
              COALESCE(r.license, f.payload->>'license') AS license,
              COALESCE(r.owner_avatar, f.payload->>'ownerAvatar') AS "ownerAvatar",
              COALESCE(r.html_url, f.payload->>'htmlUrl') AS "htmlUrl",
              (latest.stars - COALESCE(past.past_stars, latest.stars)) AS delta
       FROM favourites f
       LEFT JOIN repos r ON r.id = f.repo_id
       LEFT JOIN latest ON latest.repo_id = f.repo_id
       LEFT JOIN past ON past.repo_id = f.repo_id
       ORDER BY f.added_at DESC`,
		[String(windowDays)],
	);
	const rows = res.rows as (NormalizedRepo & { delta: number | null })[];
	const ids = rows.map((r) => r.id);
	const historyMap: Record<number, number[]> = {};
	if (ids.length) {
		// pi-lens-ignore: no-sql-in-code
		const hist = await pool.query(
			`SELECT repo_id, array_agg(stars ORDER BY captured_at) AS pts
         FROM star_snapshots
         WHERE repo_id = ANY($1::bigint[]) AND captured_at >= now() - '7 days'::interval
         GROUP BY repo_id`,
			[ids],
		);
		for (const h of hist.rows)
			historyMap[h.repo_id as number] = h.pts as number[];
	}
	return rows.map((r) => ({
		...r,
		starDelta: r.delta ?? null,
		history: historyMap[r.id] ?? [],
	}));
}
