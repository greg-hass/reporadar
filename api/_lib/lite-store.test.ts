import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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

		const reloaded = new LiteStore(dir);
		expect(await reloaded.queryRepoByName(repo.fullName)).toEqual(repo);
		expect(await reloaded.listFavouriteIds()).toEqual([repo.id]);
		expect(
			(await reloaded.queryHistory(repo.id, 30)).map((point) => point.stars),
		).toEqual([12]);
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
});
