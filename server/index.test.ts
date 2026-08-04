import { createServer, type Server } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStorage } from "../api/_lib/storage";
import {
	createApp,
	deliverWatchlistAlerts,
	isTelegramQuietHours,
	resolveDistDir,
	runTrackingJob,
	sendTelegramAlert,
	type AppConfig,
} from "./index";

const repoPayload = {
	id: 42,
	full_name: "greg-hass/reporadar",
	description: "A dashboard",
	language: "TypeScript",
	topics: ["github"],
	stargazers_count: 12,
	forks_count: 2,
	created_at: "2026-01-01T00:00:00Z",
	pushed_at: "2026-01-02T00:00:00Z",
	license: { spdx_id: "MIT" },
	owner: {
		avatar_url: "https://example.com/avatar.png",
		html_url: "https://github.com/greg-hass",
	},
	html_url: "https://github.com/greg-hass/reporadar",
};

const tempDirs: string[] = [];
const servers: Server[] = [];

afterEach(async () => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	await Promise.all(
		servers
			.splice(0)
			.map(
				(server) =>
					new Promise<void>((resolve) => server.close(() => resolve())),
			),
	);
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

async function listen(app: ReturnType<typeof createApp>): Promise<string> {
	const server = createServer(app);
	servers.push(server);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("test server did not bind");
	return `http://127.0.0.1:${address.port}`;
}

describe("RepoRadar API", () => {
	it("resolves frontend assets from source and compiled server layouts", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-dist-"));
		tempDirs.push(dir);
		await mkdir(path.join(dir, "dist"), { recursive: true });
		await writeFile(path.join(dir, "dist", "index.html"), "<!doctype html>");

		expect(resolveDistDir(path.join(dir, "server"))).toBe(
			path.join(dir, "dist"),
		);
		expect(resolveDistDir(path.join(dir, "dist-server", "server"))).toBe(
			path.join(dir, "dist"),
		);
	});

	it("sends Markdown through the configured bridge CLI", async () => {
		const dir = await mkdtemp(
			path.join(os.tmpdir(), "reporadar-telegram-cli-"),
		);
		tempDirs.push(dir);
		const bridge = path.join(dir, "bridge.cjs");
		await writeFile(
			bridge,
			"process.stdin.resume(); process.stdin.on('end', () => process.exit(0));",
		);

		await expect(
			sendTelegramAlert(
				{ telegramBridgeCli: bridge, telegramTimeoutMs: 2_000 },
				"RepoRadar test alert",
			),
		).resolves.toBeUndefined();
	});

	it("applies a quiet-hour window across midnight", () => {
		const config: AppConfig = {
			telegramQuietStartHour: 23,
			telegramQuietEndHour: 7,
		};
		expect(isTelegramQuietHours(config, new Date("2026-07-01T23:30:00"))).toBe(
			true,
		);
		expect(isTelegramQuietHours(config, new Date("2026-07-01T12:30:00"))).toBe(
			false,
		);
	});

	it("delivers Telegram candidates once and suppresses duplicate snapshots", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-alert-api-"));
		tempDirs.push(dir);
		const storage = createStorage({ mode: "lite", dataDir: dir });
		const alertRepo = {
			id: 42,
			fullName: "greg-hass/reporadar",
			description: "A dashboard",
			language: "TypeScript",
			topics: ["github"],
			starsTotal: 10,
			forks: 2,
			createdAt: "2026-01-01T00:00:00Z",
			pushedAt: "2026-01-02T00:00:00Z",
			license: "MIT",
			ownerAvatar: "https://example.com/avatar.png",
			htmlUrl: "https://github.com/greg-hass/reporadar",
		};
		await storage.addFavourite(alertRepo);
		await storage.updateFavourites([alertRepo.id], {
			telegramEnabled: true,
			alertThreshold: 5,
		});
		await storage.upsertAndSnapshot([alertRepo]);
		vi.setSystemTime(new Date("2026-07-01T01:00:00.000Z"));
		await storage.upsertAndSnapshot([{ ...alertRepo, starsTotal: 20 }]);

		const notify = vi.fn().mockResolvedValue(undefined);
		const config: AppConfig = { mode: "lite", dataDir: dir };
		expect(await deliverWatchlistAlerts(config, storage, notify)).toBe(1);
		expect(await deliverWatchlistAlerts(config, storage, notify)).toBe(0);
		expect(notify).toHaveBeenCalledOnce();
		expect(notify.mock.calls[0]?.[1]).toContain("+10 stars");
	});

	it("runs the basic API without Postgres in lite mode", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-api-"));
		tempDirs.push(dir);
		const config: AppConfig = { mode: "lite", dataDir: dir };
		const baseUrl = await listen(createApp(config));

		const missingQuery = await fetch(`${baseUrl}/api/search`);
		expect(missingQuery.status).toBe(400);

		const stats = await fetch(`${baseUrl}/api/stats`);
		expect(stats.status).toBe(200);
		expect(await stats.json()).toMatchObject({
			reposTracked: 0,
			snapshotsToday: 0,
		});

		const pulse = await fetch(`${baseUrl}/api/pulse?since=not-a-date`);
		expect(pulse.status).toBe(200);
		expect(await pulse.json()).toMatchObject({
			items: [],
			stats: { reposTracked: 0, snapshotCount: 0, trackedSince: null },
		});
	});

	it("lets the lite tracking job seed a local snapshot anonymously", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-cron-"));
		tempDirs.push(dir);
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response(
						JSON.stringify({ total_count: 1, items: [repoPayload] }),
						{ status: 200 },
					),
				),
		);
		const config: AppConfig = { mode: "lite", dataDir: dir };
		const storage = createStorage(config);

		await runTrackingJob(config, storage);

		const result = await storage.queryRisers(7, 50);
		expect(result.items[0]).toMatchObject({
			fullName: "greg-hass/reporadar",
			starDelta: 0,
		});
	});

	it("sanitizes hostile favourite payloads before storing them", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-fav-"));
		tempDirs.push(dir);
		const baseUrl = await listen(createApp({ mode: "lite", dataDir: dir }));

		const put = await fetch(`${baseUrl}/api/favourites/7`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: 999,
				fullName: "attacker/pwn",
				htmlUrl: "javascript:alert(1)",
				ownerAvatar: "data:text/html,<svg onload=alert(1)>",
				description: "x".repeat(5000),
				starsTotal: -9000,
				forks: Number.NaN,
				topics: ["a".repeat(500), 7],
				extra: "stripped",
			}),
		});
		expect(put.status).toBe(200);

		const ids = await fetch(`${baseUrl}/api/favourites/ids`);
		const { ids: storedIds } = (await ids.json()) as { ids: number[] };
		expect(storedIds).toEqual([7]);

		const favourites = await fetch(`${baseUrl}/api/favourites`);
		const { items } = (await favourites.json()) as {
			items: Array<Record<string, unknown>>;
		};
		expect(items[0]).toMatchObject({
			id: 7,
			fullName: "attacker/pwn",
			htmlUrl: "https://github.com/attacker/pwn",
			ownerAvatar: "https://github.com/attacker.png",
			starsTotal: 0,
			topics: ["a".repeat(100)],
		});
		expect(items[0]).not.toHaveProperty("extra");
	});

	it("persists single and bulk watchlist metadata updates", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-fav-meta-"));
		tempDirs.push(dir);
		const baseUrl = await listen(createApp({ mode: "lite", dataDir: dir }));

		for (const id of [42, 43]) {
			const put = await fetch(`${baseUrl}/api/favourites/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id,
					fullName: `owner/repo-${id}`,
					description: "A dashboard",
					language: "TypeScript",
					topics: ["github"],
					starsTotal: 12,
					forks: 2,
					createdAt: "2026-01-01T00:00:00Z",
					pushedAt: "2026-01-02T00:00:00Z",
					license: "MIT",
					ownerAvatar: "https://example.com/avatar.png",
					htmlUrl: `https://github.com/owner/repo-${id}`,
				}),
			});
			expect(put.status).toBe(200);
		}

		const bulk = await fetch(`${baseUrl}/api/favourites`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ids: [42, 43],
				patch: { tags: [" Frontend ", "frontend"], status: "building" },
			}),
		});
		expect(bulk.status).toBe(200);
		expect(await bulk.json()).toEqual({ ok: true, updated: 2 });

		const single = await fetch(`${baseUrl}/api/favourites/42`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ note: "Review this" }),
		});
		expect(single.status).toBe(200);

		const favourites = await fetch(`${baseUrl}/api/favourites`);
		const { items } = (await favourites.json()) as {
			items: Array<{ id: number; watchlist: unknown }>;
		};
		expect(items).toHaveLength(2);
		expect(items.find((item) => item.id === 42)?.watchlist).toEqual({
			tags: ["frontend"],
			note: "Review this",
			status: "building",
			telegramEnabled: false,
			alertThreshold: 50,
		});
		expect(items.find((item) => item.id === 43)?.watchlist).toEqual({
			tags: ["frontend"],
			note: "",
			status: "building",
			telegramEnabled: false,
			alertThreshold: 50,
		});
	});

	it("rejects malformed favourite payloads", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-fav-bad-"));
		tempDirs.push(dir);
		const baseUrl = await listen(createApp({ mode: "lite", dataDir: dir }));

		const bad = await fetch(`${baseUrl}/api/favourites/1`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: 1, fullName: "not-a-valid-name" }),
		});
		expect(bad.status).toBe(400);

		const nonNumber = await fetch(`${baseUrl}/api/favourites/not-a-number`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ fullName: "owner/name" }),
		});
		expect(nonNumber.status).toBe(400);
	});

	it("defaults a malformed days window instead of 500ing", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-days-"));
		tempDirs.push(dir);
		const baseUrl = await listen(createApp({ mode: "lite", dataDir: dir }));

		const response = await fetch(`${baseUrl}/api/repos/42/history?days=abc`);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ points: [] });
	});
});
