import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiteStore } from "./lite-store";
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

const tempDirs: string[] = [];

afterEach(async () => {
	vi.useRealTimers();
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("LiteStore", () => {
	it("persists repositories, snapshots, and favourites without Postgres", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-lite-"));
		tempDirs.push(dir);
		const store = new LiteStore(dir);

		await store.upsertAndSnapshot([repo]);
		await store.addFavourite(repo);
		await store.updateFavourites([repo.id], {
			tags: ["frontend", "infra"],
			note: "Check the tracking flow",
			status: "building",
			telegramEnabled: true,
			alertThreshold: 25,
		});

		const reloaded = new LiteStore(dir);
		expect(await reloaded.queryRepoByName(repo.fullName)).toEqual(repo);
		expect(await reloaded.listFavouriteIds()).toEqual([repo.id]);
		expect(
			(await reloaded.queryHistory(repo.id, 30)).map((point) => point.stars),
		).toEqual([12]);
		expect((await reloaded.queryFavourites(7))[0].watchlist).toEqual({
			tags: ["frontend", "infra"],
			note: "Check the tracking flow",
			status: "building",
			telegramEnabled: true,
			alertThreshold: 25,
		});
	});

	it("loads pre-metadata lite files with safe watchlist defaults", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-lite-legacy-"));
		tempDirs.push(dir);
		await writeFile(
			path.join(dir, "reporadar.json"),
			JSON.stringify({ repos: [repo], snapshots: [], favourites: [repo] }),
		);

		const store = new LiteStore(dir);
		expect((await store.queryFavourites(7))[0].watchlist).toEqual({
			tags: [],
			note: "",
			status: "watching",
			telegramEnabled: false,
			alertThreshold: 50,
		});
	});

	it("returns threshold-crossing Telegram candidates once and records dedupe state", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-alerts-"));
		tempDirs.push(dir);
		const store = new LiteStore(dir);

		await store.addFavourite(repo);
		await store.updateFavourites([repo.id], {
			telegramEnabled: true,
			alertThreshold: 5,
		});
		await store.upsertAndSnapshot([{ ...repo, starsTotal: 10 }]);
		vi.setSystemTime(new Date("2026-07-01T01:00:00.000Z"));
		await store.upsertAndSnapshot([{ ...repo, starsTotal: 20 }]);

		const candidates = await store.queryAlertCandidates();
		expect(candidates).toHaveLength(1);
		expect(candidates[0]).toMatchObject({
			starDelta: 10,
			snapshotAt: "2026-07-01T01:00:00.000Z",
			previousSnapshotAt: "2026-07-01T00:00:00.000Z",
			watchlist: { telegramEnabled: true, alertThreshold: 5 },
		});

		const event = {
			signature: `${repo.id}:${candidates[0].snapshotAt}:5`,
			repoId: repo.id,
			snapshotAt: candidates[0].snapshotAt,
		};
		await store.recordAlertEvent(event);
		expect(await store.hasAlertEvent(event.signature)).toBe(true);
	});

	it("returns tracked repositories as zero-delta risers until a second snapshot exists", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-lite-"));
		tempDirs.push(dir);
		const store = new LiteStore(dir);

		await store.upsertAndSnapshot([repo]);
		const result = await store.queryRisers(7, 50);

		expect(result.total).toBe(1);
		expect(result.items[0]).toMatchObject({
			id: repo.id,
			starDelta: 0,
			history: [12],
		});
	});

	it("returns watchlist changes and new signals since the last visit", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-pulse-"));
		tempDirs.push(dir);
		const store = new LiteStore(dir);
		const secondRepo = { ...repo, id: 43, fullName: "other/owner" };

		await store.upsertAndSnapshot([repo]);
		await store.addFavourite(repo);
		vi.setSystemTime(new Date("2026-07-01T01:00:00.000Z"));
		await store.upsertAndSnapshot([{ ...repo, starsTotal: 20 }, secondRepo]);

		const result = await store.queryPulse("2026-07-01T00:30:00.000Z", 10);

		expect(result.items).toHaveLength(2);
		expect(result.items[0]).toMatchObject({
			kind: "watchlist-change",
			starDelta: 8,
			snapshotCount: 2,
			isFavourite: true,
		});
		expect(result.items[1]).toMatchObject({
			kind: "new-signal",
			starDelta: 0,
			snapshotCount: 1,
			isFavourite: false,
		});
		expect(result.stats).toMatchObject({
			reposTracked: 2,
			snapshotCount: 3,
			trackedSince: "2026-07-01T00:00:00.000Z",
			lastSnapshotAt: "2026-07-01T01:00:00.000Z",
		});
	});

	it("survives concurrent mutations without losing writes", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-lite-"));
		tempDirs.push(dir);
		const store = new LiteStore(dir);
		const second = { ...repo, id: 43, fullName: "other/owner" };

		// Fire both mutations without awaiting between them — the write chain
		// must serialize the two persists so neither clobbers the other.
		await Promise.all([store.addFavourite(repo), store.addFavourite(second)]);

		const reloaded = new LiteStore(dir);
		const ids = await reloaded.listFavouriteIds();
		expect(ids.sort()).toEqual([42, 43]);
	});
});
