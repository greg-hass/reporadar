import { beforeEach, describe, expect, it, vi } from "vitest";

const clientQuery = vi.hoisted(() => vi.fn().mockResolvedValue({ rows: [] }));
const clientRelease = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const poolQuery = vi.hoisted(() => vi.fn().mockResolvedValue({ rows: [] }));
const poolConnect = vi.hoisted(() =>
	vi.fn().mockResolvedValue({ query: clientQuery, release: clientRelease }),
);

vi.mock("pg", () => ({
	Pool: vi.fn(function poolInstance() {
		return {
			query: poolQuery,
			connect: poolConnect,
		};
	}),
	types: { builtins: { INT8: 20 }, setTypeParser: vi.fn() },
}));

import {
	hasAlertEvent,
	recordAlertEvent,
	queryAlertCandidates,
	queryPulse,
	queryRepoByName,
	queryRisers,
	updateFavourites,
	upsertAndSnapshot,
} from "./db";
import type { NormalizedRepo } from "./github";

const repo: NormalizedRepo = {
	id: 42,
	fullName: "greg-hass/reporadar",
	description: "A dashboard",
	language: "TypeScript",
	topics: ["github"],
	starsTotal: 12,
	forks: 2,
	createdAt: "2026-01-01T00:00:00Z",
	pushedAt: "2026-01-02T00:00:00Z",
	license: "MIT",
	ownerAvatar: "https://example.com/avatar.png",
	htmlUrl: "https://github.com/greg-hass/reporadar",
};

beforeEach(() => {
	clientQuery.mockReset().mockResolvedValue({ rows: [] });
	clientRelease.mockClear();
	poolQuery.mockReset().mockResolvedValue({ rows: [] });
	poolConnect.mockClear();
});

