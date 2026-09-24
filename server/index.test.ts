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
		avatar_url: "https://avatars.githubusercontent.com/u/42?v=4",
		html_url: "https://github.com/greg-hass",
	},
	html_url: "https://github.com/greg-hass/reporadar",
};

const tempDirs: string[] = [];
const servers: Server[] = [];
const testAuth = {
	username: "test-user",
	password: "test-password-at-least-16",
};
const testAuthorization = `Basic ${Buffer.from(`${testAuth.username}:${testAuth.password}`).toString("base64")}`;

function testAppConfig(config: AppConfig): AppConfig {
	return { ...config, authUsername: testAuth.username, authPassword: testAuth.password };
}

function apiFetch(input: string | URL | Request, init: RequestInit = {}) {
	const headers = new Headers(init.headers);
	headers.set("Authorization", testAuthorization);
	return fetch(input, { ...init, headers });
}

function mockGitHubRepoLookup(notFoundIds: number[] = []) {
	const originalFetch = globalThis.fetch;
	vi.stubGlobal("fetch", async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
		const url = String(input);
		const match = /https:\/\/api\.github\.com\/repositories\/(\d+)$/.exec(url);
		if (!match) return originalFetch(input, init);
		const id = Number(match[1]);
		if (notFoundIds.includes(id)) return new Response("Not Found", { status: 404 });
		return new Response(JSON.stringify({ ...repoPayload, id }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	});
}

function mockGitHubSearch() {
	const originalFetch = globalThis.fetch;
	vi.stubGlobal("fetch", async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
		const url = String(input);
		if (url.startsWith("https://api.github.com/search/repositories")) {
			return new Response(JSON.stringify({ total_count: 0, items: [] }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}
		return originalFetch(input, init);
	});
}

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
	it("requires valid credentials to create the app", () => {
		expect(() => createApp({ mode: "lite" })).toThrow(/REPORADAR_AUTH_USER/);
	});

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
		const baseUrl = await listen(createApp(testAppConfig(config)));

		const missingQuery = await fetch(`${baseUrl}/api/search`);
		expect(missingQuery.status).toBe(401);
		expect(missingQuery.headers.get("www-authenticate")).toContain("Basic");
		const authorizedMissingQuery = await apiFetch(`${baseUrl}/api/search`);
		expect(authorizedMissingQuery.status).toBe(400);

		const stats = await apiFetch(`${baseUrl}/api/stats`);
		expect(stats.status).toBe(200);
		expect(stats.headers.get("cache-control")).toBe("no-store");
		expect(stats.headers.get("x-content-type-options")).toBe("nosniff");
		expect(stats.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
		expect(await stats.json()).toMatchObject({
			reposTracked: 0,
			snapshotsToday: 0,
		});

		const pulse = await apiFetch(`${baseUrl}/api/pulse?since=not-a-date`);
		expect(pulse.status).toBe(200);
		expect(pulse.headers.get("cache-control")).toBe("no-store");
		expect(await pulse.json()).toMatchObject({
			items: [],
			stats: { reposTracked: 0, snapshotCount: 0, trackedSince: null },
		});
	});

	it("bounds GitHub search requests and rejects oversized queries", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-search-limit-"));
		tempDirs.push(dir);
		mockGitHubSearch();
		const baseUrl = await listen(createApp(testAppConfig({ mode: "lite", dataDir: dir })));
		const oversized = await apiFetch(`${baseUrl}/api/search?q=${"x".repeat(257)}`);
		expect(oversized.status).toBe(400);

		let last: Response | undefined;
		for (let i = 0; i < 61; i += 1) {
			last = await apiFetch(`${baseUrl}/api/search?q=repo-${i}`);
		}
		expect(last?.status).toBe(429);
		expect(last?.headers.get("retry-after")).toBe("60");
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

	it("preserves watchlist metadata when GitHub reports a repository missing", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-cron-missing-"));
		tempDirs.push(dir);
		const requests: string[] = [];
		vi.stubGlobal("fetch", async (input: Parameters<typeof fetch>[0]) => {
			const url = String(input);
			requests.push(url);
			if (url.includes("/search/repositories"))
				return new Response(JSON.stringify({ total_count: 0, items: [] }), {
					status: 200,
				});
			return new Response("Not Found", { status: 404 });
		});
		const config: AppConfig = { mode: "lite", dataDir: dir };
		const storage = createStorage(config);
		await storage.addFavourite({
			id: 999,
			fullName: "deleted/repository",
			description: null,
			language: null,
			topics: [],
			starsTotal: 0,
			forks: 0,
			createdAt: "2026-01-01T00:00:00.000Z",
			pushedAt: "2026-01-01T00:00:00.000Z",
			license: null,
			ownerAvatar: "https://github.com/deleted.png",
			htmlUrl: "https://github.com/deleted/repository",
		});

		await runTrackingJob(config, storage);
		const restartedStorage = createStorage(config);
		await runTrackingJob(config, restartedStorage);

		expect(requests.filter((url) => url.endsWith("/repositories/999"))).toHaveLength(1);
		expect(await restartedStorage.listFavouriteIds()).toEqual([999]);
		expect(await restartedStorage.listFavouriteIdsForRefresh()).toEqual([]);
		expect(await restartedStorage.queryFavourites(7)).toMatchObject([
			{
				id: 999,
				fullName: "deleted/repository",
				watchlist: { githubUnavailableAt: expect.any(String) },
			},
		]);
	});

	it("uses matching cached repository metadata when GitHub is unavailable", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-fav-cached-"));
		tempDirs.push(dir);
		const originalFetch = globalThis.fetch;
		const fetchMock = vi.fn((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
			if (String(input).startsWith("https://api.github.com/")) {
				return Promise.reject(new Error("GitHub unavailable"));
			}
			return originalFetch(input, init);
		});
		vi.stubGlobal("fetch", fetchMock);
		const config = testAppConfig({ mode: "lite", dataDir: dir });
		const storage = createStorage(config);
		await storage.upsertAndSnapshot([
			{
				id: 7,
				fullName: "greg-hass/reporadar",
				description: "A dashboard",
				language: "TypeScript",
				topics: ["github"],
				starsTotal: 12,
				forks: 2,
				createdAt: "2026-01-01T00:00:00Z",
				pushedAt: "2026-01-02T00:00:00Z",
				license: "MIT",
				ownerAvatar: "https://avatars.githubusercontent.com/u/42?v=4",
				htmlUrl: "https://github.com/greg-hass/reporadar",
			},
		]);
		const baseUrl = await listen(createApp(config, storage));

		const put = await apiFetch(`${baseUrl}/api/favourites/7`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ fullName: "greg-hass/reporadar" }),
		});

		expect(put.status).toBe(200);
		expect(
			fetchMock.mock.calls.filter(([input]) =>
				String(input).startsWith("https://api.github.com/"),
			),
		).toHaveLength(0);
		expect(await storage.listFavouriteIds()).toEqual([7]);
	});

	it("stores canonical GitHub data instead of trusting favourite payloads", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-fav-"));
		tempDirs.push(dir);
		mockGitHubRepoLookup();
		const baseUrl = await listen(createApp(testAppConfig({ mode: "lite", dataDir: dir })));

		const put = await apiFetch(`${baseUrl}/api/favourites/7`, {
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
		const crossOrigin = await apiFetch(`${baseUrl}/api/favourites/8`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Origin: "https://attacker.example",
			},
			body: JSON.stringify({ ...repoPayload, id: 8 }),
		});
		expect(crossOrigin.status).toBe(403);

		const ids = await apiFetch(`${baseUrl}/api/favourites/ids`);
		const { ids: storedIds } = (await ids.json()) as { ids: number[] };
		expect(storedIds).toEqual([7]);

		const favourites = await apiFetch(`${baseUrl}/api/favourites`);
		const { items } = (await favourites.json()) as {
			items: Array<Record<string, unknown>>;
		};
		expect(items[0]).toMatchObject({
			id: 7,
			fullName: "greg-hass/reporadar",
			htmlUrl: "https://github.com/greg-hass/reporadar",
			ownerAvatar: "https://avatars.githubusercontent.com/u/42?v=4",
			starsTotal: 12,
			topics: ["github"],
		});
		expect(items[0]).not.toHaveProperty("extra");
	});

	it("persists single and bulk watchlist metadata updates", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-fav-meta-"));
		tempDirs.push(dir);
		mockGitHubRepoLookup();
		const baseUrl = await listen(createApp(testAppConfig({ mode: "lite", dataDir: dir })));

		for (const id of [42, 43]) {
			const put = await apiFetch(`${baseUrl}/api/favourites/${id}`, {
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

		const bulk = await apiFetch(`${baseUrl}/api/favourites`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ids: [42, 43],
				patch: { tags: [" Frontend ", "frontend"], status: "building" },
			}),
		});
		expect(bulk.status).toBe(200);
		expect(await bulk.json()).toEqual({ ok: true, updated: 2 });

		const single = await apiFetch(`${baseUrl}/api/favourites/42`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ note: "Review this" }),
		});
		expect(single.status).toBe(200);

		const favourites = await apiFetch(`${baseUrl}/api/favourites`);
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
			githubUnavailableAt: null,
		});
		expect(items.find((item) => item.id === 43)?.watchlist).toEqual({
			tags: ["frontend"],
			note: "",
			status: "building",
			telegramEnabled: false,
			alertThreshold: 50,
			githubUnavailableAt: null,
		});
	});

	it("rejects invalid favourite IDs and nonexistent GitHub repositories", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-fav-bad-"));
		tempDirs.push(dir);
		mockGitHubRepoLookup([404]);
		const baseUrl = await listen(createApp(testAppConfig({ mode: "lite", dataDir: dir })));

		const bad = await apiFetch(`${baseUrl}/api/favourites/1.5`, {
			method: "PUT",
		});
		expect(bad.status).toBe(400);
		const nonexistent = await apiFetch(`${baseUrl}/api/favourites/404`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ fullName: "owner/name" }),
		});
		expect(nonexistent.status).toBe(404);

		const nonNumber = await apiFetch(`${baseUrl}/api/favourites/not-a-number`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ fullName: "owner/name" }),
		});
		expect(nonNumber.status).toBe(400);
	});

	it("defaults a malformed days window instead of 500ing", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "reporadar-days-"));
		tempDirs.push(dir);
		const baseUrl = await listen(createApp(testAppConfig({ mode: "lite", dataDir: dir })));

		const response = await apiFetch(`${baseUrl}/api/repos/42/history?days=abc`);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ points: [] });
	});
});
