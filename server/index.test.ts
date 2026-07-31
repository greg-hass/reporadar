import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStorage } from "../api/_lib/storage";
import { createApp, runTrackingJob, type AppConfig } from "./index";

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
});