describe("Postgres storage", () => {
	it("wraps snapshot writes in a transaction on a checked-out connection", async () => {
		await upsertAndSnapshot(
			[repo],
			"postgres://postgres:postgres@db:5432/reporadar",
		);

		// The transaction path checks out one pooled connection and releases it.
		expect(poolConnect).toHaveBeenCalledOnce();
		expect(clientRelease).toHaveBeenCalledOnce();
		const sqls = clientQuery.mock.calls.map((call: unknown[]) =>
			String(call[0]).replace(/\s+/g, " ").trim(),
		);
		expect(sqls[0]).toBe("BEGIN");
		expect(sqls[1]).toMatch(/^INSERT INTO repos /);
		expect(sqls[2]).toMatch(/^INSERT INTO star_snapshots /);
		expect(sqls[3]).toBe("COMMIT");
	});

	it("runs plain reads through the pool without checking out a connection", async () => {
		poolQuery.mockResolvedValueOnce({
			rows: [{ id: 42, fullName: "greg-hass/reporadar" }],
		});
		const found = await queryRepoByName(
			"postgres://postgres:postgres@db:5432/reporadar",
			"greg-hass/reporadar",
		);

		expect(found?.fullName).toBe("greg-hass/reporadar");
		expect(poolQuery).toHaveBeenCalledOnce();
		expect(poolConnect).not.toHaveBeenCalled();
	});

	it("returns Pulse changes with tracking coverage and stats", async () => {
		poolQuery
			.mockResolvedValueOnce({
				rows: [
					{
						...repo,
						delta: 4,
						snapshotCount: 2,
						trackedSince: "2026-07-01T00:00:00.000Z",
						lastSnapshotAt: "2026-07-01T01:00:00.000Z",
						isFavourite: true,
						kind: "watchlist-change",
					},
				],
			})
			.mockResolvedValueOnce({
				rows: [
					{
						reposTracked: 1,
						snapshotsToday: 2,
						starsGainedToday: 4,
						snapshotCount: 2,
						trackedSince: "2026-07-01T00:00:00.000Z",
						lastSnapshotAt: "2026-07-01T01:00:00.000Z",
					},
				],
			});

		const result = await queryPulse(
			"postgres://postgres:postgres@db:5432/reporadar",
			"2026-06-30T23:00:00.000Z",
			10,
		);

		expect(result.items[0]).toMatchObject({
			kind: "watchlist-change",
			starDelta: 4,
			snapshotCount: 2,
			isFavourite: true,
		});
		expect(result.stats).toMatchObject({
			reposTracked: 1,
			snapshotCount: 2,
		});
		expect(poolQuery).toHaveBeenCalledTimes(2);
		const pulseSql = String(poolQuery.mock.calls[0]?.[0]).replace(/\s+/g, " ");
		expect(pulseSql).toContain("captured_at <= $1::timestamptz");
		expect(pulseSql).toContain("LEFT JOIN favourites");
	});

	it("updates watchlist metadata with a parameterized bulk query", async () => {
		await updateFavourites(
			"postgres://postgres:postgres@db:5432/reporadar",
			[42, 43],
			{
				tags: ["frontend"],
				note: "Review this",
				status: "building",
				telegramEnabled: true,
				alertThreshold: 25,
			},
		);

		expect(poolQuery).toHaveBeenCalledOnce();
		const [sql, params] = poolQuery.mock.calls[0] as [string, unknown[]];
		expect(sql.replace(/\s+/g, " ")).toContain(
			"WHERE repo_id = ANY($1::bigint[])",
		);
		expect(params).toEqual([
			[42, 43],
			["frontend"],
			"Review this",
			"building",
			true,
			25,
		]);
	});

	it("finds threshold candidates and records Telegram dedupe events", async () => {
		poolQuery.mockResolvedValueOnce({
			rows: [
				{
					...repo,
					delta: 7,
					snapshotAt: "2026-07-01T01:00:00.000Z",
					previousSnapshotAt: "2026-07-01T00:00:00.000Z",
					tags: ["frontend"],
					note: "Review this",
					status: "watching",
					telegramEnabled: true,
					alertThreshold: 5,
				},
			],
		});
		const candidates = await queryAlertCandidates(
			"postgres://postgres:postgres@db:5432/reporadar",
		);
		expect(candidates[0]).toMatchObject({
			starDelta: 7,
			snapshotAt: "2026-07-01T01:00:00.000Z",
			watchlist: { telegramEnabled: true, alertThreshold: 5 },
		});
		const sql = String(poolQuery.mock.calls[0]?.[0]).replace(/\\s+/g, " ");
		expect(sql).toContain("f.telegram_enabled = true");
		expect(sql).toContain("LEFT JOIN LATERAL");

		poolQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{}] });
		expect(
			await hasAlertEvent(
				"postgres://postgres:postgres@db:5432/reporadar",
				"42:2026-07-01T01:00:00.000Z:5",
			),
		).toBe(true);
		await recordAlertEvent("postgres://postgres:postgres@db:5432/reporadar", {
			signature: "42:2026-07-01T01:00:00.000Z:5",
			repoId: 42,
			snapshotAt: "2026-07-01T01:00:00.000Z",
		});
		expect(poolQuery).toHaveBeenCalledTimes(3);
	});

	it("keeps every repo in Trending when batches are snapshotted separately", async () => {
		poolQuery
			.mockResolvedValueOnce({
				rows: [{ ...repo, delta: 3 }],
			})
			.mockResolvedValueOnce({
				rows: [{ repo_id: repo.id, pts: [12, 15] }],
			})
			.mockResolvedValueOnce({ rows: [{ n: 2 }] });

		const result = await queryRisers(
			"postgres://postgres:postgres@db:5432/reporadar",
			7,
			50,
		);

		expect(result.total).toBe(2);
		expect(result.items[0]).toMatchObject({
			id: repo.id,
			starDelta: 3,
			history: [12, 15],
		});
		const risersSql = String(poolQuery.mock.calls[0]?.[0]).replace(/\s+/g, " ");
		expect(risersSql).toContain("DISTINCT ON (repo_id)");
		expect(risersSql).toContain("ORDER BY repo_id, captured_at DESC");
		expect(risersSql).toContain("NOT EXISTS");
		expect(risersSql).not.toContain("captured_at = (SELECT MAX(captured_at)");
		expect(String(poolQuery.mock.calls[2]?.[0])).toContain(
			"COUNT(DISTINCT ss.repo_id)",
		);
		expect(String(poolQuery.mock.calls[2]?.[0])).toContain("NOT EXISTS");
	});
});
